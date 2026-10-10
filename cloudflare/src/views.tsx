import type { PropsWithChildren } from 'hono/jsx'
import { raw } from 'hono/html'
import { couponStatus, STATUS_LABEL, type Coupon, type Status } from './db'
import { DISCOUNT_OPTIONS, discountMessage, reviewMessage } from './messages'
import { formatTimestamp } from './dates'

type Base = { user: string; msg?: string }

export function Layout({ title, user, msg, children }: PropsWithChildren<Base & { title: string }>) {
  return (
    <>
      {raw('<!DOCTYPE html>')}
      <html lang="zh-TW">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title} · Coupon Manager</title>
          <link rel="icon" href="data:," />
          <link rel="stylesheet" href="/style.css" />
        </head>
        <body>
          <header class="top">
            <a class="brand" href="/">Coupon Manager</a>
            <nav>
              <a href="/">查詢</a>
              <a href="/list">列表</a>
              <a href="/new" class="button">新增優惠券</a>
            </nav>
            <span class="user" title="目前登入者">{user}</span>
          </header>
          <main>
            {msg ? <div class="flash">{msg}</div> : null}
            {children}
          </main>
          <script src="/app.js" defer></script>
        </body>
      </html>
    </>
  )
}

function Badge({ status }: { status: Status }) {
  return <span class={`badge ${status}`}>{STATUS_LABEL[status]}</span>
}

function CouponTable({ rows, today }: { rows: Coupon[]; today: string }) {
  if (rows.length === 0) return <p class="empty">沒有資料</p>
  return (
    <table>
      <thead>
        <tr>
          <th>代碼</th>
          <th>狀態</th>
          <th>金額</th>
          <th>到期日</th>
          <th>使用日</th>
          <th>持有人</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr>
            <td>
              <a href={`/c/${c.code}`} class="mono">
                {c.code}
              </a>
            </td>
            <td>
              <Badge status={couponStatus(c, today)} />
            </td>
            <td>{c.discount}</td>
            <td>{c.expiry_date || '—'}</td>
            <td>{c.date_of_use ?? '—'}</td>
            <td>{c.owner}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function HomePage({ user, msg, recent, today }: Base & { recent: Coupon[]; today: string }) {
  return (
    <Layout title="查詢" user={user} msg={msg}>
      <section class="card">
        <form method="post" action="/find" class="search">
          <input
            name="code"
            placeholder="輸入優惠券代碼，例如 0123ABC"
            autofocus
            autocomplete="off"
            autocapitalize="characters"
            spellcheck={false}
            required
          />
          <button type="submit" class="primary">
            查詢
          </button>
        </form>
      </section>
      <section class="card">
        <h2>最近異動</h2>
        <CouponTable rows={recent} today={today} />
      </section>
    </Layout>
  )
}

type DiscountSelectProps = { value: number | null; required?: boolean; custom?: { selected: boolean; value: string } }

function DiscountSelect({ value, required, custom }: DiscountSelectProps) {
  const options =
    value === null || DISCOUNT_OPTIONS.includes(value) ? DISCOUNT_OPTIONS : [...DISCOUNT_OPTIONS, value].sort((a, b) => a - b)
  const customSelected = custom?.selected ?? false
  return (
    <div class="discount">
      <select name="discount" id="discount" required={required} data-custom-input={custom ? 'discount-custom' : undefined}>
        {value === null && !customSelected ? (
          <option value="" selected disabled>
            請選擇
          </option>
        ) : null}
        {options.map((v) => (
          <option value={v} selected={!customSelected && v === value}>
            {v}
          </option>
        ))}
        {custom ? (
          <option value="custom" selected={customSelected}>
            自訂金額…
          </option>
        ) : null}
      </select>
      {custom ? (
        <input
          type="number"
          id="discount-custom"
          name="discount_custom"
          value={custom.value}
          inputmode="numeric"
          min={1}
          max={999999}
          step={1}
          placeholder="輸入整數，例如 125"
          hidden={!customSelected}
          required={customSelected}
        />
      ) : null}
    </div>
  )
}

export function DetailPage({ user, msg, coupon, today }: Base & { coupon: Coupon; today: string }) {
  const status = couponStatus(coupon, today)
  return (
    <Layout title={coupon.code} user={user} msg={msg}>
      <section class="card">
        <h1 class="code">
          <span class="mono">{coupon.code}</span> <Badge status={status} />
        </h1>
        <form method="post" action={`/c/${coupon.code}`} class="grid" data-dirty-track>
          <label>
            持有人
            <input name="owner" value={coupon.owner} maxlength={100} />
          </label>
          <label>
            折扣金額
            <DiscountSelect value={coupon.discount} />
          </label>
          <label>
            到期日
            <input type="date" name="expiry_date" value={coupon.expiry_date} required />
          </label>
          <label>
            使用日
            <input type="date" name="date_of_use" value={coupon.date_of_use ?? ''} />
          </label>
          <label class="full">
            備註
            <input name="notes" value={coupon.notes} maxlength={500} />
          </label>
          <div class="actions full">
            <button type="submit" class="primary" data-save>
              儲存
            </button>
            <span class="hint" data-save-hint>
              資料沒有變更
            </span>
          </div>
        </form>
        <div class="redeem-row">
          <form method="post" action={`/c/${coupon.code}/use`} class="redeem" data-confirm="再按一次確認核銷">
            <button type="submit" class="danger" disabled={coupon.date_of_use !== null}>
              {coupon.date_of_use ? `已於 ${coupon.date_of_use} 核銷` : `核銷（今天 ${today}）`}
            </button>
            <button type="button" class="cancel" hidden>
              取消
            </button>
            <span class="hint" hidden>
              使用日將記為 {today}
            </span>
          </form>
          {coupon.date_of_use ? (
            <form method="post" action={`/c/${coupon.code}/restore`} class="redeem" data-confirm="再按一次確認恢復">
              <button type="submit" class="warn">
                恢復折扣碼
              </button>
              <button type="button" class="cancel" hidden>
                取消
              </button>
              <span class="hint" hidden>
                清除使用日 {coupon.date_of_use}，回到未使用
              </span>
            </form>
          ) : null}
        </div>
        <p class="meta">
          建立 {formatTimestamp(coupon.created_at)} · 最後更新 {formatTimestamp(coupon.updated_at)}
          {coupon.updated_by ? ` by ${coupon.updated_by}` : ''}
        </p>
      </section>

      <section class="card">
        <h2>訊息文字</h2>
        <div class="msg">
          <label for="msg-discount">折扣碼訊息</label>
          <textarea id="msg-discount" readonly rows={5}>
            {discountMessage(coupon)}
          </textarea>
          <button type="button" data-copy="msg-discount">
            複製
          </button>
        </div>
        <div class="msg">
          <label for="msg-review">評價提醒</label>
          <textarea id="msg-review" readonly rows={2}>
            {reviewMessage()}
          </textarea>
          <button type="button" data-copy="msg-review">
            複製
          </button>
        </div>
      </section>
    </Layout>
  )
}

export type NewFormValues = { owner: string; discount: string; discount_custom: string; expiry_date: string; notes: string }

export function NewPage({
  user,
  msg,
  values,
  errors = [],
}: Base & { values: NewFormValues; errors?: string[] }) {
  const discount = /^\d+$/.test(values.discount) ? Number(values.discount) : null
  const custom = { selected: values.discount === 'custom', value: values.discount_custom }
  return (
    <Layout title="新增優惠券" user={user} msg={msg}>
      <section class="card">
        <h1>新增優惠券</h1>
        <p class="hint">持有人、折扣金額、到期日為必填。代碼由系統自動產生：流水號接續上一張，後接三個隨機英文字母。</p>
        {errors.length ? (
          <ul class="errors">
            {errors.map((e) => (
              <li>{e}</li>
            ))}
          </ul>
        ) : null}
        <form method="post" action="/new" class="grid">
          <label>
            <span>
              持有人 <b class="req">*</b>
            </span>
            <input name="owner" value={values.owner} maxlength={100} required autofocus />
          </label>
          <label>
            <span>
              折扣金額 <b class="req">*</b>
            </span>
            <DiscountSelect value={discount} required custom={custom} />
          </label>
          <label>
            <span>
              到期日 <b class="req">*</b>
            </span>
            <input type="date" name="expiry_date" value={values.expiry_date} required />
          </label>
          <label>
            備註（選填）
            <input name="notes" value={values.notes} maxlength={500} />
          </label>
          <div class="actions full">
            <button type="submit" class="primary">
              產生優惠券
            </button>
          </div>
        </form>
      </section>
    </Layout>
  )
}

export function ListPage({
  user,
  msg,
  rows,
  today,
  status,
  q,
  limit,
}: Base & { rows: Coupon[]; today: string; status: string; q: string; limit: number }) {
  const opts: [string, string][] = [
    ['all', '全部'],
    ['unused', '未使用'],
    ['used', '已使用'],
    ['expired', '已過期'],
  ]
  return (
    <Layout title="列表" user={user} msg={msg}>
      <section class="card">
        <form method="get" action="/list" class="filter">
          <select name="status">
            {opts.map(([v, label]) => (
              <option value={v} selected={v === status}>
                {label}
              </option>
            ))}
          </select>
          <input name="q" value={q} placeholder="代碼 / 持有人 / 備註" autocomplete="off" />
          <button type="submit">篩選</button>
        </form>
        <CouponTable rows={rows} today={today} />
        {rows.length >= limit ? <p class="hint">只顯示前 {limit} 筆，請用篩選縮小範圍。</p> : null}
      </section>
    </Layout>
  )
}

export function MessagePage({ user, title, text, status }: Base & { title: string; text: string; status: number }) {
  return (
    <Layout title={title} user={user}>
      <section class="card">
        <h1>{title}</h1>
        <p>{text}</p>
        <p>
          <a href="/">回首頁</a>
        </p>
        <p class="meta">HTTP {status}</p>
      </section>
    </Layout>
  )
}
