import { describe, expect, it } from 'vitest'
import { formatCode, normalizeCode, parseSerial, randomLetters } from '../src/code'

describe('coupon code', () => {
  it('formats serial as 4 digits plus letters', () => {
    expect(formatCode(1, 'ABC')).toBe('0001ABC')
    expect(formatCode(9754, 'JXS')).toBe('9754JXS')
  })
  it('grows to 5 digits after 9999, matching the legacy app', () => {
    expect(formatCode(10000, 'XYZ')).toBe('10000XYZ')
    expect(parseSerial('10000XYZ')).toBe(10000)
  })
  it('parses serial only from well-formed codes', () => {
    expect(parseSerial('0123ABC')).toBe(123)
    expect(parseSerial('123ABC')).toBeNull()
    expect(parseSerial('0123abc')).toBeNull()
    expect(parseSerial('EXPIRED')).toBeNull()
  })
  it('generates three uppercase letters', () => {
    for (let i = 0; i < 200; i++) expect(randomLetters(3)).toMatch(/^[A-Z]{3}$/)
  })
  it('normalizes user input', () => {
    expect(normalizeCode('  0123abc ')).toBe('0123ABC')
    expect(normalizeCode('0123　abc')).toBe('0123ABC')
  })
})
