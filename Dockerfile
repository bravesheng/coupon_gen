# Synology Container Manager 部署用
# NAS 多為 x86_64，在 Apple Silicon 上建置請加 --platform linux/amd64
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Taipei

WORKDIR /app

# 先裝相依套件，讓這層在程式碼變動時仍能命中快取
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 只複製執行期真正需要的檔案
COPY web_flask.py coupon.py gsheet.py ./
COPY templates/ ./templates/

# client_secret.json 不烘進映像檔，於執行期以唯讀 volume 掛載
ENV CLIENT_SECRETS_FILE=/app/secrets/client_secret.json

# 以非 root 身分執行
RUN useradd --create-home --uid 1000 appuser \
    && mkdir -p /app/secrets \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

CMD ["python", "web_flask.py"]
