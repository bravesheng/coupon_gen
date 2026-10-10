#!/usr/bin/env node
// 將 Google 試算表匯出的 CSV（欄位順序：代碼, 使用日, 持有人, 到期日, 備註）
// 轉成可用 `wrangler d1 execute coupon --remote --file=import.sql` 匯入的 SQL。
//
// 用法：node scripts/csv-to-sql.mjs export.csv > import.sql
import { readFileSync } from 'node:fs'

const CODE_PATTERN = /^(\d{4,})[A-Z]{3}$/
const BATCH = 100

function parseCsv(text) {
  const rows = []
  let row = [], cell = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false
      } else cell += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function normalizeDate(s) {
  const t = s.trim()
  if (!t) return null
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t)
  if (!m) return undefined
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

const sqlStr = (v) => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)

const file = process.argv[2]
if (!file) { console.error('用法：node scripts/csv-to-sql.mjs export.csv > import.sql'); process.exit(1) }

const rows = parseCsv(readFileSync(file, 'utf8').replace(/^﻿/, ''))
if (rows.length && !CODE_PATTERN.test(rows[0][0]?.trim().toUpperCase() ?? '')) {
  console.error(`略過標題列：${rows[0].join(' | ')}`)
  rows.shift()
}

const seenCode = new Map(), seenSerial = new Map()
const records = []
rows.forEach((r, idx) => {
  const line = idx + 2
  const [rawCode = '', rawUse = '', owner = '', rawExpiry = '', notes = ''] = r.map((c) => c.trim())
  const code = rawCode.replace(/\s/g, '').toUpperCase()
  if (!code) { console.error(`第 ${line} 列沒有代碼，略過`); return }
  const m = CODE_PATTERN.exec(code)
  const serial = m ? Number(m[1]) : null
  if (!m) console.error(`第 ${line} 列代碼 ${code} 不符合「四位流水號+三英文字母」格式，仍匯入但不計入流水號`)
  if (seenCode.has(code)) { console.error(`錯誤：代碼 ${code} 重複（第 ${seenCode.get(code)} 與 ${line} 列）`); process.exitCode = 2 }
  if (serial !== null && seenSerial.has(serial)) { console.error(`錯誤：流水號 ${serial} 重複（第 ${seenSerial.get(serial)} 與 ${line} 列）`); process.exitCode = 2 }
  seenCode.set(code, line); if (serial !== null) seenSerial.set(serial, line)

  const dateOfUse = normalizeDate(rawUse)
  const expiry = normalizeDate(rawExpiry)
  if (dateOfUse === undefined) console.error(`第 ${line} 列使用日「${rawUse}」無法解析，改為空白`)
  if (expiry === undefined) console.error(`第 ${line} 列到期日「${rawExpiry}」無法解析，改為空白`)

  const dm = /(\d+)\s*元/.exec(notes)
  const discount = dm ? Number(dm[1]) : 100

  records.push({ code, serial, discount, expiry: expiry ?? '', dateOfUse: dateOfUse ?? null, owner, notes })
})

if (process.exitCode) { console.error('有重複資料，未輸出 SQL。'); process.exit(process.exitCode) }

const out = ['-- 由 csv-to-sql.mjs 產生', `-- 來源：${file}，共 ${records.length} 筆`]
for (let i = 0; i < records.length; i += BATCH) {
  const values = records.slice(i, i + BATCH).map((x) =>
    `(${[sqlStr(x.code), x.serial ?? 'NULL', x.discount, sqlStr(x.expiry), sqlStr(x.dateOfUse), sqlStr(x.owner), sqlStr(x.notes), sqlStr('import')].join(', ')})`,
  )
  out.push(`INSERT INTO coupons (code, serial, discount, expiry_date, date_of_use, owner, notes, updated_by) VALUES\n  ${values.join(',\n  ')};`)
}
process.stdout.write(out.join('\n') + '\n')
console.error(`完成：${records.length} 筆，${seenSerial.size} 筆有流水號，最大流水號 ${Math.max(0, ...seenSerial.keys())}`)
