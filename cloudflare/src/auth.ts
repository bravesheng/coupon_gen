import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { AppEnv } from './env'

// 每個 isolate 快取一份 JWKS，jose 會自行處理金鑰輪替
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function jwksFor(issuer: string) {
  let set = jwksCache.get(issuer)
  if (!set) {
    set = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`))
    jwksCache.set(issuer, set)
  }
  return set
}

/**
 * 驗證 Cloudflare Access 簽發的 JWT。
 * Access 擋在網域前面只是第一道；這裡再驗一次是為了防止有人繞過網域
 * 直接打 workers.dev 或其他沒掛 Access 的入口。沒設定 Access 時一律拒絕（fail closed），
 * 本機開發以 .dev.vars 的 DEV_BYPASS_ACCESS=1 略過。
 */
export const accessAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (c.env.DEV_BYPASS_ACCESS === '1') {
    c.set('user', 'dev@localhost')
    return next()
  }

  const team = c.env.ACCESS_TEAM_DOMAIN
  const aud = c.env.ACCESS_AUD
  if (!team || !aud) {
    return c.text('尚未設定 ACCESS_TEAM_DOMAIN / ACCESS_AUD，拒絕所有請求。', 503)
  }

  const token = c.req.header('Cf-Access-Jwt-Assertion') ?? getCookie(c, 'CF_Authorization')
  if (!token) return c.text('未授權：缺少 Cloudflare Access 憑證。', 403)

  try {
    const issuer = `https://${team}`
    const { payload } = await jwtVerify(token, jwksFor(issuer), { issuer, audience: aud })
    c.set('user', typeof payload.email === 'string' ? payload.email : String(payload.sub ?? ''))
  } catch (err) {
    console.warn('Access JWT 驗證失敗', String(err))
    return c.text('未授權：Cloudflare Access 憑證無效。', 403)
  }
  await next()
})
