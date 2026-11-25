/* ============================================================
 * Posture Guard — ตัวเชื่อมเว็บออนไลน์ ↔ Supabase (เขียนและทดสอบแล้ว ห้ามแก้ชื่อฟังก์ชัน)
 * ใช้: <script src="config.js"></script><script src="js/api.js"></script> แล้วเรียก PG.xxx()
 * ทุกฟังก์ชันคืน Promise ของ object ที่มี ok: true/false (ไม่ throw) · error: "unpaired" | "bad_code" |
 *   "wrong_password" | "locked" | "no_company" | "bad_request" | "network" | "no_config"
 * โหมดจำลอง: เปิดหน้าเว็บด้วย ?mock=1 (หรือยังไม่ได้ใส่ config.js) → ไม่ต้องมีบอร์ด/Supabase
 *   รหัสจับคู่ทดลอง: TEST-TEST-22 · บริษัททดลอง "บริษัทตัวอย่าง" รหัสพนักงาน: join1234
 * ============================================================ */
(function () {
  "use strict";
  const TOKEN_KEY = "pg_viewer_token";
  const cfg = window.PG_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const HAS_CFG = !!(cfg.supabaseUrl && cfg.supabaseKey);
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
  // จุดบอด: ถ้าขึ้นเว็บจริงแล้วลืมใส่ config.js ห้ามแอบใช้ข้อมูลจำลอง (คนจะนึกว่าเครื่องทำงาน) → แจ้ง no_config แทน
  const MOCK = params.get("mock") === "1" || (!HAS_CFG && LOCAL);
  const NO_CONFIG = !MOCK && !HAS_CFG;

  const store = {
    get() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } },
    set(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* storage ปิด */ } },
  };

  async function rpc(fn, body) {
    if (MOCK) return mock(fn, body || {});
    if (NO_CONFIG) return { ok: false, error: "no_config" };
    const url = cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/rpc/" + fn;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: cfg.supabaseKey, Authorization: "Bearer " + cfg.supabaseKey },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, error: "network", detail: (data && data.message) || ("HTTP " + res.status) };
      return data;
    } catch (e) {
      return { ok: false, error: "network", detail: String(e) };
    }
  }

  async function withToken(fn, body) {
    const token = store.get();
    if (!token) return { ok: false, error: "unpaired" };
    const r = await rpc(fn, Object.assign({ p_token: token }, body || {}));
    if (r && r.error === "unpaired") store.set("");      // เครื่องถูกยกเลิกจับคู่ → กลับไปหน้าจับคู่
    return r;
  }

  const PG = {
    mock: MOCK,
    noConfig: NO_CONFIG,
    /** จับคู่เว็บกับเครื่อง ด้วยรหัส 10 ตัวที่เครื่อง (มีขีด/ช่องว่าง/ตัวเล็กได้) */
    async pair(code) {
      const r = await rpc("pg_pair", { p_code: String(code || "") });
      if (r && r.ok) store.set(r.token);
      return r;
    },
    isPaired() { return !!store.get(); },
    /** ข้อมูลทั้งหมดของเครื่อง: {ok, desk, online, last_seen, live{...}, live_age_s, settings{...},
     *  settings_version, pending_cmds, company{id,name,department,display_name,share_name}|null,
     *  days[{date, sit_s, good_s, bad_s, alerts, breaks}] เก่า→ใหม่} */
    me(days) { return withToken("pg_me", { p_days: days || 14 }); },
    /** สถานะสดแบบเบา (ท่าปัจจุบัน/ออนไลน์) — ดึงถี่ได้ */
    live() { return withToken("pg_me_live", {}); },
    /** ตั้งค่า (ส่งเฉพาะที่แก้): bad_seconds 5–600, sit_minutes 10–180, nudge_seconds 0–120,
     *  screen_min 30–90, screen_max 50–150, fusion_tol 3–30, muted, eye_auto, push_enabled (bool), lang "th"|"en" */
    saveSettings(obj) { return withToken("pg_me_settings", { p_settings: obj || {} }); },
    /** สั่งเครื่อง: "calibrate" | "test_buzzer" | "relax_toggle" | "relax_reset" (เครื่องทำภายใน ~10 วิ) */
    command(cmd) { return withToken("pg_me_command", { p_cmd: cmd }); },
    /** รายชื่อบริษัท [{id, name}] */
    async listCompanies() {
      const r = await rpc("pg_list_companies", {});
      return Array.isArray(r) ? { ok: true, companies: r } : { ok: false, error: (r && r.error) || "network", companies: [] };
    },
    /** เข้าร่วมบริษัท (shareName = ยินยอมให้บริษัทเห็นชื่อ ตาม PDPA) */
    join(companyId, password, displayName, department, shareName) {
      return withToken("pg_me_join", { p_company: companyId, p_password: password, p_display_name: displayName || null,
        p_department: department || null, p_share_name: !!shareName });
    },
    leave() { return withToken("pg_me_leave", {}); },
    async unpair() { const r = await withToken("pg_me_unpair", {}); store.set(""); return r || { ok: true }; },
    /** ลิงก์ติดตามแจ้งเตือนบนมือถือ (แอป ntfy) */
    ntfyUrl(topic) { return topic ? "https://ntfy.sh/" + encodeURIComponent(topic) : ""; },
  };

  // ---------------- โหมดจำลอง (ทำงานเหมือน Supabase + บอร์ดจริง) ----------------
  const M = {
    token: "", settings: { bad_seconds: 15, sit_minutes: 50, nudge_seconds: 10, screen_min: 50, screen_max: 100,
      fusion_tol: 8, muted: false, eye_auto: true, push_enabled: false, lang: "th" },
    version: 1, company: null, relax: { running: true, left: 1200 }, t0: Date.now(),
  };
  function mockLive() {
    const seq = ["good", "good", "forward", "good", "backward", "away"];
    const k = Math.floor((Date.now() - M.t0) / 8000) % seq.length, p = seq[k];
    const present = p !== "away";
    if (M.relax.running) M.relax.left = Math.max(0, 1200 - Math.floor((Date.now() - M.t0) / 1000) % 1201);
    const hours = Array.from({ length: 24 }, (_, h) => h >= 9 && h <= new Date().getHours() ? [2400, 600, 1] : [0, 0, 0]);
    return { present, posture: p, posture_source: present ? "ai_us" : "sensors", confidence: present ? 0.91 : 0,
      is_bad: p === "forward" || p === "backward", screen_cm: present ? (p === "forward" ? 44 : 62) : null,
      chest_cm: present ? 70 : null, bad_for: p === "forward" || p === "backward" ? 12 : 0, sit_for: present ? 1800 : 0,
      nudge: p === "forward" ? "visual" : "none", alert: 0, calibrated: true, camera: { status: "ok", person: present },
      fusion: present ? { good: 0.05, forward: 0.05, backward: 0.05, [p]: 0.85 } : null,
      relax: { running: M.relax.running, left: M.relax.left, total: 1200 },
      push_topic: M.settings.push_enabled ? "posture-guard-demo1234" : "", today: new Date().toISOString().slice(0, 10),
      hours, ts: Math.floor(Date.now() / 1000) };
  }
  function mockDays(n) {
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(Date.now() - (n - 1 - i) * 86400000);
      const sit = 3600 * (4 + ((i * 7) % 5)), bad = Math.round(sit * (0.15 + ((i * 3) % 4) * 0.05));
      return { date: d.toISOString().slice(0, 10), sit_s: sit, good_s: sit - bad, bad_s: bad, alerts: 2 + (i % 4), breaks: 3 };
    });
  }
  async function mock(fn, b) {
    await new Promise((r) => setTimeout(r, 250));
    const authed = () => b.p_token && b.p_token === M.token;
    switch (fn) {
      case "pg_pair":
        if (String(b.p_code).toUpperCase().replace(/[^A-Z0-9]/g, "") !== "TESTTEST22") return { ok: false, error: "bad_code" };
        M.token = "f".repeat(48); return { ok: true, token: M.token, desk: "a1b2c3" };
      case "pg_me":
        if (!authed()) return { ok: false, error: "unpaired" };
        return { ok: true, desk: "a1b2c3", online: true, last_seen: new Date().toISOString(), live: mockLive(), live_age_s: 3,
          settings: Object.assign({}, M.settings), settings_version: M.version, pending_cmds: 0, company: M.company,
          days: mockDays(Math.min(30, Math.max(1, b.p_days || 14))) };
      case "pg_me_live":
        if (!authed()) return { ok: false, error: "unpaired" };
        return { ok: true, online: true, last_seen: new Date().toISOString(), live: mockLive(), live_age_s: 0 };
      case "pg_me_settings":
        if (!authed()) return { ok: false, error: "unpaired" };
        Object.assign(M.settings, b.p_settings || {}); M.version++;
        return { ok: true, settings: Object.assign({}, M.settings), settings_version: M.version };
      case "pg_me_command":
        if (!authed()) return { ok: false, error: "unpaired" };
        if (!["calibrate", "test_buzzer", "relax_toggle", "relax_reset"].includes(b.p_cmd)) return { ok: false, error: "bad_request" };
        if (b.p_cmd === "relax_toggle") M.relax.running = !M.relax.running;
        if (b.p_cmd === "relax_reset") { M.relax.left = 1200; M.t0 = Date.now(); }
        return { ok: true, id: 1 };
      case "pg_list_companies": return [{ id: "co_000000000000000001", name: "บริษัทตัวอย่าง" }];
      case "pg_me_join":
        if (!authed()) return { ok: false, error: "unpaired" };
        if (b.p_password !== "join1234") return { ok: false, error: "wrong_password" };
        M.company = { id: b.p_company, name: "บริษัทตัวอย่าง", department: b.p_department || "ทั่วไป",
          display_name: b.p_display_name, share_name: !!b.p_share_name };
        return { ok: true, company: b.p_company, name: "บริษัทตัวอย่าง", desk: "a1b2c3" };
      case "pg_me_leave": M.company = null; return { ok: true };
      case "pg_me_unpair": M.token = ""; return { ok: true };
      default: return { ok: false, error: "bad_request" };
    }
  }
  window.PG = PG;
})();
