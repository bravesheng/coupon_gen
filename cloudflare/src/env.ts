export type Bindings = {
  DB: D1Database
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
  /** 額外接受的憑證 iss（除了 https://<ACCESS_TEAM_DOMAIN>）。團隊網域改過名時 iss 仍是原始名稱，填在這裡。 */
  ACCESS_ISSUER?: string
  DEV_BYPASS_ACCESS?: string
}

export type Variables = {
  user: string
}

export type AppEnv = { Bindings: Bindings; Variables: Variables }
