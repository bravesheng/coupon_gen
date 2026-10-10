import { isIsoDate } from './dates'

export type NewCouponInput = { owner: string; discount: string; discount_custom: string; expiry_date: string; notes: string }
export type NewCouponValid = { owner: string; discount: number; expiry_date: string; notes: string }

export type ValidationResult =
  | { ok: true; value: NewCouponValid }
  | { ok: false; errors: string[]; input: NewCouponInput }

const isPositiveInt = (v: string) => /^\d{1,6}$/.test(v) && Number(v) > 0

/** 新增優惠券的必填檢查：持有人、折扣金額、到期日三者缺一不可。 */
export function validateNewCoupon(raw: Partial<NewCouponInput>): ValidationResult {
  const input: NewCouponInput = {
    owner: (raw.owner ?? '').trim(),
    discount: (raw.discount ?? '').trim(),
    discount_custom: (raw.discount_custom ?? '').trim(),
    expiry_date: (raw.expiry_date ?? '').trim(),
    notes: (raw.notes ?? '').trim(),
  }
  const errors: string[] = []

  if (!input.owner) errors.push('請填寫持有人')
  else if (input.owner.length > 100) errors.push('持有人最多 100 字')

  // 折扣金額：從選單選一個，或選「自訂」後在旁邊輸入正整數
  let discount = NaN
  if (!input.discount) errors.push('請選擇折扣金額')
  else if (input.discount === 'custom') {
    if (!input.discount_custom) errors.push('請輸入自訂折扣金額')
    else if (!isPositiveInt(input.discount_custom)) errors.push('自訂折扣金額必須是正整數，例如 125')
    else discount = Number(input.discount_custom)
  } else if (!isPositiveInt(input.discount)) errors.push('折扣金額必須是正整數')
  else discount = Number(input.discount)

  if (!input.expiry_date) errors.push('請填寫到期日')
  else if (!isIsoDate(input.expiry_date)) errors.push('到期日格式錯誤')

  if (input.notes.length > 500) errors.push('備註最多 500 字')

  if (errors.length) return { ok: false, errors, input }
  return { ok: true, value: { owner: input.owner, discount, expiry_date: input.expiry_date, notes: input.notes } }
}
