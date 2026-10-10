import { describe, expect, it } from 'vitest'
import { validateNewCoupon } from '../src/validate'

const good = { owner: '王小明', discount: '150', discount_custom: '', expiry_date: '2027-10-10', notes: '' }

describe('validateNewCoupon', () => {
  it('accepts a complete form', () => {
    const r = validateNewCoupon(good)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual({ owner: '王小明', discount: 150, expiry_date: '2027-10-10', notes: '' })
  })
  it('requires owner, discount and expiry date', () => {
    const r = validateNewCoupon({})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toEqual(['請填寫持有人', '請選擇折扣金額', '請填寫到期日'])
  })
  it('treats whitespace-only owner as missing and keeps the input for redisplay', () => {
    const r = validateNewCoupon({ ...good, owner: '   ' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors).toEqual(['請填寫持有人'])
      expect(r.input.discount).toBe('150')
    }
  })
  it('rejects zero, negative and non-numeric discounts', () => {
    for (const discount of ['0', '-10', 'abc', '1e3']) {
      const r = validateNewCoupon({ ...good, discount })
      expect(r.ok).toBe(false)
    }
  })
  it('rejects malformed expiry dates', () => {
    const r = validateNewCoupon({ ...good, expiry_date: '2027-02-30' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toEqual(['到期日格式錯誤'])
  })
  it('accepts a custom positive integer amount', () => {
    const r = validateNewCoupon({ ...good, discount: 'custom', discount_custom: '125' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.discount).toBe(125)
  })
  it('requires the custom amount when 自訂 is chosen', () => {
    const r = validateNewCoupon({ ...good, discount: 'custom', discount_custom: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toEqual(['請輸入自訂折扣金額'])
  })
  it('rejects non-integer custom amounts', () => {
    for (const v of ['12.5', '-5', '0', '1e2', '一百', ' 100 元']) {
      const r = validateNewCoupon({ ...good, discount: 'custom', discount_custom: v })
      expect(r.ok, v).toBe(false)
    }
  })
  it('ignores a stray custom value when a preset amount is chosen', () => {
    const r = validateNewCoupon({ ...good, discount: '150', discount_custom: 'abc' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.discount).toBe(150)
  })
})
