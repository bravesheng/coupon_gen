import { describe, expect, it } from 'vitest'
import { addDays, isIsoDate, todayTaipei } from '../src/dates'

describe('dates', () => {
  it('uses the Taipei calendar day, not UTC', () => {
    // 2026-10-09 17:00Z 是台北 10/10 01:00
    expect(todayTaipei(new Date('2026-10-09T17:00:00Z'))).toBe('2026-10-10')
    expect(todayTaipei(new Date('2026-10-09T15:59:00Z'))).toBe('2026-10-09')
  })
  it('adds days across month and leap boundaries', () => {
    expect(addDays('2026-10-10', 365)).toBe('2027-10-10')
    expect(addDays('2027-03-01', 365)).toBe('2028-02-29')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('validates ISO dates strictly', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026/02/28')).toBe(false)
    expect(isIsoDate('')).toBe(false)
  })
})
