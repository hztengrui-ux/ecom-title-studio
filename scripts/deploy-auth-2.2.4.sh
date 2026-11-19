#!/usr/bin/env bash
# 跨多多标题工坊 · 2.2.4 服务端一键同步
# 在服务器上用 root 执行：
#   curl -fsSL https://raw.githubusercontent.com/hztengrui-ux/ecom-title-studio/main/scripts/deploy-auth-2.2.4.sh -o /tmp/deploy.sh
#   sudo bash /tmp/deploy.sh
set -euo pipefail

RAW="https://raw.githubusercontent.com/hztengrui-ux/ecom-title-studio/main"
APP_DIR="/opt/kuaduo-auth"
PKG="KuaduoTitleWorkshop-2.2.4-win-x64.zip"
PKG_URL="https://github.com/hztengrui-ux/ecom-title-studio/releases/download/v2.2.4/${PKG}"

echo "== 1/6 检查目录 =="
[ -d "$APP_DIR" ] || { echo "找不到 $APP_DIR，先确认服务安装路径"; exit 1; }
mkdir -p "$APP_DIR/download"

echo "== 2/6 备份 admin-ui.mjs =="
if [ -f "$APP_DIR/admin-ui.mjs" ]; then
  cp "$APP_DIR/admin-ui.mjs" "$APP_DIR/admin-ui.mjs.bak.$(date +%Y%m%d%H%M%S)"
  echo "  已备份"
else
  echo "  没有旧文件，跳过备份"
fi

echo "== 3/6 拉取 admin-ui.mjs 与 update.json =="
curl -fsSL "$RAW/auth-server/admin-ui.mjs" -o "$APP_DIR/admin-ui.mjs"
curl -fsSL "$RAW/auth-server/update.json" -o "$APP_DIR/update.json"

echo "== 4/6 下载 $PKG =="
SIZE=$(stat -c %s "$APP_DIR/download/$PKG" 2>/dev/null || echo 0)
if [ "$SIZE" -ge 100000000 ]; then
  echo "  已存在（${SIZE} 字节），跳过下载"
else
  curl -fL --retry 3 --retry-delay 2 "$PKG_URL" -o "$APP_DIR/download/$PKG"
  echo "  下载完成：$(stat -c %s "$APP_DIR/download/$PKG") 字节"
fi
# 上次中断留下的 7MB 坏包
rm -f "$APP_DIR/download/KuaduoTitleWorkshop-2.2.3-win-x64.zip"

echo "== 5/6 重启 kuaduo-auth =="
systemctl restart kuaduo-auth
sleep 1
systemctl is-active kuaduo-auth && echo "  service: running"

echo "== 6/6 验证 =="
echo -n "  update/latest: "
curl -fsS https://api.kuaduoduo.vip/update/latest || true
echo
echo -n "  download/list: "
curl -fsS https://api.kuaduoduo.vip/download/list || true
echo
echo -n "  顶部下载入口: "
curl -fsS https://api.kuaduoduo.vip/admin | grep -o 'dlToggle' | head -1 || echo "未找到"
echo "== 完成 =="
