#!/usr/bin/env bash
# 跨多多账号服务 · 一键安装（在云服务器上用 root 执行）
#   bash install.sh <管理员令牌>
# 说明：服务只监听 127.0.0.1:8090，由 Nginx 反代到 /api/auth/。
set -euo pipefail

ADMIN_TOKEN="${1:-}"
if [ -z "$ADMIN_TOKEN" ]; then
  echo "用法：bash install.sh <管理员令牌>"
  echo "管理员令牌建议用：openssl rand -hex 24"
  exit 1
fi

APP_DIR=/opt/kuaduo-auth
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "== 1/5 创建目录 =="
mkdir -p "$APP_DIR/data"
cp "$SRC_DIR/server.mjs" "$APP_DIR/server.mjs"
cp "$SRC_DIR/admin.mjs" "$APP_DIR/admin.mjs"
chmod 700 "$APP_DIR/data"

echo "== 2/5 写环境变量 =="
cat > /etc/kuaduo-auth.env <<EOF
AUTH_PORT=8090
AUTH_ADMIN_TOKEN=$ADMIN_TOKEN
AUTH_DEFAULT_DAYS=30
AUTH_TOKEN_TTL_HOURS=12
EOF
chmod 600 /etc/kuaduo-auth.env

echo "== 3/5 安装 systemd 服务 =="
cat > /etc/systemd/system/kuaduo-auth.service <<'EOF'
[Unit]
Description=Kuaduo Auth Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/kuaduo-auth
EnvironmentFile=/etc/kuaduo-auth.env
ExecStart=/usr/bin/env node /opt/kuaduo-auth/server.mjs
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable kuaduo-auth >/dev/null 2>&1 || true
systemctl restart kuaduo-auth

echo "== 4/5 自检 =="
sleep 1
curl -fsS http://127.0.0.1:8090/health && echo

echo "== 5/5 完成 =="
cat <<'TIP'

服务已启动：http://127.0.0.1:8090

还需要在 Nginx 里加反代（详见 nginx-kuaduo-auth.conf），例如：

  location /api/auth/ {
      proxy_pass http://127.0.0.1:8090/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      client_max_body_size 32k;
  }

账号管理（在服务器上执行）：
  cd /opt/kuaduo-auth
  node admin.mjs create client01 --name "客户一号" --days 30
  node admin.mjs list
  node admin.mjs disable client01     # 立即停用（客户端下次校验即拒绝）
  node admin.mjs extend client01 --days 30
  node admin.mjs reset client01
TIP
