#!/usr/bin/env bash
# 跨多多账号服务 · 服务器一键部署（在服务器上 root 执行）
#   bash deploy-remote.sh <API域名> [证书邮箱] [管理员令牌]
# 例：bash deploy-remote.sh api.kuaduoduo.vip admin@kuaduoduo.vip
#
# 做的事：
#   1. 检查 Node / Nginx(openresty) / certbot
#   2. 安装账号服务到 /opt/kuaduo-auth（systemd 守护，127.0.0.1:8090）
#   3. 给 <API域名> 建 Nginx server 块，反代到 127.0.0.1:8090
#   4. certbot 自动签证书并开 443（HTTP 自动跳 HTTPS）
#   5. 建第一个 30 天账号并打印用户名/密码
set -euo pipefail

DOMAIN="${1:-api.kuaduoduo.vip}"
EMAIL="${2:-admin@kuaduoduo.vip}"
ADMIN_TOKEN="${3:-$(openssl rand -hex 24)}"
APP_DIR=/opt/kuaduo-auth
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "== 0. 环境检查 =="
command -v node >/dev/null || { echo "缺少 node，请先安装 Node 18+"; exit 1; }
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 18 ] || { echo "Node 版本过低：$(node -v)"; exit 1; }

NGINX_BIN="$(command -v openresty || command -v nginx || true)"
[ -n "$NGINX_BIN" ] || { echo "没找到 nginx/openresty"; exit 1; }
NGINX_CONF_DIR="/etc/nginx/conf.d"
if [ ! -d "$NGINX_CONF_DIR" ]; then
  NGINX_CONF_DIR="$(dirname "$("$NGINX_BIN" -V 2>&1 | grep -o '/[^ ]*nginx.conf' | head -1)")"
  NGINX_CONF_DIR="${NGINX_CONF_DIR:-/usr/local/openresty/nginx/conf}/conf.d"
fi
mkdir -p "$NGINX_CONF_DIR"
echo "  node=$(node -v)  nginx=$NGINX_BIN  conf.d=$NGINX_CONF_DIR"

echo "== 1. 检查 DNS =="
HAVE_DNS=1
RESOLVED=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)
if [ -z "$RESOLVED" ]; then
  HAVE_DNS=0
  echo "  ⚠ $DOMAIN 还没解析（DNSPod 加 A 记录 -> 本机公网 IP）。先部署 HTTP，解析后再重跑本脚本即可自动签证书。"
else
  echo "  $DOMAIN -> $RESOLVED"
fi

echo "== 2. 安装账号服务 =="
bash "$SRC_DIR/install.sh" "$ADMIN_TOKEN" >/dev/null
systemctl is-active --quiet kuaduo-auth && echo "  kuaduo-auth: running (127.0.0.1:8090)"

echo "== 3. 配置 Nginx =="
cat > "$NGINX_CONF_DIR/kuaduo-auth.conf" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 32k;
        add_header Cache-Control "no-store";
    }
}
EOF
"$NGINX_BIN" -t
systemctl reload nginx 2>/dev/null || systemctl reload openresty 2>/dev/null || "$NGINX_BIN" -s reload
echo "  Nginx 已加载 $DOMAIN"

echo "  反代自检（本机 Host 头）..."
PROXY_CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" http://127.0.0.1/health || true)
echo "    /health -> $PROXY_CODE"
if [ "$PROXY_CODE" != "200" ]; then
  echo "  ⚠ 反代未生效：主配置 http{} 里没有 include 该目录。请在 nginx.conf 的 http{} 内加："
  echo "      include $NGINX_CONF_DIR/*.conf;"
fi

echo "== 4. 申请 HTTPS 证书 =="
if [ "$HAVE_DNS" -eq 0 ]; then
  echo "  ⚠ 跳过：$DOMAIN 未解析。解析生效后重跑本脚本即可自动签证书并开 443。"
else
  if ! command -v certbot >/dev/null; then
    echo "  安装 certbot ..."
    if command -v apt-get >/dev/null; then
      apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx
    elif command -v yum >/dev/null; then
      yum install -y -q certbot python3-certbot-nginx
    fi
  fi
  if command -v certbot >/dev/null; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || true
    echo "  证书状态："; certbot certificates | grep -A2 "$DOMAIN" || true
  else
    echo "  ⚠ certbot 未安装成功，请手动：certbot --nginx -d $DOMAIN"
  fi
fi

echo "== 5. 建第一个账号 =="
cd "$APP_DIR"
node admin.mjs create client01 --name "客户一号" --days 30

echo
echo "== 6. 自检 =="
curl -fsS "http://127.0.0.1:8090/health" && echo
echo
echo "== 完成 =="
echo "  接口地址：https://$DOMAIN/auth/login"
echo "  健康检查：https://$DOMAIN/health"
echo "  管理员令牌：$ADMIN_TOKEN  （已写入 /etc/kuaduo-auth.env，请妥善保存）"
echo "  账号管理：cd $APP_DIR && node admin.mjs list"
