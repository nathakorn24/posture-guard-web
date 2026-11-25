/* Dashboard บริษัท — Don't let your boss kill you back
 * อ่านข้อมูลผ่านฟังก์ชันใน Supabase (ดู supabase/schema.sql) ด้วยรหัสผู้ดูแล
 * รหัสผู้ดูแลเก็บไว้ในหน่วยความจำของแท็บนี้เท่านั้น (ปิด/รีเฟรชหน้า = ต้องล็อกอินใหม่)
 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CONF_KEY = "pg_company_conf";
  const REFRESH_MS = 10000;
  const POSTURE = { good: "นั่งถูกท่า", forward: "โน้มตัวไปข้างหน้า", backward: "เอนหลัง / นั่งไหลลง", bad: "ท่าไม่ถูกต้อง",
    forward_head: "คอยื่น", slouch: "หลังค่อม", lean_close: "ใกล้จอเกินไป", lean_side: "เอียงตัว", away: "ไม่อยู่ที่โต๊ะ", unknown: "กำลังวิเคราะห์" };
  const ERR = { wrong_password: "รหัสผ่านไม่ถูกต้อง", locked: "ใส่รหัสผิดหลายครั้ง ระบบล็อกไว้ 10 นาที", no_company: "ไม่พบบริษัทนี้",
    name_taken: "มีบริษัทชื่อนี้แล้ว", bad_name: "ชื่อบริษัทต้องยาว 2–60 ตัวอักษร", admin_pw_short: "รหัสผู้ดูแลต้องยาวอย่างน้อย 8 ตัว",
    join_pw_short: "รหัสพนักงานต้องยาวอย่างน้อย 6 ตัว", same_pw: "รหัสผู้ดูแลกับรหัสพนักงานต้องไม่เหมือนกัน", no_employee: "ไม่พบพนักงานคนนี้แล้ว",
    network: "ติดต่อฐานข้อมูลไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่", key: "เชื่อมต่อไม่ได้: Project URL หรือคีย์ไม่ถูกต้อง" };

  let conf = null, session = null, timer = null, paused = false, lastDash = null, currentDesk = null;

  // ---------- การเชื่อมต่อ ----------
  function loadConf() {
    const c = window.PG_CONFIG || {};
    if (c.supabaseUrl && c.supabaseKey) return { url: c.supabaseUrl.replace(/\/+$/, ""), key: c.supabaseKey };
    try { const s = JSON.parse(localStorage.getItem(CONF_KEY) || "null"); if (s && s.url && s.key) return s; } catch (e) { /* ignore */ }
    return null;
  }
  async function rpc(fn, body) {
    let res;
    try {
      res = await fetch(`${conf.url}/rest/v1/rpc/${fn}`, { method: "POST",
        headers: { "Content-Type": "application/json", apikey: conf.key, Authorization: "Bearer " + conf.key },
        body: JSON.stringify(body || {}) });
    } catch (e) { throw new Error("network"); }
    if (res.status === 401 || res.status === 403) throw new Error("key");
    if (!res.ok) throw new Error("network");
    return res.json();
  }
  const errText = (e) => ERR[e] || ERR[e && e.message] || "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";

  // ---------- หน้า ----------
  function show(view) {
    document.querySelectorAll(".view").forEach((v) => { v.hidden = v.id !== "view-" + view; });
    $("btn-logout").hidden = !session;
    const h = document.querySelector(`#view-${view} h1`); if (h) h.focus();
    window.scrollTo(0, 0);
  }
  function say(text) { $("status").textContent = text; clearTimeout(say.t); say.t = setTimeout(() => { $("status").textContent = ""; }, 6000); }
  function fieldErr(input, msg) { $(input.id + "-err").textContent = msg || ""; if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid"); return !msg; }

  // ---------- ตั้งค่าการเชื่อมต่อ ----------
  $("setup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = $("sb-url").value.trim().replace(/\/+$/, ""), key = $("sb-key").value.trim();
    const okUrl = fieldErr($("sb-url"), /^https:\/\/[^\s/]+$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url) ? "" : "ใส่ Project URL เช่น https://xxxx.supabase.co");
    const okKey = fieldErr($("sb-key"), key.length >= 20 ? "" : "ใส่คีย์ publishable หรือ anon");
    if (!okUrl) return $("sb-url").focus(); if (!okKey) return $("sb-key").focus();
    if (/^sb_secret_|service_role/.test(key)) { fieldErr($("sb-key"), "นี่คือคีย์ลับ ห้ามใช้ในหน้าเว็บ ใช้คีย์ publishable หรือ anon"); return $("sb-key").focus(); }
    conf = { url, key };
    try { await rpc("pg_list_companies"); } catch (err) { $("setup-err").textContent = errText(err); return; }
    try { localStorage.setItem(CONF_KEY, JSON.stringify(conf)); } catch (err) { /* ignore */ }
    $("setup-err").textContent = ""; startLogin();
  });

  // ---------- ล็อกอิน / สร้างบริษัท ----------
  const tabs = [$("tab-login"), $("tab-create")];
  function selectTab(tab, focus) {
    tabs.forEach((t) => { const on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; $(t.getAttribute("aria-controls")).hidden = !on; });
    if (focus) tab.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); selectTab(tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length], true); }
    });
  });
  async function startLogin(preselect) {
    show("login");
    const sel = $("login-company");
    sel.innerHTML = `<option value="">กำลังโหลด…</option>`;
    try {
      const list = await rpc("pg_list_companies");
      sel.innerHTML = `<option value="">— เลือกบริษัท —</option>` + list.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
      if (preselect) sel.value = preselect;
      if (!list.length) selectTab($("tab-create"));
    } catch (err) { sel.innerHTML = `<option value="">โหลดรายชื่อไม่ได้</option>`; $("login-err").textContent = errText(err); }
  }
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const sel = $("login-company"), pw = $("login-password");
    const a = fieldErr(sel, sel.value ? "" : "เลือกบริษัท"), b = fieldErr(pw, pw.value ? "" : "ใส่รหัสผู้ดูแล");
    if (!a) return sel.focus(); if (!b) return pw.focus();
    $("btn-login").disabled = true; $("login-err").textContent = "";
    try {
      const r = await rpc("pg_admin_dashboard", { p_company: sel.value, p_password: pw.value, p_days: 7 });
      if (!r.ok) { $("login-err").textContent = errText(r.error); pw.focus(); return; }
      session = { company: sel.value, password: pw.value, name: r.company };
      pw.value = ""; openDash(r);
    } catch (err) { $("login-err").textContent = errText(err); }
    finally { $("btn-login").disabled = false; }
  });
  $("create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = $("co-name"), a1 = $("co-admin"), a2 = $("co-admin2"), j = $("co-join");
    const checks = [
      fieldErr(n, n.value.trim().length >= 2 ? "" : "ใส่ชื่อบริษัท (อย่างน้อย 2 ตัวอักษร)") || n,
      fieldErr(a1, a1.value.length >= 8 ? "" : "รหัสผู้ดูแลต้องยาวอย่างน้อย 8 ตัว") || a1,
      fieldErr(a2, a2.value === a1.value ? "" : "รหัสยืนยันไม่ตรงกัน") || a2,
      fieldErr(j, j.value.length < 6 ? "รหัสพนักงานต้องยาวอย่างน้อย 6 ตัว" : j.value === a1.value ? "ต้องไม่เหมือนรหัสผู้ดูแล" : "") || j];
    const bad = checks.find((x) => x !== true); if (bad) return bad.focus();
    $("btn-create").disabled = true; $("create-err").textContent = "";
    try {
      const r = await rpc("pg_create_company", { p_name: n.value.trim(), p_admin_pw: a1.value, p_join_pw: j.value });
      if (!r.ok) { $("create-err").textContent = errText(r.error); return; }
      say(`สร้าง “${r.name}” แล้ว · แจ้งพนักงาน: เลือกบริษัทนี้ในหน้าเว็บของบอร์ด แล้วใส่รหัสพนักงาน`);
      const d = await rpc("pg_admin_dashboard", { p_company: r.id, p_password: a1.value, p_days: 7 });
      session = { company: r.id, password: a1.value, name: r.name };
      [n, a1, a2, j].forEach((x) => { x.value = ""; });
      openDash(d);
    } catch (err) { $("create-err").textContent = errText(err); }
    finally { $("btn-create").disabled = false; }
  });
  $("btn-logout").addEventListener("click", () => { session = null; stopTimer(); lastDash = null; startLogin(); say("ออกจากระบบแล้ว"); });

  // ---------- ภาพรวม ----------
  const hm = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h} ชม. ${m} น.` : `${m} น.`; };
  const pct = (a, b) => (b ? Math.round((a * 100) / b) + "%" : "–");
  function personLabel(e) { return e.name ? esc(e.name) : `โต๊ะ #${esc(e.desk)}`; }
  function statusPill(e) {
    if (!e.online) return `<span class="pill na">⚪ ออฟไลน์</span>`;
    if (!e.present) return `<span class="pill na">⚪ ${POSTURE.away}</span>`;
    return e.is_bad ? `<span class="pill bad">⚠️ ${esc(POSTURE[e.posture] || e.posture || "ท่าไม่ถูกต้อง")}</span>`
      : `<span class="pill good">✅ ${esc(POSTURE[e.posture] || "นั่งถูกท่า")}</span>`;
  }
  function openDash(d) { $("brand-sub").textContent = `Dashboard · ${session.name}`; show("dash"); renderDash(d); startTimer(); }
  function renderDash(d) {
    lastDash = d;
    const emps = d.employees || [];
    const online = emps.filter((e) => e.online), sitting = online.filter((e) => e.present), bad = sitting.filter((e) => e.is_bad);
    const today = emps.reduce((a, e) => { const t = e.today || {}; a.sit += t.sit_s || 0; a.good += t.good_s || 0; a.alerts += t.alerts || 0; return a; }, { sit: 0, good: 0, alerts: 0 });
    $("kpis").innerHTML = [
      ["พนักงานทั้งหมด", emps.length], ["ออนไลน์ตอนนี้", online.length], ["นั่งอยู่ตอนนี้", sitting.length],
      ["นั่งผิดท่าตอนนี้", bad.length], ["นั่งถูกท่าวันนี้", pct(today.good, today.sit)], ["การเตือนวันนี้", today.alerts]]
      .map(([k, v]) => `<div class="kpi"><span class="v">${esc(v)}</span><span class="k">${esc(k)}</span></div>`).join("");
    $("dash-updated").textContent = `อัปเดตล่าสุด ${new Date().toLocaleTimeString("th-TH")}${paused ? " · หยุดอัปเดตอัตโนมัติอยู่" : ""}`;
    chart($("trend-chart"), (d.days || []).map((x) => ({ day: x.day, good: x.good_s, bad: x.bad_s })));
    $("trend-table").innerHTML = `<caption class="visually-hidden">ท่านั่งรายวันทั้งบริษัท</caption><thead><tr><th scope="col">วัน</th><th scope="col">นั่งรวม</th><th scope="col">ถูกท่า</th><th scope="col">ผิดท่า</th><th scope="col">เตือน</th><th scope="col">โต๊ะ</th></tr></thead><tbody>` +
      (d.days || []).map((x) => `<tr><th scope="row">${esc(fmtDay(x.day))}</th><td>${hm(x.sit_s)}</td><td>${hm(x.good_s)} (${pct(x.good_s, x.sit_s)})</td><td>${hm(x.bad_s)}</td><td>${esc(x.alerts)}</td><td>${esc(x.desks)}</td></tr>`).join("") + "</tbody>";
    const sel = $("dept-filter"), keep = sel.value;
    const depts = [...new Set(emps.map((e) => e.department))].sort();
    sel.innerHTML = `<option value="">ทุกแผนก</option>` + depts.map((x) => `<option>${esc(x)}</option>`).join("");
    sel.value = depts.includes(keep) ? keep : "";
    renderEmpTable();
  }
  function renderEmpTable() {
    const f = $("dept-filter").value, emps = ((lastDash && lastDash.employees) || []).filter((e) => !f || e.department === f);
    $("emp-table").innerHTML = `<caption class="visually-hidden">รายชื่อพนักงานและสถานะท่านั่ง</caption><thead><tr><th scope="col">พนักงาน</th><th scope="col">แผนก</th><th scope="col">ตอนนี้</th><th scope="col">ระยะตา–จอ</th><th scope="col">นั่งวันนี้</th><th scope="col">ถูกท่าวันนี้</th><th scope="col">เตือนวันนี้</th><th scope="col"><span class="visually-hidden">รายละเอียด</span></th></tr></thead><tbody>` +
      (emps.length ? emps.map((e) => { const t = e.today || {};
        return `<tr><th scope="row">${personLabel(e)}</th><td>${esc(e.department)}</td><td>${statusPill(e)}</td>
          <td>${e.online && e.present && e.screen_cm != null ? esc(e.screen_cm) + " ซม." : "–"}</td><td>${hm(t.sit_s)}</td>
          <td>${pct(t.good_s, t.sit_s)}</td><td>${esc(t.alerts || 0)}</td>
          <td><button type="button" class="btn small" data-desk="${esc(e.desk)}" aria-label="ดูรายละเอียด ${e.name ? esc(e.name) : "โต๊ะ " + esc(e.desk)}">ดู</button></td></tr>`; }).join("")
        : `<tr><td colspan="8">ยังไม่มีพนักงาน · แจ้งพนักงานให้เลือกบริษัทนี้ในหน้าเว็บของบอร์ดแล้วใส่รหัสพนักงาน</td></tr>`) + "</tbody>";
  }
  $("dept-filter").addEventListener("change", renderEmpTable);
  $("emp-table").addEventListener("click", (e) => { const b = e.target.closest("button[data-desk]"); if (b) openEmp(b.dataset.desk); });

  async function refresh() {
    if (!session) return;
    try {
      if (currentDesk) return await loadEmp(currentDesk);
      const d = await rpc("pg_admin_dashboard", { p_company: session.company, p_password: session.password, p_days: 7 });
      if (!d.ok) { session = null; stopTimer(); startLogin(); say(errText(d.error) + " · กรุณาเข้าสู่ระบบใหม่"); return; }
      renderDash(d);
    } catch (err) { $("dash-updated").textContent = errText(err); }
  }
  function startTimer() { stopTimer(); if (!paused) timer = setInterval(refresh, REFRESH_MS); }
  function stopTimer() { clearInterval(timer); timer = null; }
  $("btn-refresh").addEventListener("click", refresh);
  $("btn-pause").addEventListener("click", () => {
    paused = !paused;
    $("btn-pause").setAttribute("aria-pressed", String(paused));
    $("btn-pause").textContent = paused ? "อัปเดตอัตโนมัติต่อ" : "หยุดอัปเดตอัตโนมัติ";
    if (paused) stopTimer(); else { startTimer(); refresh(); }
  });
  $("btn-delete-company").addEventListener("click", async () => {
    if (!confirm(`ลบบริษัท “${session.name}” และข้อมูลพนักงานทั้งหมดถาวร?`)) return;
    try {
      const r = await rpc("pg_admin_delete_company", { p_company: session.company, p_password: session.password });
      if (!r.ok) return say(errText(r.error));
      session = null; stopTimer(); startLogin(); say("ลบบริษัทแล้ว");
    } catch (err) { say(errText(err)); }
  });

  // ---------- รายบุคคล ----------
  async function openEmp(desk) { currentDesk = desk; show("emp"); await loadEmp(desk); }
  async function loadEmp(desk) {
    const r = await rpc("pg_admin_employee", { p_company: session.company, p_password: session.password, p_desk: desk, p_days: 14 });
    if (!r.ok) { say(errText(r.error)); currentDesk = null; show("dash"); return; }
    const who = r.name || `โต๊ะ #${r.desk}`;
    $("h-emp-detail").textContent = who;
    const live = r.live || {};
    $("emp-meta").innerHTML = `แผนก ${esc(r.department)} · เข้าร่วมเมื่อ ${esc(new Date(r.joined_at).toLocaleDateString("th-TH"))} · ตอนนี้ ${statusPill(Object.assign({}, live, { online: !!live.online }))}` +
      (r.name ? "" : ` <span class="hint">(พนักงานไม่ยินยอมให้แสดงชื่อ)</span>`);
    const days = r.days || [];
    const sum = days.reduce((a, x) => ({ sit: a.sit + x.sit_s, good: a.good + x.good_s, bad: a.bad + x.bad_s, alerts: a.alerts + x.alerts, breaks: a.breaks + x.breaks }), { sit: 0, good: 0, bad: 0, alerts: 0, breaks: 0 });
    $("emp-kpis").innerHTML = [["นั่งรวม 14 วัน", hm(sum.sit)], ["นั่งถูกท่า", pct(sum.good, sum.sit)], ["ถูกเตือน", sum.alerts + " ครั้ง"], ["ลุกพัก", sum.breaks + " ครั้ง"]]
      .map(([k, v]) => `<div class="kpi"><span class="v">${esc(v)}</span><span class="k">${esc(k)}</span></div>`).join("");
    chart($("emp-chart"), days.map((x) => ({ day: x.day, good: x.good_s, bad: x.bad_s })));
    $("emp-days").innerHTML = `<caption class="visually-hidden">สถิติรายวันของ ${esc(who)}</caption><thead><tr><th scope="col">วัน</th><th scope="col">นั่งรวม</th><th scope="col">ถูกท่า</th><th scope="col">ผิดท่า</th><th scope="col">เตือน</th><th scope="col">พัก</th></tr></thead><tbody>` +
      (days.length ? days.slice().reverse().map((x) => `<tr><th scope="row">${esc(fmtDay(x.day))}</th><td>${hm(x.sit_s)}</td><td>${hm(x.good_s)} (${pct(x.good_s, x.sit_s)})</td><td>${hm(x.bad_s)}</td><td>${esc(x.alerts)}</td><td>${esc(x.breaks)}</td></tr>`).join("")
        : `<tr><td colspan="6">ยังไม่มีข้อมูล</td></tr>`) + "</tbody>";
  }
  $("btn-back").addEventListener("click", () => { currentDesk = null; show("dash"); refresh(); });
  $("btn-remove-emp").addEventListener("click", async () => {
    if (!confirm("นำพนักงานคนนี้ออกและลบสถิติทั้งหมดของโต๊ะนี้?")) return;
    try {
      const r = await rpc("pg_admin_remove", { p_company: session.company, p_password: session.password, p_desk: currentDesk });
      if (!r.ok) return say(errText(r.error));
      currentDesk = null; show("dash"); say("นำพนักงานออกแล้ว"); refresh();
    } catch (err) { say(errText(err)); }
  });

  // ---------- กราฟ (SVG วาดเอง: ถูกท่า = สีทึบ, ผิดท่า = ลายเส้น → ไม่สื่อด้วยสีอย่างเดียว) ----------
  function fmtDay(d) { return new Date(d + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" }); }
  function chart(el, rows) {
    el.classList.add("chart");
    if (!rows.length) { el.innerHTML = `<p class="hint">ยังไม่มีข้อมูล</p>`; return; }
    const W = 640, H = 220, P = { l: 44, r: 8, t: 10, b: 36 };
    const max = Math.max(1, ...rows.map((r) => (r.good + r.bad) / 3600));
    const step = Math.ceil(max / 4) || 1, top = step * 4;
    const bw = Math.min(56, ((W - P.l - P.r) / rows.length) * 0.6), gap = (W - P.l - P.r) / rows.length;
    const y = (h) => P.t + (H - P.t - P.b) * (1 - h / top);
    let g = `<defs><pattern id="hatch-${el.id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--bad-bg)"/><rect width="3" height="6" fill="var(--bad)"/></pattern></defs>`;
    for (let i = 0; i <= 4; i++) { const v = step * i; g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)"/><text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="var(--muted)">${v} ชม.</text>`; }
    rows.forEach((r, i) => {
      const x = P.l + gap * i + (gap - bw) / 2, gh = r.good / 3600, bh = r.bad / 3600;
      g += `<rect x="${x}" y="${y(gh)}" width="${bw}" height="${y(0) - y(gh)}" fill="var(--good)"/>`;
      g += `<rect x="${x}" y="${y(gh + bh)}" width="${bw}" height="${y(gh) - y(gh + bh)}" fill="url(#hatch-${el.id})" stroke="var(--bad)"/>`;
      g += `<text x="${x + bw / 2}" y="${H - 14}" text-anchor="middle" font-size="12" fill="var(--muted)">${esc(new Date(r.day + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" }))}</text>`;
    });
    const summary = rows.map((r) => `${fmtDay(r.day)} ถูกท่า ${hm(r.good)} ผิดท่า ${hm(r.bad)}`).join(", ");
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc("กราฟชั่วโมงนั่งถูกท่าและผิดท่ารายวัน: " + summary)}">${g}</svg>
      <p class="legend"><span><span class="sw good" aria-hidden="true"></span>ถูกท่า (สีทึบ)</span><span><span class="sw bad" aria-hidden="true"></span>ผิดท่า (ลายเส้น)</span></p>`;
  }

  // ---------- เริ่ม ----------
  conf = loadConf();
  if (conf) startLogin(); else show("setup");
})();
