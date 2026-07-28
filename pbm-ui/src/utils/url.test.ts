import { describe, expect, it } from 'vitest'
import { getDomain } from './url'

describe('getDomain', () => {
  it('extracts the hostname from an http(s) URL', () => {
    expect(getDomain('https://example.com/path?q=1')).toBe('example.com')
  })

  it('strips a leading www.', () => {
    expect(getDomain('https://www.example.com')).toBe('example.com')
  })

  it('returns the original string for an unparseable URL', () => {
    expect(getDomain('not a url')).toBe('not a url')
  })
})
