# Coupon Manager（Cloudflare 版）

優惠券管理工具的重寫版：Cloudflare Workers + D1（SQLite）+ Cloudflare Access。
取代原本跑在 Synology NAS 上、以 Google 試算表為資料庫的 Flask 版本。

* 不需要自己管伺服器，也沒有容器要重啟。
* 資料存在 D1，有自動備份與時間點還原。
* 登入由 Cloudflare Access 處理（Google 帳號白名單），程式裡沒有任何 OAuth 流程。
* 優惠券代碼格式維持「四位流水號 + 三個英文字母」，流水號接續舊資料。

## 專案結構

```
src/index.tsx     路由
src/views.tsx     頁面（伺服器端 JSX）
src/db.ts         D1 查詢
src/auth.ts       Cloudflare Access JWT 驗證
src/code.ts       代碼產生與解析
src/dates.ts      台北時區日期工具
src/messages.ts   給客人的訊息文字
public/           CSS 與少量前端 JS，由 Cloudflare 直接提供
migrations/       D1 資料表定義
scripts/          舊資料 CSV 轉 SQL
test/             純邏輯的單元測試
```

## 本機開發

```bash
npm install
cp .dev.vars.example .dev.vars        # DEV_BYPASS_ACCESS=1，本機不驗 Access
npm run db:migrate:local               # 在本機建立 D1 資料表
npm run dev                            # http://localhost:8787
```

```bash
npm test && npm run typecheck
```

## 首次部署

前置：一個 Cloudflare 帳號，`zuzoo.tw` 的 DNS 託管在 Cloudflare（自訂網域與 Access 都需要）。

1. **登入 wrangler**
   ```bash
   npx wrangler login
   ```

2. **建立 D1 資料庫並套用資料表**
   ```bash
   npm run db:create
   ```
   把輸出的 `database_id` 貼進 `wrangler.jsonc` 的 `d1_databases[0].database_id`，然後：
   ```bash
   npm run db:migrate
   ```

3. **匯入舊資料**
   在 Google 試算表把 `2023` 分頁下載成 CSV（欄位順序：代碼、使用日、持有人、到期日、備註），然後：
   ```bash
   node scripts/csv-to-sql.mjs ~/Downloads/export.csv > import.sql
   npx wrangler d1 execute coupon --remote --file=import.sql
   ```
   腳本會在 stderr 列出被略過的標題列、無法解析的日期、不符格式的代碼，遇到重複代碼會停止不輸出。
   折扣金額會從備註裡的「可抵用主商品 **100** 元租金」抓出來，沒寫就當 100。

4. **第一次部署**
   ```bash
   npm run deploy
   ```
   此時 `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` 是空的，Worker 會對所有請求回 503，這是刻意的（fail closed）。

5. **綁自訂網域**
   `wrangler.jsonc` 的 `routes` 寫要用的網域（目前是 `coupon.zuzoo.tw`），再 `npm run deploy` 一次。
   Cloudflare 會自動建立 DNS 記錄與憑證。

   **自訂網域一律寫在 `wrangler.jsonc` 的 `routes`，不要只在控制台加。**
   `wrangler deploy` 會讓 Worker 的自訂網域與 `routes` 完全一致，只在控制台加的網域下次部署就會被移除，
   連同 DNS 記錄一起刪掉（瀏覽器會出現 `DNS_PROBE_FINISHED_NXDOMAIN`）。
   新網域也要加進同一個 Access 應用程式，AUD 才會跟 `ACCESS_AUD` 一致。

6. **設定 Cloudflare Access**
   Zero Trust 控制台 → Access → Applications → Add an application → Self-hosted：
   * Application domain：`coupon.zuzoo.tw`
   * Identity providers：啟用 Google（或 One-time PIN）
   * Policy：Allow，Include → Emails → 填入允許登入的員工信箱
   * 建好後在應用程式的 Overview 複製 **Application Audience (AUD) Tag**。
     找不到的話，直接對網域發一次未登入的請求，導向登入頁的網址裡 `kid=` 後面那串就是 AUD：
     ```bash
     curl -s -o /dev/null -w '%{redirect_url}\n' https://coupon.zuzoo.tw/ | grep -o 'kid=[0-9a-f]*'
     ```

7. **把 Access 參數填進 Worker**
   在 `wrangler.jsonc` 的 `vars` 填入：
   * `ACCESS_TEAM_DOMAIN`：Zero Trust → Settings → Custom Pages 顯示的團隊網域，形如 `xxx.cloudflareaccess.com`
   * `ACCESS_AUD`：上一步複製的 AUD Tag

   再 `npm run deploy`。打開 `https://coupon.zuzoo.tw` 應該先看到 Access 登入頁，登入後進入系統，右上角顯示登入者信箱。

   **登入後看到「未授權：Cloudflare Access 憑證無效」**：執行 `npx wrangler tail coupon` 再重新整理頁面，
   日誌會印出失敗原因與憑證的 `iss`、`aud`。最常見的是 `unexpected "iss" claim value`：
   Zero Trust 團隊網域改過名字時，憑證的 `iss` 仍是最初自動產生的名稱（例如 `https://ancient-shadow-1fa4.cloudflareaccess.com`），
   把日誌裡的 `iss` 值填進 `wrangler.jsonc` 的 `ACCESS_ISSUER` 後重新部署即可。
   之後再改團隊網域名稱時，只需更新 `ACCESS_TEAM_DOMAIN`（金鑰端點會跟著搬家），`ACCESS_ISSUER` 維持原始名稱不動。

8. **關掉 workers.dev 入口（建議）**
   Workers & Pages → coupon → Settings → Domains & Routes → 停用 `workers.dev`。
   就算忘了關，Worker 內部仍會驗證 Access JWT，沒有憑證一律 403。

9. **停掉 NAS 上的舊容器**，並在 Google Cloud Console 停用舊的 OAuth 用戶端。

## 之後更新

```bash
npm run deploy
```
若有新增 `migrations/*.sql`，先 `npm run db:migrate`。

## 備份

D1 內建 30 天時間點還原（Time Travel）。要手動備份：
```bash
npx wrangler d1 export coupon --remote --output=backup-$(date +%F).sql
```

## 環境變數

| 名稱 | 位置 | 說明 |
| --- | --- | --- |
| `ACCESS_TEAM_DOMAIN` | `wrangler.jsonc` vars | Zero Trust 團隊網域 |
| `ACCESS_AUD` | `wrangler.jsonc` vars | Access 應用程式的 AUD Tag |
| `ACCESS_ISSUER` | `wrangler.jsonc` vars | 額外接受的憑證 `iss`；程式永遠接受 `https://<ACCESS_TEAM_DOMAIN>`，團隊網域改過名時把原始名稱填在這裡 |
| `DEV_BYPASS_ACCESS` | 只放 `.dev.vars` | 設為 `1` 時略過驗證，**絕不要**放進 `wrangler.jsonc` |
