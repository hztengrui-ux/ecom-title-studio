#!/usr/bin/env bash
# 跨多多账号服务 · 用系统 nginx 在 443 提供 api 子域（不碰 80 端口上运行的 openresty）
#   sudo bash setup-api-443.sh
# 证书用 DNS-01（TXT）签发：80 被占用，无法用 HTTP 验证。
set -uo pipefail

DOMAIN="${API_DOMAIN:-api.kuaduoduo.vip}"
EMAIL="${API_EMAIL:-admin@kuaduo.com}"
NGINX=/usr/sbin/nginx
CONF=/etc/nginx/conf.d/kuaduo-auth.conf
APP_DIR=/opt/kuaduo-auth

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 执行：sudo bash $0"
  exit 1
fi
[ -x "$NGINX" ] || { echo "✗ 没找到 $NGINX"; exit 1; }

echo "== 1. 清理与现有站点的冲突 =="
if [ -L /etc/nginx/sites-enabled/default ] || [ -f /etc/nginx/sites-enabled/default ]; then
  rm -f /etc/nginx/sites-enabled/default
  echo "  已禁用 nginx 默认站点（80 端口归 openresty）"
fi
# 检查是否还有别的配置监听 80/443 造成冲突（只提示，不删）
grep -RIn "listen[[:space:]]*80" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | grep -v kuaduo-auth | head -5 || true
rm -f "$CONF"
echo "  已清理旧的 kuaduo-auth.conf"

echo "== 2. 申请证书（DNS TXT 验证）=="
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  if ! command -v certbot >/dev/null; then
    echo "  安装 certbot ..."
    apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot
  fi
  echo
  echo "  ⚠ 下面会显示一条 TXT 记录，请到 DNSPod 添加："
  echo "     主机记录：_acme-challenge.api"
  echo "     记录类型：TXT"
  echo "     记录值：certbot 打印的那串字符"
  echo "  添加后等 30–60 秒，回到这里按回车继续。"
  echo
  certbot certonly --manual --preferred-challenges dns -d "$DOMAIN" \
    --agree-tos -m "$EMAIL" --no-eff-email || {
      echo "✗ 证书申请未完成"; exit 1; }
fi
[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] || { echo "✗ 证书文件不存在"; exit 1; }
echo "  证书就绪：/etc/letsencrypt/live/$DOMAIN/"

echo "== 3. 写 443 反代配置并启动 nginx =="
cat > "$CONF" <<EOF
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
"$NGINX" -t || { echo "✗ nginx 配置检查失败"; exit 1; }
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx || { echo "✗ nginx 启动失败（可能 443 被占）"; systemctl status nginx --no-pager -l | tail -10; exit 1; }
sleep 1
CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/health" || true)
echo "  HTTPS 自检: $CODE"

echo "== 4. 账号 =="
if [ -f "$APP_DIR/admin.mjs" ]; then
  cd "$APP_DIR"
  node admin.mjs list 2>&1 | head -8
  if ! node admin.mjs list 2>&1 | grep -q 'client01'; then
    node admin.mjs create client01 --name "客户一号" --days 30
  else
    echo "  client01 已存在（重置密码：cd $APP_DIR && node admin.mjs reset client01）"
  fi
else
  echo "  ✗ $APP_DIR/admin.mjs 不存在，账号服务还没装好"
fi

echo
echo "== 完成 =="
echo "  接口地址: https://$DOMAIN/auth/login"
echo "  健康检查: https://$DOMAIN/health"
echo "  账号管理: cd $APP_DIR && node admin.mjs list"
