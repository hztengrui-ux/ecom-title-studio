// 跨多多授权服务 · 管理后台页面（单文件内嵌 HTML，无外部依赖）

export function renderAdminPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>跨多多 · 账号授权管理</title>
<style>
  :root {
    --paper:#f4efe5; --paper-2:#fbf8f1; --ink:#1e1c18; --ink-2:#37322a;
    --muted:#7b7366; --muted-2:#9b9182; --line:#ddd3c2; --line-strong:#c8bba5;
    --accent:#d2553c; --accent-deep:#9f3624; --sage:#5d7056; --amber:#bd822c;
    --danger:#b23b2c; --radius:14px;
    --serif:"Noto Serif SC","Source Han Serif SC","Songti SC",Georgia,serif;
    --sans:"Noto Sans SC","PingFang SC","Microsoft YaHei","Segoe UI",sans-serif;
  }
  * { box-sizing:border-box; }
  body {
    margin:0; min-height:100vh; font-family:var(--sans); color:var(--ink);
    background:
      radial-gradient(900px 520px at 88% -10%, #fcf6e9 0%, rgba(252,246,233,0) 60%),
      radial-gradient(760px 480px at 0% 108%, #efe6d5 0%, rgba(239,230,213,0) 58%),
      var(--paper);
  }
  .wrap { max-width:1180px; margin:0 auto; padding:28px 24px 48px; }
  header.top { display:flex; align-items:center; gap:14px; margin-bottom:22px; }
  .glyph { width:44px; height:44px; border-radius:12px; display:grid; place-items:center;
    background:var(--accent); color:#fff8ef; font-family:var(--serif); font-size:22px;
    box-shadow:0 8px 18px rgba(210,85,60,.28); }
  .brand strong { display:block; font-family:var(--serif); font-size:19px; letter-spacing:.04em; }
  .brand span { font-size:10px; letter-spacing:.18em; color:var(--muted-2); }
  .top-right { margin-left:auto; display:flex; align-items:center; gap:10px; }
  .pill { height:32px; display:inline-flex; align-items:center; gap:8px; padding:0 12px;
    border:1px solid var(--line); border-radius:999px; background:#fffdf8; font-size:12px; color:var(--ink-2); }
  .dot { width:7px; height:7px; border-radius:50%; background:var(--sage); }
  .dot.off { background:var(--amber); }

  .card { background:var(--paper-2); border:1px solid var(--line); border-radius:var(--radius);
    box-shadow:0 14px 36px rgba(63,50,32,.07); padding:22px; margin-bottom:18px; }
  .card h2 { margin:0 0 4px; font-family:var(--serif); font-size:17px; }
  .card .lead { margin:0 0 16px; font-size:12.5px; color:var(--muted); }

  .login-card { max-width:440px; margin:8vh auto 0; }
  .field { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
  .field label { font-size:12px; letter-spacing:.08em; color:var(--muted); }
  input[type=text], input[type=password], input[type=number], select {
    height:38px; padding:0 12px; border:1px solid var(--line); border-radius:9px;
    background:#fffdf8; font-size:14px; color:var(--ink); outline:none; width:100%;
    font-family:var(--sans);
  }
  input:focus, select:focus { border-color:var(--accent); }
  .btn { height:36px; padding:0 16px; border-radius:9px; border:1px solid var(--line);
    background:#fffdf8; color:var(--ink-2); font-size:13px; cursor:pointer; font-family:var(--sans);
    transition:all .15s ease; white-space:nowrap; }
  .btn:hover { border-color:var(--line-strong); color:var(--ink); }
  .btn.primary { background:var(--ink); border-color:var(--ink); color:#f7f1e6; }
  .btn.primary:hover { background:#000; }
  .btn.danger { color:var(--danger); border-color:#e6c4ba; background:#fdf1ed; }
  .btn.tiny { height:29px; padding:0 10px; font-size:12px; border-radius:7px; }
  .btn:disabled { opacity:.55; cursor:not-allowed; }

  .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
  .stat { background:var(--paper-2); border:1px solid var(--line); border-radius:12px; padding:14px 16px; }
  .stat b { display:block; font-size:24px; font-family:var(--serif); }
  .stat span { font-size:12px; color:var(--muted); }

  table { width:100%; border-collapse:collapse; font-size:13px; }
  th, td { text-align:left; padding:10px 8px; border-bottom:1px dashed var(--line); vertical-align:middle; }
  th { font-weight:500; font-size:12px; color:var(--muted); letter-spacing:.05em; }
  tr:last-child td { border-bottom:0; }
  .user { font-weight:600; }
  .sub { color:var(--muted-2); font-size:12px; }
  .tag { display:inline-flex; align-items:center; height:22px; padding:0 9px; border-radius:999px;
    font-size:11.5px; border:1px solid var(--line); background:#fffdf8; color:var(--ink-2); }
  .tag.on { color:#3f5a37; border-color:#c9d6c2; background:#eef3ea; }
  .tag.off { color:#8a4a2b; border-color:#ecd8b4; background:#fbf3e2; }
  .tag.expired { color:var(--danger); border-color:#e6c4ba; background:#fdf1ed; }
  .ops { display:flex; gap:6px; flex-wrap:wrap; }

  .row-actions { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; }
  .row-actions .field { margin:0; }
  .row-actions .field input { width:130px; }
  .error { color:var(--danger); font-size:12.5px; margin:8px 0 0; }
  .notice { margin:12px 0 0; padding:10px 12px; border-radius:9px; font-size:13px;
    background:#eef3ea; border:1px solid #c9d6c2; color:#3f5a37; }
  .notice.bad { background:#fdf1ed; border-color:#e6c4ba; color:var(--danger); }
  .notice code { font-family:var(--sans); font-weight:700; letter-spacing:.04em; }
  .hidden { display:none !important; }
  @media (max-width:760px) {
    .stats { grid-template-columns:repeat(2,1fr); }
    th:nth-child(3), td:nth-child(3) { display:none; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <span class="glyph">题</span>
    <div class="brand">
      <strong>跨多多 · 账号授权管理</strong>
      <span>KUADUO OAUTH ADMIN</span>
    </div>
    <div class="top-right">
      <span class="pill"><i class="dot" id="svcDot"></i><span id="svcText">检查服务中…</span></span>
      <button class="btn tiny" id="logoutBtn" type="button" hidden>退出管理</button>
    </div>
  </header>

  <section class="card login-card" id="loginCard">
    <h2>管理员登录</h2>
    <p class="lead">请输入服务器上的管理员令牌（<code>/etc/kuaduo-auth.env</code> 里的 <code>AUTH_ADMIN_TOKEN</code>）。令牌只保存在本机浏览器。</p>
    <div class="field">
      <label for="tokenInput">管理员令牌</label>
      <input type="password" id="tokenInput" placeholder="粘贴管理员令牌" autocomplete="off" />
    </div>
    <button class="btn primary" id="loginBtn" type="button">进入管理后台</button>
    <p class="error hidden" id="loginError"></p>
  </section>

  <main id="panel" class="hidden">
    <div class="stats">
      <div class="stat"><b id="stTotal">0</b><span>账号总数</span></div>
      <div class="stat"><b id="stActive">0</b><span>正常使用</span></div>
      <div class="stat"><b id="stExpiring">0</b><span>7 天内到期</span></div>
      <div class="stat"><b id="stOff">0</b><span>停用 / 到期</span></div>
    </div>

    <section class="card">
      <h2>新建账号</h2>
      <p class="lead">密码留空会自动生成一个 10 位初始密码，创建后只显示一次，请复制发给客户。</p>
      <div class="row-actions">
        <div class="field"><label>账号</label><input type="text" id="newUser" placeholder="如 client02" /></div>
        <div class="field"><label>姓名 / 备注</label><input type="text" id="newName" placeholder="客户名称" /></div>
        <div class="field"><label>授权天数</label><input type="number" id="newDays" value="30" min="1" max="3650" /></div>
        <div class="field"><label>初始密码（可空）</label><input type="text" id="newPass" placeholder="留空自动生成" /></div>
        <button class="btn primary" id="createBtn" type="button">创建账号</button>
        <button class="btn" id="refreshBtn" type="button">刷新列表</button>
      </div>
      <p class="notice hidden" id="createNotice"></p>
    </section>

    <section class="card">
      <h2>账号列表</h2>
      <p class="lead">停用后客户端最迟 30 分钟内被退回登录页；续期在原有到期时间上顺延。</p>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>账号</th><th>到期时间</th><th>剩余</th><th>状态</th><th style="width:330px">操作</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
      <p class="notice hidden" id="listNotice"></p>
    </section>
  </main>
</div>

<script>
(function () {
  var TOKEN_KEY = 'kuaduo.admin.token';
  var state = { token: localStorage.getItem(TOKEN_KEY) || '', accounts: [] };

  var $ = function (id) { return document.getElementById(id); };
  var loginCard = $('loginCard');
  var panel = $('panel');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function randomPassword() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    var out = '';
    var buf = new Uint32Array(10);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < 10; i += 1) out += chars[buf[i] % chars.length];
    return out;
  }
  function showNotice(el, text, bad) {
    el.textContent = text;
    el.classList.toggle('bad', !!bad);
    el.classList.remove('hidden');
  }
  function hide(el) { el.classList.add('hidden'); }

  async function api(path, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (state.token) headers['X-Admin-Token'] = state.token;
    var resp = await fetch(path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    var data = null;
    try { data = await resp.json(); } catch (e) { data = null; }
    if (!resp.ok || !data || data.ok === false) {
      var msg = (data && data.error) || ('请求失败 ' + resp.status);
      var err = new Error(msg);
      err.status = resp.status;
      throw err;
    }
    return data;
  }

  function statusOf(acc) {
    if (acc.disabled) return { cls: 'off', text: '已停用' };
    if (acc.daysLeft === 0) return { cls: 'expired', text: '已到期' };
    return { cls: 'on', text: '使用中' };
  }

  function render() {
    var accounts = state.accounts.slice().sort(function (a, b) {
      return String(a.expiresAt).localeCompare(String(b.expiresAt));
    });
    var total = accounts.length;
    var active = 0, expiring = 0, off = 0;
    accounts.forEach(function (a) {
      var blocked = a.disabled || a.daysLeft === 0;
      if (blocked) off += 1;
      else {
        active += 1;
        if (a.daysLeft <= 7) expiring += 1;
      }
    });
    $('stTotal').textContent = total;
    $('stActive').textContent = active;
    $('stExpiring').textContent = expiring;
    $('stOff').textContent = off;

    if (!accounts.length) {
      $('tbody').innerHTML = '<tr><td colspan="5" class="sub" style="padding:18px 8px">还没有账号，先在上面创建一个。</td></tr>';
      return;
    }
    $('tbody').innerHTML = accounts.map(function (a, index) {
      var st = statusOf(a);
      var days = a.daysLeft === null || a.daysLeft === undefined ? '—' : (a.daysLeft + ' 天');
      var opName = a.disabled ? '启用' : '停用';
      var opAction = a.disabled ? 'enable' : 'disable';
      var opCls = a.disabled ? 'btn tiny' : 'btn tiny danger';
      return '<tr data-id="' + esc(a.id) + '">'
        + '<td><div class="user">' + esc(a.username) + '</div><div class="sub">' + esc(a.name || '') + '</div></td>'
        + '<td>' + fmtDate(a.expiresAt) + '</td>'
        + '<td>' + days + '</td>'
        + '<td><span class="tag ' + st.cls + '">' + st.text + '</span></td>'
        + '<td><div class="ops">'
        + '<button class="btn tiny" data-act="extend">续期 30 天</button>'
        + '<button class="btn tiny" data-act="reset">重置密码</button>'
        + '<button class="' + opCls + '" data-act="' + opAction + '">' + opName + '</button>'
        + '</div></td>'
        + '</tr>';
    }).join('');
    $('tbody').onclick = onRowClick;
  }

  async function loadAccounts() {
    var data = await api('/admin/accounts');
    state.accounts = data.accounts || [];
    render();
  }

  async function onRowClick(event) {
    var btn = event.target.closest('button[data-act]');
    if (!btn) return;
    var row = btn.closest('tr');
    var id = row && row.getAttribute('data-id');
    if (!id) return;
    var act = btn.getAttribute('data-act');
    btn.disabled = true;
    hide($('listNotice'));
    try {
      if (act === 'extend') {
        await api('/admin/accounts/' + id + '/extend', { method: 'POST', body: { days: 30 } });
        showNotice($('listNotice'), '已续期 30 天，客户端下次校验后生效。');
      } else if (act === 'disable') {
        if (!confirm('停用后该客户最迟 30 分钟内会被退回登录页，确定停用？')) return;
        await api('/admin/accounts/' + id + '/disable', { method: 'POST', body: {} });
        showNotice($('listNotice'), '已停用该账号。');
      } else if (act === 'enable') {
        await api('/admin/accounts/' + id + '/enable', { method: 'POST', body: {} });
        showNotice($('listNotice'), '已启用该账号。');
      } else if (act === 'reset') {
        var pwd = randomPassword();
        await api('/admin/accounts/' + id + '/reset', { method: 'POST', body: { password: pwd } });
        showNotice($('listNotice'), '新密码：' + pwd + '（只显示这一次，请立刻复制发给客户）');
      }
      await loadAccounts();
    } catch (error) {
      showNotice($('listNotice'), error.message || '操作失败', true);
      if (error.status === 401) logout();
    } finally {
      btn.disabled = false;
    }
  }

  async function createAccount() {
    hide($('createNotice'));
    var username = $('newUser').value.trim();
    var name = $('newName').value.trim();
    var days = Number($('newDays').value) || 30;
    var password = $('newPass').value.trim() || randomPassword();
    if (!username) { showNotice($('createNotice'), '请填写账号', true); return; }
    $('createBtn').disabled = true;
    try {
      await api('/admin/accounts', { method: 'POST', body: { username: username, name: name || username, password: password, days: days } });
      showNotice($('createNotice'), '已创建账号 ' + username + '，初始密码：' + password + '（只显示这一次）');
      $('newUser').value = '';
      $('newName').value = '';
      $('newPass').value = '';
      await loadAccounts();
    } catch (error) {
      showNotice($('createNotice'), error.message || '创建失败', true);
      if (error.status === 401) logout();
    } finally {
      $('createBtn').disabled = false;
    }
  }

  async function checkHealth() {
    try {
      var resp = await fetch('/health');
      var data = await resp.json();
      $('svcDot').classList.toggle('off', !data.ok);
      $('svcText').textContent = data.ok ? '授权服务正常' : '服务异常';
    } catch (e) {
      $('svcDot').classList.add('off');
      $('svcText').textContent = '服务不可达';
    }
  }

  function showPanel() {
    loginCard.classList.add('hidden');
    panel.classList.remove('hidden');
    $('logoutBtn').hidden = false;
  }
  function logout() {
    state.token = '';
    localStorage.removeItem(TOKEN_KEY);
    panel.classList.add('hidden');
    loginCard.classList.remove('hidden');
    $('logoutBtn').hidden = true;
    $('tokenInput').value = '';
  }

  async function enterWithToken() {
    var token = $('tokenInput').value.trim();
    if (!token) { $('loginError').textContent = '请输入管理员令牌'; $('loginError').classList.remove('hidden'); return; }
    $('loginBtn').disabled = true;
    hide($('loginError'));
    state.token = token;
    try {
      await loadAccounts();
      localStorage.setItem(TOKEN_KEY, token);
      showPanel();
    } catch (error) {
      state.token = '';
      if (error.status === 401) {
        $('loginError').textContent = '管理员令牌不对，请检查后再试';
      } else {
        $('loginError').textContent = error.message || '连接失败';
      }
      $('loginError').classList.remove('hidden');
    } finally {
      $('loginBtn').disabled = false;
    }
  }

  $('loginBtn').addEventListener('click', enterWithToken);
  $('tokenInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') enterWithToken(); });
  $('createBtn').addEventListener('click', createAccount);
  $('refreshBtn').addEventListener('click', function () {
    loadAccounts().catch(function (e) { showNotice($('listNotice'), e.message, true); });
  });
  $('logoutBtn').addEventListener('click', logout);

  checkHealth();
  if (state.token) {
    loadAccounts().then(showPanel).catch(function () { logout(); });
  }
})();
</script>
</body>
</html>`;
}
