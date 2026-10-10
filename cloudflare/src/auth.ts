import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose'
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
    // 金鑰一律從設定的團隊網域抓；iss 預設也是它，但 Zero Trust 團隊網域改過名時
    // 憑證的 iss 仍是最初自動產生的名稱，這時用 ACCESS_ISSUER 指定。
    const jwksOrigin = `https://${team}`
    const issuer = c.env.ACCESS_ISSUER?.trim() || jwksOrigin
    const { payload } = await jwtVerify(token, jwksFor(jwksOrigin), { issuer, audience: aud })
    c.set('user', typeof payload.email === 'string' ? payload.email : String(payload.sub ?? ''))
  } catch (err) {
    // 只記錄宣告欄位，不記錄憑證本身
    let claims = ''
    try {
      const c0 = decodeJwt(token)
      claims = JSON.stringify({ iss: c0.iss, aud: c0.aud, type: c0.type, exp: c0.exp })
    } catch {}
    console.warn('Access JWT 驗證失敗', String(err), claims)
    return c.text('未授權：Cloudflare Access 憑證無效。', 403)
  }
  await next()
})
