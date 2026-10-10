import { formatCode, randomLetters } from './code'

export type Coupon = {
  id: number
  code: string
  serial: number | null
  discount: number
  expiry_date: string
  date_of_use: string | null
  owner: string
  notes: string
  created_at: string
  updated_at: string
  updated_by: string
}

export type Status = 'unused' | 'used' | 'expired'
export const STATUS_LABEL: Record<Status, string> = { unused: '未使用', used: '已使用', expired: '已過期' }

export function couponStatus(c: Pick<Coupon, 'date_of_use' | 'expiry_date'>, today: string): Status {
  if (c.date_of_use) return 'used'
  if (c.expiry_date && c.expiry_date < today) return 'expired'
  return 'unused'
}

const COLUMNS = 'id, code, serial, discount, expiry_date, date_of_use, owner, notes, created_at, updated_at, updated_by'

export async function findByCode(db: D1Database, code: string): Promise<Coupon | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM coupons WHERE code = ?1`).bind(code).first<Coupon>()
}

export async function recent(db: D1Database, limit: number): Promise<Coupon[]> {
  const { results } = await db
    .prepare(`SELECT ${COLUMNS} FROM coupons ORDER BY updated_at DESC, id DESC LIMIT ?1`)
    .bind(limit)
    .all<Coupon>()
  return results
}

export type ListFilter = { status: Status | 'all'; q: string; today: string; limit: number }

export async function list(db: D1Database, f: ListFilter): Promise<Coupon[]> {
  const where: string[] = []
  const params: unknown[] = []
  if (f.status === 'used') where.push('date_of_use IS NOT NULL')
  if (f.status === 'unused') {
    where.push('date_of_use IS NULL')
    where.push(`(expiry_date = '' OR expiry_date >= ?${params.push(f.today)})`)
  }
  if (f.status === 'expired') {
    where.push('date_of_use IS NULL')
    where.push(`expiry_date <> '' AND expiry_date < ?${params.push(f.today)}`)
  }
  if (f.q) {
    const like = `%${f.q}%`
    const i = params.push(like)
    params.push(like, like)
    where.push(`(code LIKE ?${i} OR owner LIKE ?${i + 1} OR notes LIKE ?${i + 2})`)
  }
  const sql =
    `SELECT ${COLUMNS} FROM coupons` +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ` ORDER BY serial DESC, id DESC LIMIT ?${params.push(f.limit)}`
  const { results } = await db.prepare(sql).bind(...params).all<Coupon>()
  return results
}

export type CouponFields = {
  owner: string
  discount: number
  expiry_date: string
  date_of_use: string | null
  notes: string
}

export async function update(db: D1Database, code: string, f: CouponFields, user: string): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE coupons SET owner = ?1, discount = ?2, expiry_date = ?3, date_of_use = ?4, notes = ?5,
         updated_at = datetime('now'), updated_by = ?6 WHERE code = ?7`,
    )
    .bind(f.owner, f.discount, f.expiry_date, f.date_of_use, f.notes, user, code)
    .run()
  return (r.meta.changes ?? 0) > 0
}

/** 核銷：只在尚未使用時寫入使用日，避免重複點擊覆蓋原本的日期 */
export async function markUsed(db: D1Database, code: string, today: string, user: string): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE coupons SET date_of_use = ?1, updated_at = datetime('now'), updated_by = ?2
         WHERE code = ?3 AND date_of_use IS NULL`,
    )
    .bind(today, user, code)
    .run()
  return (r.meta.changes ?? 0) > 0
}

/** 表單送進來的欄位與資料庫現況是否不同；相同就不需要寫入 */
export function hasChanges(current: Coupon, next: CouponFields): boolean {
  return (
    current.owner !== next.owner ||
    current.discount !== next.discount ||
    current.expiry_date !== next.expiry_date ||
    (current.date_of_use ?? null) !== (next.date_of_use ?? null) ||
    current.notes !== next.notes
  )
}

/** 恢復折扣碼：只在已核銷時清除使用日，回到未使用狀態 */
export async function restore(db: D1Database, code: string, user: string): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE coupons SET date_of_use = NULL, updated_at = datetime('now'), updated_by = ?1
         WHERE code = ?2 AND date_of_use IS NOT NULL`,
    )
    .bind(user, code)
    .run()
  return (r.meta.changes ?? 0) > 0
}

export type NewCoupon = { owner: string; discount: number; expiry_date: string; notes: string }

/**
 * 產生新優惠券：流水號 = 目前最大值 + 1，字母隨機。
 * serial 與 code 都有 UNIQUE 約束，兩人同時按下時其中一方會撞到並自動重試。
 */
export async function create(db: D1Database, input: NewCoupon, user: string): Promise<Coupon> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await db.prepare('SELECT COALESCE(MAX(serial), 0) AS max_serial FROM coupons').first<{ max_serial: number }>()
    const serial = (row?.max_serial ?? 0) + 1
    const code = formatCode(serial, randomLetters(3))
    try {
      await db
        .prepare(
          `INSERT INTO coupons (code, serial, owner, discount, expiry_date, notes, updated_by)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        )
        .bind(code, serial, input.owner, input.discount, input.expiry_date, input.notes, user)
        .run()
    } catch (e) {
      if (String(e).includes('UNIQUE')) continue
      throw e
    }
    const created = await findByCode(db, code)
    if (created) return created
  }
  throw new Error('無法產生不重複的代碼，請再試一次')
}
