#!/usr/bin/env bash
# 跨多多账号服务 · 给 api 子域配 Nginx + HTTPS + 建账号（在服务器上 root 执行）
#   sudo bash setup-api-domain.sh
# 幂等：可重复执行
set -uo pipefail

DOMAIN="${API_DOMAIN:-api.kuaduoduo.vip}"
EMAIL="${API_EMAIL:-admin@kuaduo.com}"
ACME_DIR=/var/www/kuaduo-acme
CONF=/etc/nginx/conf.d/kuaduo-auth.conf
APP_DIR=/opt/kuaduo-auth

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 执行：sudo bash $0"
  exit 1
fi

OPENRESTY="$(command -v openresty || true)"
[ -n "$OPENRESTY" ] || OPENRESTY=/usr/local/openresty/bin/openresty
if [ ! -x "$OPENRESTY" ]; then
  echo "✗ 找不到 openresty（$OPENRESTY）"
  exit 1
fi

NGXCONF="$("$OPENRESTY" -t 2>&1 | grep -oE '/[^ ]+nginx.conf' | head -1)"
[ -n "$NGXCONF" ] && [ -f "$NGXCONF" ] || NGXCONF=/usr/local/openresty/nginx/conf/nginx.conf
echo "openresty conf: $NGXCONF"
mkdir -p "$ACME_DIR" /etc/nginx/conf.d

write_http_conf() {
  cat > "$CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root $ACME_DIR;
    }

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
}

write_https_conf() {
  cat > "$CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root $ACME_DIR;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

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
}

reload_web() {
  "$OPENRESTY" -t || return 1
  systemctl restart openresty 2>/dev/null || systemctl restart nginx 2>/dev/null || "$OPENRESTY" -s reload
  sleep 1
}

ensure_include() {
  if grep -q 'kuaduo-auth.conf' "$NGXCONF"; then
    echo "  include 已存在"
    return 0
  fi
  cp "$NGXCONF" "$NGXCONF.bak.$(date +%s)"
  sed -i "0,/^[[:space:]]*http[[:space:]]*{/s//http {\n    include \/etc\/nginx\/conf.d\/kuaduo-auth.conf;/" "$NGXCONF"
  echo "  已插入 include（原文件已备份）"
  grep -n 'kuaduo-auth.conf' "$NGXCONF" || true
}

echo "== 1. HTTP 反代 =="
write_http_conf
ensure_include
reload_web || { echo "✗ Nginx 配置失败"; exit 1; }
CODE_LOCAL=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" http://127.0.0.1/health || true)
CODE_PUBLIC=$(curl -s -o /dev/null -w '%{http_code}' "http://$DOMAIN/health" || true)
echo "  本机自检: $CODE_LOCAL   外网自检: $CODE_PUBLIC"
if [ "$CODE_LOCAL" != "200" ]; then
  echo "✗ 反代未生效，停止。请把上面 openresty conf 内容发我。"
  exit 1
fi

echo "== 2. HTTPS 证书 =="
if ! command -v certbot >/dev/null; then
  echo "  安装 certbot ..."
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot
fi
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  certbot certonly --webroot -w "$ACME_DIR" -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL"
fi
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  write_https_conf
  reload_web || { echo "✗ HTTPS 配置失败"; exit 1; }
  CODE_HTTPS=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/health" || true)
  echo "  HTTPS 自检: $CODE_HTTPS"
else
  echo "  ⚠ 证书没签成（可能 80/443 防火墙或 DNS 未生效），先保持 HTTP。"
fi

echo "== 3. 账号 =="
if [ ! -f "$APP_DIR/admin.mjs" ]; then
  echo "  ✗ $APP_DIR/admin.mjs 不存在：账号服务还没装好，先跑 deploy-remote.sh"
  exit 1
fi
LIST=$(cd "$APP_DIR" && node admin.mjs list 2>&1)
echo "$LIST" | head -8
if ! echo "$LIST" | grep -q 'client01'; then
  cd "$APP_DIR" && node admin.mjs create client01 --name "客户一号" --days 30
else
  echo "  client01 已存在（如需重置密码：cd $APP_DIR && node admin.mjs reset client01）"
fi

echo
echo "== 完成 =="
echo "  接口地址: https://$DOMAIN/auth/login"
echo "  健康检查: https://$DOMAIN/health"
echo "  账号管理: cd $APP_DIR && node admin.mjs list"
