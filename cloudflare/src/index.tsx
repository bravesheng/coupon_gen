import { Hono } from 'hono'
import type { AppEnv } from './env'
import { accessAuth } from './auth'
import * as db from './db'
import { normalizeCode } from './code'
import { addDays, isIsoDate, todayTaipei } from './dates'
import { DetailPage, HomePage, ListPage, MessagePage, NewPage } from './views'
import { validateNewCoupon } from './validate'

const app = new Hono<AppEnv>()

// 健康檢查放在 Access 驗證之前，供外部監控使用；不透露任何資料。
app.get('/healthz', (c) => c.text('ok'))

app.use('*', accessAuth)

app.onError((err, c) => {
  console.error(err)
  return c.html(<MessagePage user={c.get('user') ?? ''} title="發生錯誤" text={err.message} status={500} />, 500)
})

app.notFound((c) => c.html(<MessagePage user={c.get('user') ?? ''} title="找不到頁面" text={c.req.path} status={404} />, 404))

const redirectWithMsg = (path: string, msg: string) => `${path}${path.includes('?') ? '&' : '?'}msg=${encodeURIComponent(msg)}`

type Body = Record<string, string | File>
const field = (body: Body, key: string): string => {
  const v = body[key]
  return typeof v === 'string' ? v.trim() : ''
}

function parseDiscount(raw: string): number | null {
  if (!/^\d{1,6}$/.test(raw)) return null
  return Number(raw)
}

app.get('/', async (c) => {
  const recent = await db.recent(c.env.DB, 10)
  return c.html(<HomePage user={c.get('user')} msg={c.req.query('msg')} recent={recent} today={todayTaipei()} />)
})

app.post('/find', async (c) => {
  const code = normalizeCode(field(await c.req.parseBody(), 'code'))
  if (!code) return c.redirect(redirectWithMsg('/', '請輸入代碼'))
  const found = await db.findByCode(c.env.DB, code)
  if (!found) return c.redirect(redirectWithMsg('/', `找不到代碼 ${code}，請確認後再查一次。`))
  return c.redirect(`/c/${encodeURIComponent(found.code)}`)
})

app.get('/c/:code', async (c) => {
  const code = normalizeCode(c.req.param('code'))
  const coupon = await db.findByCode(c.env.DB, code)
  if (!coupon) return c.redirect(redirectWithMsg('/', `找不到代碼 ${code}`))
  return c.html(<DetailPage user={c.get('user')} msg={c.req.query('msg')} coupon={coupon} today={todayTaipei()} />)
})

app.post('/c/:code', async (c) => {
  const code = normalizeCode(c.req.param('code'))
  const self = `/c/${encodeURIComponent(code)}`
  const body = await c.req.parseBody()

  const discount = parseDiscount(field(body, 'discount'))
  const expiry_date = field(body, 'expiry_date')
  const date_of_use = field(body, 'date_of_use')
  if (discount === null) return c.redirect(redirectWithMsg(self, '折扣金額必須是整數'))
  if (!isIsoDate(expiry_date)) return c.redirect(redirectWithMsg(self, '到期日格式錯誤'))
  if (date_of_use && !isIsoDate(date_of_use)) return c.redirect(redirectWithMsg(self, '使用日格式錯誤'))

  const current = await db.findByCode(c.env.DB, code)
  if (!current) return c.redirect(redirectWithMsg('/', `找不到代碼 ${code}`))

  const next = {
    owner: field(body, 'owner').slice(0, 100),
    discount,
    expiry_date,
    date_of_use: date_of_use || null,
    notes: field(body, 'notes').slice(0, 500),
  }
  // 與資料庫相同就不寫入，避免只更新 updated_at 卻沒有實際變動
  if (!db.hasChanges(current, next)) return c.redirect(redirectWithMsg(self, '資料沒有變更，未儲存。'))

  const ok = await db.update(c.env.DB, code, next, c.get('user'))
  if (!ok) return c.redirect(redirectWithMsg('/', `找不到代碼 ${code}`))
  return c.redirect(redirectWithMsg(self, '已儲存'))
})

app.post('/c/:code/restore', async (c) => {
  const code = normalizeCode(c.req.param('code'))
  const self = `/c/${encodeURIComponent(code)}`
  const ok = await db.restore(c.env.DB, code, c.get('user'))
  if (!ok) {
    const existing = await db.findByCode(c.env.DB, code)
    if (!existing) return c.redirect(redirectWithMsg('/', `找不到代碼 ${code}`))
    return c.redirect(redirectWithMsg(self, '這張優惠券目前是未使用狀態，不需要恢復。'))
  }
  return c.redirect(redirectWithMsg(self, '已恢復為未使用，可再次核銷。'))
})

app.post('/c/:code/use', async (c) => {
  const code = normalizeCode(c.req.param('code'))
  const self = `/c/${encodeURIComponent(code)}`
  const today = todayTaipei()
  const ok = await db.markUsed(c.env.DB, code, today, c.get('user'))
  if (!ok) {
    const existing = await db.findByCode(c.env.DB, code)
    if (!existing) return c.redirect(redirectWithMsg('/', `找不到代碼 ${code}`))
    return c.redirect(redirectWithMsg(self, `這張優惠券已於 ${existing.date_of_use} 核銷過，未做變更。`))
  }
  return c.redirect(redirectWithMsg(self, `已核銷，使用日 ${today}`))
})

app.get('/new', (c) => {
  const values = { owner: '', discount: '', discount_custom: '', expiry_date: addDays(todayTaipei(), 365), notes: '' }
  return c.html(<NewPage user={c.get('user')} msg={c.req.query('msg')} values={values} />)
})

app.post('/new', async (c) => {
  const body = await c.req.parseBody()
  const result = validateNewCoupon({
    owner: field(body, 'owner'),
    discount: field(body, 'discount'),
    discount_custom: field(body, 'discount_custom'),
    expiry_date: field(body, 'expiry_date'),
    notes: field(body, 'notes'),
  })
  if (!result.ok) {
    // 驗證失敗：不產生代碼，保留已輸入內容並列出錯誤
    return c.html(<NewPage user={c.get('user')} values={result.input} errors={result.errors} />, 400)
  }
  const created = await db.create(c.env.DB, result.value, c.get('user'))
  return c.redirect(redirectWithMsg(`/c/${encodeURIComponent(created.code)}`, `已產生新優惠券 ${created.code}`))
})

app.get('/list', async (c) => {
  const statusParam = c.req.query('status') ?? 'unused'
  const status: db.ListFilter['status'] = (['all', 'unused', 'used', 'expired'] as const).includes(statusParam as never)
    ? (statusParam as db.ListFilter['status'])
    : 'unused'
  const q = (c.req.query('q') ?? '').trim().slice(0, 50)
  const limit = 1000
  const today = todayTaipei()
  const rows = await db.list(c.env.DB, { status, q, today, limit })
  return c.html(<ListPage user={c.get('user')} msg={c.req.query('msg')} rows={rows} today={today} status={status} q={q} limit={limit} />)
})

export default app
