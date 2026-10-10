-- 優惠券主表。日期一律存 YYYY-MM-DD 字串（台北時區的日曆日）。
CREATE TABLE coupons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,          -- 例：0123ABC
  serial      INTEGER UNIQUE,                   -- 代碼前面的流水號；舊資料若不符格式則為 NULL
  discount    INTEGER NOT NULL DEFAULT 100,     -- 可抵用金額（元）
  expiry_date TEXT    NOT NULL DEFAULT '',      -- 到期日
  date_of_use TEXT,                             -- 使用日，NULL 表示未使用
  owner       TEXT    NOT NULL DEFAULT '',
  notes       TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_by  TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX idx_coupons_date_of_use ON coupons(date_of_use);
CREATE INDEX idx_coupons_expiry_date ON coupons(expiry_date);
