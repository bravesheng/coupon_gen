# Coupon Management Web Application

## Description
This project is a Flask-based web application designed to manage coupons. It uses Google Sheets as a backend to store and manage coupon data, leveraging Google OAuth 2.0 for secure access.

## Features
*   **Google Sheets Integration:** All coupon data is stored and managed in a Google Spreadsheet.
*   **OAuth 2.0 Authentication:** Securely authenticates with Google services to access the spreadsheet.
*   **Find Coupons:** Users can search for existing coupons by their serial number.
*   **Use/Redeem Coupons:** Mark coupons as used, automatically setting the date of use.
*   **Update Coupon Details:** Modify information such as the coupon owner, date of use, expiry date, and notes.
*   **Generate New Coupons:** Create new coupons with a unique, randomly generated code and a default expiry date (typically one year from creation).

## Project Structure
*   `web_flask.py`: The main Flask application file. It handles all web routes, user interface interactions, and core application logic.
*   `coupon.py`: Contains the `Coupon` class definition (representing a single coupon) and the `CouponTable` class (for managing the collection of coupons and interacting with the Google Sheet logic).
*   `gsheet.py`: Implements the `GoogleSheetTools` class, which handles all direct communication with the Google Sheets API, including reading, updating, and appending data.
*   `templates/`: This directory holds all HTML templates used for rendering the web pages.
    *   `base.html`: Base template, likely for common layout.
    *   `find_coupon.html`: Template for displaying coupon search results and actions.
    *   `generate_new.html`: Template for confirming new coupon generation.
    *   `hello.html`: Main landing page template.
    *   `privacy.html`, `terms_of_service.html`: Placeholder static pages.
*   `requirements.txt`: Lists all Python dependencies required to run the project (e.g., Flask, google-api-python-client, google-auth-httplib2, google-auth-oauthlib).
*   `Dockerfile`: Provides instructions to build a Docker container for the application, enabling easy deployment.
*   `client_secret.json`: **Important:** This file contains your Google Cloud API credentials. It is **required** for the application to authenticate with Google services. You must obtain this file from the Google Cloud Console. **Do NOT commit this file to public repositories if it contains your actual sensitive credentials.**
*   `LICENSE`: Contains the project's license information (MIT License).
*   `.gitignore`: Specifies intentionally untracked files that Git should ignore.

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Create a Virtual Environment (Recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up Google API Credentials:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project or select an existing one.
    *   Enable the **Google Sheets API** for your project.
    *   Create OAuth 2.0 credentials:
        *   Go to "Credentials" in the APIs & Services section.
        *   Click "Create Credentials" -> "OAuth client ID".
        *   Choose "Web application" as the application type.
        *   Add **Authorized JavaScript origins**: Your application's host (e.g., `http://localhost:8080`, `http://127.0.0.1:8080`).
        *   Add **Authorized redirect URIs**: The callback URL for the OAuth flow. This should be `http://localhost:8080/oauth2callback` or `http://127.0.0.1:8080/oauth2callback` for local development. If deploying, adjust accordingly and ensure it's HTTPS.
        *   Download the JSON file. Rename it to `client_secret.json` and place it at `secrets/client_secret.json`
            (本機直接執行與容器部署都讀這個位置；可用環境變數 `CLIENT_SECRETS_FILE` 覆寫)。

5.  **Configure Google Sheet:**
    *   Create a new Google Sheet or use an existing one.
    *   Note its **Spreadsheet ID**. You can find this in the URL of the spreadsheet (e.g., `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`).
    *   Open `coupon.py` and update the `SPREADSHEET_ID` constant with your actual Spreadsheet ID:
        ```python
        SPREADSHEET_ID = 'YOUR_ACTUAL_SPREADSHEET_ID'
        ```
    *   Ensure the sheet (e.g., `2023` as per `PAGE_NAME` in `coupon.py`) has columns in the order expected: Coupon Code, Date of Use, Owner, Expiry Date, Notes.

6.  **Run the Application:**
    ```bash
    python web_flask.py
    ```
    The application will typically be available at `http://localhost:8080` or `http://0.0.0.0:8080`.

## Deploy to Synology NAS (Container Manager)

本專案已容器化，可在 DSM 7.2+ 的 Container Manager 以「專案(Project)」方式直接在 NAS 上建置執行。

### 相關檔案
*   `Dockerfile`: 以 `python:3.11-slim` 為基底，非 root 執行，不將憑證烘進映像檔。
*   `.dockerignore`: 排除 `.env` 虛擬環境（87MB）、`.git` 與所有機密檔案。
*   `docker-compose.yml`: Container Manager 專案定義，含連接埠、環境變數與 volume 掛載。

### 部署步驟

1.  **上傳原始碼到 NAS**
    透過 File Station 或 rsync，將專案資料夾（不含 `.env`、`.git`）複製到共用資料夾，
    例如 `/volume1/docker/coupon-gen/`。

2.  **放入 OAuth 憑證**
    在專案資料夾下建立 `secrets/` 子目錄，放入 `client_secret.json`：
    ```
    /volume1/docker/coupon-gen/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── web_flask.py, coupon.py, gsheet.py, requirements.txt
    ├── templates/
    └── secrets/
        └── client_secret.json      <- OAuth 用戶端憑證，只存放這一份
    ```
    **憑證只放在 `secrets/` 這一個位置，根目錄不要再留複本。**
    兩份檔案很容易版本不同步，導致容器仍掛著舊的用戶端，
    在授權時出現 `401 deleted_client`。

    **注意：** 若 `secrets/client_secret.json` 不存在，Docker 會在該路徑自動建立一個「目錄」，
    導致授權時讀取憑證失敗。務必先確認檔案已就位。
    檔案權限需讓容器內 uid 1000 可讀（`chmod 644`）。

3.  **設定 session 金鑰**
    編輯 `docker-compose.yml`，將 `FLASK_SECRET_KEY` 的 `REPLACE_WITH_RANDOM_HEX` 換成隨機值：
    ```bash
    python3 -c "import secrets; print(secrets.token_hex(32))"
    ```

4.  **建立專案**
    Container Manager → 專案 → 新增 → 路徑選擇上述資料夾 →
    來源選「使用現有的 docker-compose.yml」→ 建置並啟動。

5.  **設定反向代理**
    控制台 → 登入入口 → 進階 → 反向代理伺服器，新增規則：

    | 項目 | 值 |
    | --- | --- |
    | 來源通訊協定 | HTTPS |
    | 來源主機名稱 | `sociorock.com` |
    | 來源連接埠 | `1010` |
    | 目的地通訊協定 | HTTP |
    | 目的地主機名稱 | `localhost` |
    | 目的地連接埠 | `8080` |

    此設定需與 Google Cloud Console 中登錄的 redirect URI
    `https://sociorock.com:1010/oauth2callback` 完全一致。

### 環境變數

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `FLASK_SECRET_KEY` | 隨機產生 | Flask session 簽章金鑰。未設定時每次重啟都會失效，使用者須重新授權。 |
| `CLIENT_SECRETS_FILE` | `secrets/client_secret.json` | OAuth 用戶端憑證路徑；容器內為 `/app/secrets/client_secret.json`。 |
| `OAUTHLIB_INSECURE_TRANSPORT` | — | 反向代理已終結 TLS、容器內收到 HTTP 時需設為 `1`。 |
| `OAUTHLIB_RELAX_TOKEN_SCOPE` | — | 放寬 scope 比對，設為 `1`。 |
| `TZ` | `Asia/Taipei` | 影響優惠券使用日期與到期日的計算。 |

### 疑難排解

**`driver failed programming external connectivity on endpoint coupon-gen`**

Docker 無法綁定對外埠，絕大多數是該埠已被佔用。錯誤訊息結尾通常會指明
`Bind for 0.0.0.0:<port> failed: port is already allocated`。

1.  在 NAS 上以 SSH 確認佔用者：
    ```bash
    sudo netstat -tulpn | grep ':8080'
    sudo docker ps --format 'table {{.Names}}\t{{.Ports}}'
    ```
2.  改用其他未使用的埠：修改 `docker-compose.yml` 中 `ports` 的**左側**數字
    （右側 `8080` 是容器內部埠，不要更動），並同步更新反向代理的目的地連接埠。
3.  若該埠確實沒人使用卻仍失敗，通常是 Docker 的 iptables 規則殘留，
    重啟 Container Manager 套件即可（套件中心 → Container Manager → 停止 → 啟動）。

**授權時出現 `401: deleted_client`**

請求帶的 OAuth 用戶端已在 Google Cloud 上被刪除，通常是建立了新的用戶端但容器仍掛著舊檔。
比對線上服務實際使用的 client_id 與本機檔案：

```bash
# 線上服務目前使用的 client_id
curl -sik -H "Host: sociorock.com" https://<NAS-IP>:1010/authorize \
  | grep -i '^location' | grep -o 'client_id=[^&]*'

# 憑證檔裡的 client_id
python3 -c "import json;print(json.load(open('secrets/client_secret.json'))['web']['client_id'])"
```

兩者不一致就是 `secrets/client_secret.json` 沒更新到 NAS，或更新後容器未重啟。

**更換 OAuth 用戶端後的檢查清單：** 新用戶端若建在**不同的 Google Cloud 專案**，
下列設定不會自動沿用，必須在新專案重做：

1.  啟用 **Google Sheets API**
2.  設定 OAuth 同意畫面（發布狀態、測試使用者）
3.  確認重新導向 URI 含 `https://sociorock.com:1010/oauth2callback`

**反向代理回應 502**

nginx 連不到後端。依序確認：

1.  **目的地通訊協定必須是 HTTP，不是 HTTPS。**
    容器內跑的是 Flask 開發伺服器，只接受純 HTTP。若目的地選 HTTPS，
    nginx 會對它發起 TLS 交握而失敗，結果就是 502。TLS 在 nginx 這層終結即可。
2.  目的地連接埠要與 `docker-compose.yml` 中 `ports` 左側的數字一致（預設 8080）。
3.  從 NAS 本機直接打後端，確認容器本身正常：
    ```bash
    curl -I http://localhost:8080/     # 應回 302 FOUND
    ```
    若這一步就失敗，問題在容器而非代理，改看 `sudo docker logs coupon-gen`。

**常見誤解：不要把對外埠設成 1010。**
1010 是反向代理（nginx）監聽的埠，容器若也想綁 1010 會直接 bind 失敗。
正確的鏈路是：

    瀏覽器 --HTTPS--> nginx:1010 --HTTP--> 容器:8080

**注意：** 對外埠換了不影響 OAuth。Google 比對的是反向代理的來源位址
`https://sociorock.com:1010/oauth2callback`，與容器對外埠無關。

### 更新

*   **只換 OAuth 憑證：** 替換 `secrets/client_secret.json` 後重啟容器即可，不必重建映像檔。
*   **改了程式碼：** Container Manager → 專案 → 建置，重新建置後重啟。

## Usage
Once the application is running:
1.  Open your web browser and navigate to the application's URL (e.g., `http://localhost:8080`).
2.  You will be prompted to authorize the application to access your Google Sheets data. Follow the on-screen instructions.
3.  After authorization, you can:
    *   **Find a Coupon:** Enter a coupon code in the search box on the main page and submit.
    *   **Use a Coupon:** On the coupon details page, click "Use Coupon".
    *   **Update Coupon Details:** Modify the fields on the coupon details page and click "Update".
    *   **Generate a New Coupon:** Click the "Generate New Coupon" link/button.

## Contributing
Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.
