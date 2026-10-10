import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { accessAuth } from '../src/auth'
import type { AppEnv } from '../src/env'

const app = new Hono<AppEnv>()
app.use('*', accessAuth)
app.get('/', (c) => c.text(`hello ${c.get('user')}`))

const DB = {} as D1Database

describe('Cloudflare Access middleware', () => {
  it('fails closed when Access is not configured', async () => {
    const res = await app.request('/', {}, { DB })
    expect(res.status).toBe(503)
  })
  it('rejects requests without a token', async () => {
    const res = await app.request('/', {}, { DB, ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'aud' })
    expect(res.status).toBe(403)
  })
  it('rejects a malformed token', async () => {
    const res = await app.request(
      '/',
      { headers: { 'Cf-Access-Jwt-Assertion': 'not.a.jwt' } },
      { DB, ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'aud' },
    )
    expect(res.status).toBe(403)
  })
  it('bypasses only when DEV_BYPASS_ACCESS=1', async () => {
    const res = await app.request('/', {}, { DB, DEV_BYPASS_ACCESS: '1' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello dev@localhost')
    const res2 = await app.request('/', {}, { DB, DEV_BYPASS_ACCESS: 'true' })
    expect(res2.status).toBe(503)
  })
})
