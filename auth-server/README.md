# 跨多多账号服务（在线登录 · 30 天授权 · 可即时停用）

给「跨多多标题工坊」桌面版做账号登录用。零依赖（只用 Node 内置模块），数据存本地 JSON。

## 能力
- 用户名 + 密码登录（scrypt 加盐哈希，密码不落明文）
- 30 天授权到期自动拒绝；管理员可续期
- **管理员可即时停用账号**：客户端下次校验（启动时 + 每 30 分钟）立即被拒
- 令牌 12 小时过期，客户端自动续；限流：同一 IP 每分钟最多 8 次登录尝试
- 管理接口用独立 `X-Admin-Token`，与用户令牌隔离；建议 Nginx 只允许内网访问

## 目录
```
auth-server/
├─ server.mjs                 账号服务（默认 127.0.0.1:8090）
├─ admin.mjs                  管理员命令行（在服务器上直接跑，不用起服务）
├─ install.sh                 一键安装脚本（systemd + 自检）
├─ nginx-kuaduo-auth.conf     Nginx 反代片段
└─ data/                      accounts.json（账号，bcrypt 以外数据也没敏感明文）+ secret.key（令牌签名密钥）
```

## 部署（服务器上，root）
```bash
# 1) 上传 auth-server 目录到服务器，例如 /root/kuaduo-auth
# 2) 生成管理员令牌并安装
cd /root/kuaduo-auth
bash install.sh "$(openssl rand -hex 24)"
# 记下这个令牌，管理账号时要用（也在 /etc/kuaduo-auth.env）

# 3) Nginx 加反代片段（见 nginx-kuaduo-auth.conf）后
nginx -t && systemctl reload nginx
curl -fsS https://<你的域名>/api/auth/health
```

客户端配置：`AUTH_BASE=https://<你的域名>/api`，登录地址即 `AUTH_BASE + /auth/login`。

## 账号管理（服务器上执行）
```bash
cd /opt/kuaduo-auth
node admin.mjs create client01 --name "客户一号" --days 30   # 打印初始密码
node admin.mjs list
node admin.mjs disable client01        # 立即停用（收回）
node admin.mjs enable client01
node admin.mjs extend client01 --days 30   # 续期
node admin.mjs reset client01              # 重置密码（打印新密码）
```

## 接口
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/auth/login` | `{username,password}` → `{token, account}` |
| GET | `/auth/me` | `Authorization: Bearer <token>` → 账号状态与剩余天数 |
| GET | `/health` | 存活检查 |
| POST | `/admin/accounts` | 建号（`X-Admin-Token`）：`{username,password,name,days}` |
| GET | `/admin/accounts` | 列表 |
| POST | `/admin/accounts/<id>/disable\|enable\|extend\|reset` | 停用/恢复/续期/改密 |

## 本地自测
```bash
node test/auth.test.mjs
```
