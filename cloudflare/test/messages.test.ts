import { describe, expect, it } from 'vitest'
import { DISCOUNT_OPTIONS, discountMessage } from '../src/messages'

describe('messages', () => {
  it('renders the customer message with code, expiry and amount', () => {
    const text = discountMessage({ code: '0123ABC', expiry_date: '2027-10-10', discount: 150 })
    expect(text).toContain('折價券兌換碼：0123ABC')
    expect(text).toContain('使用期限2027-10-10')
    expect(text).toContain('滿額最高可抵用150元租金')
    expect(text).toContain('詳細辦法請參考 https://zuzoo.tw/discount#coupon_code')
  })
  it('offers 100 to 300 in steps of 10', () => {
    expect(DISCOUNT_OPTIONS[0]).toBe(100)
    expect(DISCOUNT_OPTIONS.at(-1)).toBe(300)
    expect(DISCOUNT_OPTIONS).toHaveLength(21)
  })
})
