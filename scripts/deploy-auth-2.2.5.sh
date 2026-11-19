#!/usr/bin/env bash
# 跨多多标题工坊 · 2.2.5 服务端一键同步
# 在服务器上用 root 执行：
#   curl -fsSL https://cdn.jsdelivr.net/gh/hztengrui-ux/ecom-title-studio@__COMMIT__/scripts/deploy-auth-2.2.5.sh -o /tmp/deploy.sh
#   sudo bash /tmp/deploy.sh
set -euo pipefail

APP_DIR="/opt/kuaduo-auth"
PKG="KuaduoTitleWorkshop-2.2.5-win-x64.zip"
PKG_URL="https://github.com/hztengrui-ux/ecom-title-studio/releases/download/v2.2.5/${PKG}"
BASES=(
  "https://cdn.jsdelivr.net/gh/hztengrui-ux/ecom-title-studio@__COMMIT__"
  "https://raw.githubusercontent.com/hztengrui-ux/ecom-title-studio/__COMMIT__"
)

fetch_small() {
  # $1=相对路径 $2=目标文件
  local path="$1" dest="$2" base
  for base in "${BASES[@]}"; do
    if curl -fsSL --connect-timeout 15 "$base/$path" -o "$dest"; then
      echo "  来源：$base"
      return 0
    fi
  done
  echo "  ✗ 拉取失败：$path"
  return 1
}

echo "== 1/6 检查目录 =="
[ -d "$APP_DIR" ] || { echo "找不到 $APP_DIR，先确认服务安装路径"; exit 1; }
mkdir -p "$APP_DIR/download"

echo "== 2/6 备份 admin-ui.mjs / server.mjs =="
STAMP=$(date +%Y%m%d%H%M%S)
for f in admin-ui.mjs server.mjs; do
  if [ -f "$APP_DIR/$f" ]; then
    cp "$APP_DIR/$f" "$APP_DIR/$f.bak.$STAMP"
    echo "  已备份 $f"
  fi
done

echo "== 3/6 拉取 server.mjs / admin-ui.mjs / update.json =="
fetch_small "auth-server/server.mjs" "$APP_DIR/server.mjs"
fetch_small "auth-server/admin-ui.mjs" "$APP_DIR/admin-ui.mjs"
fetch_small "auth-server/update.json" "$APP_DIR/update.json"

echo "== 4/6 下载 $PKG =="
SIZE=$(stat -c %s "$APP_DIR/download/$PKG" 2>/dev/null || echo 0)
if [ "$SIZE" -ge 100000000 ]; then
  echo "  已存在（${SIZE} 字节），跳过下载"
else
  DL_OK=0
  for url in "$PKG_URL" "https://ghfast.top/$PKG_URL" "https://gh-proxy.com/$PKG_URL"; do
    rm -f "$APP_DIR/download/$PKG"
    if curl -fL --retry 2 --retry-delay 2 --connect-timeout 20 "$url" -o "$APP_DIR/download/$PKG"; then
      DL_OK=1
      echo "  下载完成：$(stat -c %s "$APP_DIR/download/$PKG") 字节"
      break
    fi
    echo "  该线路失败，换下一条…"
  done
  if [ "$DL_OK" -ne 1 ]; then
    echo "  ⚠ 安装包下载失败：可以用宝塔把本地 release/$PKG 上传到 $APP_DIR/download/ 后重跑本脚本"
  fi
fi
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
echo -n "  调用记录入口: "
curl -fsS https://api.kuaduoduo.vip/admin | grep -o 'usageSummary' | head -1 || echo "未找到"
echo "== 完成 =="
