#!/usr/bin/env bash
# 璺ㄥ澶氭爣棰樺伐鍧?路 2.2.4 鏈嶅姟绔竴閿悓姝?# 鍦ㄦ湇鍔″櫒涓婄敤 root 鎵ц锛?#   curl -fsSL https://raw.githubusercontent.com/hztengrui-ux/ecom-title-studio/main/scripts/deploy-auth-2.2.4.sh -o /tmp/deploy.sh
#   sudo bash /tmp/deploy.sh
set -euo pipefail

APP_DIR="/opt/kuaduo-auth"
PKG="KuaduoTitleWorkshop-2.2.4-win-x64.zip"
PKG_URL="https://github.com/hztengrui-ux/ecom-title-studio/releases/download/v2.2.4/${PKG}"
BASES=(
  "https://cdn.jsdelivr.net/gh/hztengrui-ux/ecom-title-studio@4f5a115"
  "https://raw.githubusercontent.com/hztengrui-ux/ecom-title-studio/4f5a115"
)

fetch_small() {
  # $1=鐩稿璺緞 $2=鐩爣鏂囦欢
  local path="$1" dest="$2" base
  for base in "${BASES[@]}"; do
    if curl -fsSL --connect-timeout 15 "$base/$path" -o "$dest"; then
      echo "  鏉ユ簮锛?base"
      return 0
    fi
  done
  echo "  鉁?鎷夊彇澶辫触锛?path"
  return 1
}

echo "== 1/6 妫€鏌ョ洰褰?=="
[ -d "$APP_DIR" ] || { echo "鎵句笉鍒?$APP_DIR锛屽厛纭鏈嶅姟瀹夎璺緞"; exit 1; }
mkdir -p "$APP_DIR/download"

echo "== 2/6 澶囦唤 admin-ui.mjs =="
if [ -f "$APP_DIR/admin-ui.mjs" ]; then
  cp "$APP_DIR/admin-ui.mjs" "$APP_DIR/admin-ui.mjs.bak.$(date +%Y%m%d%H%M%S)"
  echo "  宸插浠?
else
  echo "  娌℃湁鏃ф枃浠讹紝璺宠繃澶囦唤"
fi

echo "== 3/6 鎷夊彇 admin-ui.mjs 涓?update.json =="
fetch_small "auth-server/admin-ui.mjs" "$APP_DIR/admin-ui.mjs"
fetch_small "auth-server/update.json" "$APP_DIR/update.json"

echo "== 4/6 涓嬭浇 $PKG =="
SIZE=$(stat -c %s "$APP_DIR/download/$PKG" 2>/dev/null || echo 0)
if [ "$SIZE" -ge 100000000 ]; then
  echo "  宸插瓨鍦紙${SIZE} 瀛楄妭锛夛紝璺宠繃涓嬭浇"
else
  DL_OK=0
  for url in "$PKG_URL" "https://ghfast.top/$PKG_URL" "https://gh-proxy.com/$PKG_URL"; do
    rm -f "$APP_DIR/download/$PKG"
    if curl -fL --retry 2 --retry-delay 2 --connect-timeout 20 "$url" -o "$APP_DIR/download/$PKG"; then
      DL_OK=1
      echo "  涓嬭浇瀹屾垚锛?(stat -c %s "$APP_DIR/download/$PKG") 瀛楄妭"
      break
    fi
    echo "  璇ョ嚎璺け璐ワ紝鎹笅涓€鏉♀€?
  done
  if [ "$DL_OK" -ne 1 ]; then
    echo "  鈿?瀹夎鍖呬笅杞藉け璐ワ細鍙互鐢ㄥ疂濉旀妸鏈湴 release/$PKG 涓婁紶鍒?$APP_DIR/download/ 鍚庨噸璺戞湰鑴氭湰"
  fi
fi
# 涓婃涓柇鐣欎笅鐨?7MB 鍧忓寘
rm -f "$APP_DIR/download/KuaduoTitleWorkshop-2.2.3-win-x64.zip"

echo "== 5/6 閲嶅惎 kuaduo-auth =="
systemctl restart kuaduo-auth
sleep 1
systemctl is-active kuaduo-auth && echo "  service: running"

echo "== 6/6 楠岃瘉 =="
echo -n "  update/latest: "
curl -fsS https://api.kuaduoduo.vip/update/latest || true
echo
echo -n "  download/list: "
curl -fsS https://api.kuaduoduo.vip/download/list || true
echo
echo -n "  椤堕儴涓嬭浇鍏ュ彛: "
curl -fsS https://api.kuaduoduo.vip/admin | grep -o 'dlToggle' | head -1 || echo "鏈壘鍒?
echo "== 瀹屾垚 =="
