export type Bindings = {
  DB: D1Database
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
  DEV_BYPASS_ACCESS?: string
}

export type Variables = {
  user: string
}

export type AppEnv = { Bindings: Bindings; Variables: Variables }
