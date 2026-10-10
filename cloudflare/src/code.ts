// 優惠券代碼格式：至少四位流水號 + 三個大寫英文字母，例如 0123ABC。
// 流水號超過 9999 之後自然變成五位數（10000XYZ），與舊系統行為一致。

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const CODE_PATTERN = /^(\d{4,})([A-Z]{3})$/

export function parseSerial(code: string): number | null {
  const m = CODE_PATTERN.exec(code)
  return m ? Number(m[1]) : null
}

export function formatCode(serial: number, letters: string): string {
  if (!Number.isInteger(serial) || serial < 0) throw new Error(`invalid serial: ${serial}`)
  if (!/^[A-Z]{3}$/.test(letters)) throw new Error(`invalid letters: ${letters}`)
  return String(serial).padStart(4, '0') + letters
}

export function randomLetters(length = 3): string {
  // 以拒絕取樣避免 256 % 26 造成的偏差
  const limit = 256 - (256 % LETTERS.length)
  let out = ''
  const buf = new Uint8Array(16)
  while (out.length < length) {
    crypto.getRandomValues(buf)
    for (const b of buf) {
      if (b < limit) out += LETTERS[b % LETTERS.length]
      if (out.length === length) break
    }
  }
  return out
}

/** 使用者輸入的代碼：去空白、轉大寫、移除全形空格 */
export function normalizeCode(input: string): string {
  return input.replace(/[\s　]/g, '').toUpperCase()
}
