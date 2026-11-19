#!/usr/bin/env bash
# 跨多多标题工坊 · 2.2.4 服务端一键同步
# 在服务器上用 root 执行：
#   curl -fsSL https://raw.githubusercontent.com/hztengrui-ux/ecom-title-studio/main/scripts/deploy-auth-2.2.4.sh -o /tmp/deploy.sh
#   sudo bash /tmp/deploy.sh
set -euo pipefail

APP_DIR="/opt/kuaduo-auth"
PKG="KuaduoTitleWorkshop-2.2.4-win-x64.zip"
PKG_URL="https://github.com/hztengrui-ux/ecom-title-studio/releases/download/v2.2.4/${PKG}"
BASES=(
  "https://cdn.jsdelivr.net/gh/hztengrui-ux/ecom-title-studio@8a7bb55"
  "https://raw.githubusercontent.com/hztengrui-ux/ecom-title-studio/8a7bb55"
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

echo "== 2/6 备份 admin-ui.mjs =="
if [ -f "$APP_DIR/admin-ui.mjs" ]; then
  cp "$APP_DIR/admin-ui.mjs" "$APP_DIR/admin-ui.mjs.bak.$(date +%Y%m%d%H%M%S)"
  echo "  已备份"
else
  echo "  没有旧文件，跳过备份"
fi

echo "== 3/6 拉取 admin-ui.mjs 与 update.json =="
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
