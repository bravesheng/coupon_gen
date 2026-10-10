import { describe, expect, it } from 'vitest'
import { couponStatus, hasChanges, type Coupon } from '../src/db'

const row: Coupon = {
  id: 1,
  code: '2673AQE',
  serial: 2673,
  discount: 100,
  expiry_date: '2027-10-06',
  date_of_use: null,
  owner: '楊紹翊',
  notes: '可抵用主商品100元租金',
  created_at: '2026-10-10 07:23:00',
  updated_at: '2026-10-10 07:23:00',
  updated_by: 'import',
}
const same = { owner: row.owner, discount: row.discount, expiry_date: row.expiry_date, date_of_use: row.date_of_use, notes: row.notes }

describe('hasChanges', () => {
  it('is false when the form matches the stored row', () => {
    expect(hasChanges(row, same)).toBe(false)
  })
  it('detects each editable field', () => {
    expect(hasChanges(row, { ...same, owner: '別人' })).toBe(true)
    expect(hasChanges(row, { ...same, discount: 150 })).toBe(true)
    expect(hasChanges(row, { ...same, expiry_date: '2028-01-01' })).toBe(true)
    expect(hasChanges(row, { ...same, date_of_use: '2026-10-10' })).toBe(true)
    expect(hasChanges(row, { ...same, notes: '' })).toBe(true)
  })
  it('treats a cleared date_of_use as equal to null', () => {
    expect(hasChanges({ ...row, date_of_use: null }, { ...same, date_of_use: null })).toBe(false)
    expect(hasChanges({ ...row, date_of_use: '2026-10-01' }, { ...same, date_of_use: null })).toBe(true)
  })
})

describe('couponStatus', () => {
  it('reports used, expired and unused', () => {
    expect(couponStatus({ date_of_use: '2026-10-01', expiry_date: '2027-01-01' }, '2026-10-10')).toBe('used')
    expect(couponStatus({ date_of_use: null, expiry_date: '2026-10-09' }, '2026-10-10')).toBe('expired')
    expect(couponStatus({ date_of_use: null, expiry_date: '2026-10-10' }, '2026-10-10')).toBe('unused')
  })
  it('a restored coupon goes back to unused or expired, never used', () => {
    expect(couponStatus({ date_of_use: null, expiry_date: '2027-10-06' }, '2026-10-10')).toBe('unused')
  })
})
