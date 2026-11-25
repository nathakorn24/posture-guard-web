/* Don't let your boss kill you back — เว็บแอปออนไลน์ (ใช้ PG.* จาก js/api.js เท่านั้น) */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const POLL_MS = 5000;

  // ================= ข้อความ TH / EN =================
  const I18N = {
    th: {
      skip: "ข้ามไปเนื้อหาหลัก", conn_wait: "กำลังเชื่อมต่อ…", conn_on: "เครื่องออนไลน์ · อัปเดต {s} วิที่แล้ว",
      conn_off: "เครื่องออฟไลน์ · ข้อมูลล่าสุด {t}", conn_never: "เครื่องยังไม่เคยส่งข้อมูล", conn_mock: "โหมดจำลอง",
      help_open: "วิธีการใช้งาน", hey: "Hey! คุณนั่งผิดท่า", net_err: "เชื่อมต่อไม่ได้ กำลังลองใหม่…",
      pair_title: "เชื่อมต่อกับเครื่องของคุณ",
      pair_desc: "กรอกรหัสจับคู่ 10 ตัวที่สติกเกอร์บนเครื่อง หรือในหน้าเครื่อง (ตั้งค่า → บัญชี) ทำครั้งเดียวต่อเบราว์เซอร์",
      pair_label: "รหัสจับคู่", pair_btn: "เชื่อมต่อ", pair_busy: "กำลังเชื่อมต่อ…", pair_mock: "โหมดจำลอง: ใช้รหัส TEST-TEST-22",
      no_config: "เว็บนี้ยังไม่ได้ตั้งค่าเชื่อมฐานข้อมูล (config.js ว่าง) — ผู้ดูแลต้องใส่ Supabase URL และคีย์ publishable ก่อน",
      mock_banner: "โหมดสาธิต — ข้อมูลในหน้านี้เป็นข้อมูลจำลอง ไม่ได้มาจากเครื่องจริง",
      app_h: "แอปนี้", report_send: "ส่งออกสถิติ", ch_h: "ช่องทางแจ้งเตือน", rule_h: "เกณฑ์ท่านั่ง", desk_h: "เครื่องบนโต๊ะ",
      noti_now: "มีผลทันทีบนเบราว์เซอร์นี้ · เด้งเฉพาะตอนเปิดหน้านี้ไว้",
      noti_ios: "บน iPhone/iPad: กดปุ่มแชร์ → \"เพิ่มไปยังหน้าจอโฮม\" แล้วเปิดแอปจากหน้าจอโฮมก่อน จึงจะเปิดแจ้งเตือนได้ (หรือใช้ ntfy ด้านล่างแทน)",
      calib_row: "นั่งหลังชิดพนัก ตัวตรง แล้วกด เครื่องวัด 10 วินาที", test_row: "เครื่องจะปี๊บภายใน ~10 วินาที", start: "เริ่ม", test: "ทดสอบ",
      pair_bad: "รหัสไม่ถูกต้อง ตรวจตัวอักษรอีกครั้ง (รหัสไม่มีตัว O, I, 0, 1)", pair_len: "รหัสต้องมี 10 ตัว",
      pair_net: "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง", hr_link: "สำหรับฝ่ายบุคคล (HR) →",
      nav: "เมนูหลัก", nav_home: "หน้าแรก", nav_stats: "สถิติ", nav_settings: "ตั้งค่า",
      status_h: "สถานะท่านั่ง", dist_h: "ห่างหน้าจอ", cm: "ซม.", bad_for: "ผิดท่าต่อเนื่อง", sit_for: "นั่งต่อเนื่อง", judged: "ตัดสินโดย",
      p_good: "นั่งถูกต้อง", p_forward: "โน้มตัว / ยื่นหน้าไปข้างหน้า", p_backward: "เอนหลังมากเกินไป / นั่งไหลลง",
      p_away: "ยังไม่มีคนนั่ง", p_unknown: "กำลังวิเคราะห์…", badge_good: "✓ ดี", badge_bad: "✗ ผิดท่า",
      cap_good: "ท่าที่ถูกต้อง", cap_forward: "โน้มไปข้างหน้า", cap_backward: "เอนหลัง", cap_away: "ไม่มีคนนั่ง", cap_unknown: "กำลังวิเคราะห์",
      pose_alt: "รูปคนนั่ง: {p}", too_close: "ใกล้เกินไป (ควร ≥ {n} ซม.)", too_far: "ไกลเกินไป (ควร ≤ {n} ซม.)", dist_ok: "ระยะพอดี",
      src_ai_us: "กล้อง + ultrasonic ({c}%)", src_ai: "กล้องด้านข้าง ({c}%)", src_us: "ultrasonic ({c}%)", src_rules: "เกณฑ์ระยะ OSHA", src_sensors: "เซนเซอร์",
      calib_h: "ยังไม่ได้ปรับเทียบท่า",
      calib_desc: "นั่งหลังชิดพนัก ตัวตรง มองจอตรงๆ แล้วกดปุ่ม เครื่องจะวัดค้างไว้ 10 วินาที แล้วปี๊บเมื่อเสร็จ ultrasonic จึงช่วยตัดสินได้",
      calib_btn: "ปรับเทียบท่า",
      relax_h: "มาเริ่ม relax กัน!!", relax_info: "เราจะ relax ยังไง", relax_rule: "กฎ 20-20-20: ทุก 20 นาที มองไกล 6 เมตร นาน 20 วินาที",
      relax_pause: "หยุดนับเวลา", relax_play: "เริ่มนับเวลา", relax_reset: "เริ่มนับใหม่",
      relax_running: "กำลังนับ ครบแล้วเครื่องจะปี๊บเตือนให้พักสายตา", relax_paused: "หยุดนับอยู่ กด ▶ เพื่อเริ่ม",
      relax_due: "ถึงเวลาพักสายตาแล้ว! มองไกล 6 เมตร 20 วินาที", test_buzzer: "ทดสอบเสียงเครื่อง",
      cmd_calibrate: "ส่งคำสั่งแล้ว นั่งตรง หลังชิดพนัก ค้างไว้ 10 วินาที เครื่องจะปี๊บเมื่อเสร็จ",
      cmd_test_buzzer: "ส่งคำสั่งแล้ว เครื่องจะปี๊บภายใน ~10 วินาที", cmd_relax_toggle: "ส่งคำสั่งแล้ว", cmd_relax_reset: "เริ่มนับ 20 นาทีใหม่แล้ว",
      cmd_fail: "ส่งคำสั่งไม่สำเร็จ ลองใหม่อีกครั้ง",
      range: "ช่วงเวลา", daily: "รายวัน", weekly: "รายสัปดาห์", chart_day: "วันนี้รายชั่วโมง", chart_week: "แนวโน้ม 7 วัน (ชั่วโมง)",
      good_time: "ท่าถูก", bad_time: "ท่าผิด", as_table: "แสดงเป็นตาราง", total_h: "เวลานั่งทั้งหมด/วัน",
      chart_alt_week: "กราฟ 7 วัน: {s}", chart_alt_day: "กราฟรายชั่วโมงวันนี้: ท่าถูกรวม {g} ท่าผิดรวม {b}",
      tip: "{d} · ✓ ถูก {g} / ✗ ผิด {b} · เตือน {a} ครั้ง", day_sub: "ท่าถูก {p}% · เตือน {a} ครั้ง · พัก {r} ครั้ง",
      col_day: "วัน", col_sit: "นั่งทั้งหมด", col_good: "ท่าถูก", col_bad: "ท่าผิด", col_alerts: "เตือน", col_hour: "ชั่วโมง",
      no_data: "ยังไม่มีข้อมูล", hm: "{h} ชม. {m} น.", m_only: "{m} น.", s_only: "{s} วิ",
      browser_h: "บนเบราว์เซอร์นี้", font: "ขนาดตัวอักษร", font_n: "ปกติ", font_l: "ใหญ่", font_xl: "ใหญ่มาก",
      theme: "ธีม", light: "สว่าง", dark: "มืด", web_noti: "แจ้งเตือนบนเว็บ",
      web_noti_hint: "แจ้งเตือนเมื่อนั่งผิดท่าขณะเปิดหน้านี้ไว้ (เครื่องเตือนด้วยเสียงอยู่แล้ว ไม่ต้องเปิดเว็บค้าง)",
      noti_denied: "เบราว์เซอร์ไม่อนุญาตการแจ้งเตือน เปิดได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์",
      device_h: "ของเครื่อง", sound_on: "เสียงเตือนที่เครื่อง", eye_auto: "พักสายตา 20-20-20 อัตโนมัติ",
      bad_seconds: "เตือนเมื่อผิดท่าต่อเนื่อง (วินาที)", sit_minutes: "เตือนให้ลุกพักทุก (นาที)",
      screen_range: "ระยะจอที่เหมาะ (ซม.) · OSHA แนะนำ 50–100", min: "ใกล้สุด", max: "ไกลสุด",
      push: "แจ้งเตือนเข้ามือถือ (ntfy)", push_off: "เปิดแล้วจะได้แจ้งเตือนในมือถือแม้ปิดหน้าจอ (ผ่านแอป ntfy ฟรี)",
      push_wait: "บันทึกแล้ว รอเครื่องสร้างช่องแจ้งเตือน (~10 วินาที)",
      push_on: "ติดตั้งแอป ntfy แล้วกดติดตามช่องนี้:", push_link: "เปิดช่องแจ้งเตือน",
      save: "บันทึก", saving: "กำลังบันทึก…", saved: "บันทึกแล้ว เครื่องจะใช้ค่าใหม่ภายใน ~10 วินาที", save_fail: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง",
      err_range: "ใส่ตัวเลข {a}–{b}", err_screen: "ระยะใกล้สุดต้องน้อยกว่าไกลสุด",
      account_h: "บัญชีของฉัน", acc_personal: "ใช้ส่วนตัว · บริษัทไม่เห็นข้อมูลของคุณ",
      acc_company: "พนักงานบริษัท {n} · แผนก {d}", acc_share_on: "บริษัทเห็นชื่อ “{n}”", acc_share_off: "บริษัทเห็นแค่รหัสโต๊ะ",
      acc_desk: "รหัสโต๊ะ: {d}", join: "เข้าร่วมบริษัท", rejoin: "แก้ข้อมูลบริษัท", leave: "ออกจากบริษัท", unpair: "ยกเลิกจับคู่เบราว์เซอร์นี้",
      join_h: "เข้าร่วมบริษัท", company: "บริษัท", join_pass: "รหัสผ่านพนักงาน (จากฝ่ายบุคคล)", dept: "แผนก",
      share: "ยินยอมให้บริษัทเห็นชื่อและสถิติของฉัน (PDPA) — ถ้าไม่ติ๊ก บริษัทจะเห็นแค่รหัสโต๊ะ", disp_name: "ชื่อที่จะแสดง",
      join_go: "เข้าร่วม", cancel: "ยกเลิก", joined: "เข้าร่วม {n} แล้ว", no_companies: "ยังไม่มีบริษัทในระบบ",
      e_wrong_password: "รหัสผ่านไม่ถูกต้อง", e_locked: "ใส่รหัสผิดหลายครั้ง ระบบล็อกไว้ 10 นาที", e_no_company: "ไม่พบบริษัทนี้",
      e_network: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง", e_bad_request: "ข้อมูลไม่ครบ", e_pick: "เลือกบริษัท", e_pass: "ใส่รหัสผ่าน", e_name: "ใส่ชื่อที่จะแสดง",
      leave_q: "ออกจากบริษัท?", leave_t: "ข้อมูลของโต๊ะนี้บนระบบบริษัทจะถูกลบ เครื่องยังเตือนท่านั่งตามปกติ", leave_yes: "ออกจากบริษัท", left: "ออกจากบริษัทแล้ว",
      unpair_q: "ยกเลิกจับคู่?", unpair_t: "เบราว์เซอร์นี้จะไม่เห็นข้อมูลของเครื่องอีก ต้องกรอกรหัสจับคู่ใหม่ถ้าจะใช้ต่อ", unpair_yes: "ยกเลิกจับคู่",
      report_h: "รายงาน", csv: "ดาวน์โหลด CSV", report_btn: "", mail: "✉ ส่งรายงานทางอีเมล",
      mail_subject: "รายงานท่านั่ง 7 วัน", mail_line: "{d}: นั่ง {s} · ท่าถูก {p}% · เตือน {a} ครั้ง",
      help_h: "วิธีการใช้งาน", ok: "เข้าใจแล้ว",
      help_1: "ตั้งกล้องไว้ด้านข้างตัว ห่างประมาณ 1 เมตร สูงระดับไหล่ ให้เห็นหัว ไหล่ และสะโพก",
      help_2: "ติด ultrasonic ที่ขอบล่างจอ ตัวบนเล็งหน้า ตัวล่างเล็งหน้าอก",
      help_3: "นั่งตรง หลังชิดพนัก แล้วกด \"ปรับเทียบท่า\" ครั้งเดียว จากนั้นทำงานตามปกติ เครื่องจะเตือนด้วยเสียงเองเมื่อนั่งผิดท่า ไม่ต้องเปิดเว็บค้างไว้",
      relax_dlg_h: "เราจะ relax ยังไง", relax_1: "ทุก 20 นาที ละสายตาจากจอ", relax_2: "มองวัตถุที่อยู่ไกลประมาณ 20 ฟุต (6 เมตร)",
      relax_3: "มองค้างไว้อย่างน้อย 20 วินาที แล้วกระพริบตาช้าๆ", relax_src: "ที่มา: American Academy of Ophthalmology (กฎ 20-20-20)",
      noti_title: "นั่งผิดท่า", noti_body: "{p} — ปรับท่านั่งหน่อยนะ",
      wd: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
    },
    en: {
      skip: "Skip to main content", conn_wait: "Connecting…", conn_on: "Device online · updated {s}s ago",
      conn_off: "Device offline · last data {t}", conn_never: "Device hasn't sent data yet", conn_mock: "Demo mode",
      help_open: "How to use", hey: "Hey! You're sitting badly", net_err: "Can't connect — retrying…",
      pair_title: "Connect to your device",
      pair_desc: "Enter the 10-character pairing code from the sticker on the device, or from the device page (Settings → Account). Once per browser.",
      pair_label: "Pairing code", pair_btn: "Connect", pair_busy: "Connecting…", pair_mock: "Demo mode: use TEST-TEST-22",
      no_config: "This site isn't connected to its database yet (config.js is empty) — the admin must add the Supabase URL and publishable key",
      mock_banner: "Demo mode — the data on this page is simulated, not from a real device",
      app_h: "This app", report_send: "Export stats", ch_h: "Alert channels", rule_h: "Posture rules", desk_h: "Device on your desk",
      noti_now: "Applies right away on this browser · only while this page is open",
      noti_ios: "On iPhone/iPad: tap Share → \"Add to Home Screen\", open the app from the Home Screen, then turn this on (or use ntfy below)",
      calib_row: "Sit upright against the backrest, then press — the device measures for 10 s", test_row: "The device will beep within ~10 seconds", start: "Start", test: "Test",
      pair_bad: "Wrong code — check the letters (codes never use O, I, 0 or 1)", pair_len: "The code has 10 characters",
      pair_net: "No internet connection — try again", hr_link: "For HR →",
      nav: "Main menu", nav_home: "Home", nav_stats: "Statistics", nav_settings: "Settings",
      status_h: "Posture status", dist_h: "Distance to screen", cm: "cm", bad_for: "Bad posture for", sit_for: "Sitting for", judged: "Judged by",
      p_good: "Good posture", p_forward: "Leaning / head forward", p_backward: "Reclining / slouching back",
      p_away: "Nobody seated", p_unknown: "Analysing…", badge_good: "✓ Good", badge_bad: "✗ Bad",
      cap_good: "Good posture", cap_forward: "Leaning forward", cap_backward: "Reclining", cap_away: "Empty chair", cap_unknown: "Analysing",
      pose_alt: "Seated figure: {p}", too_close: "Too close (keep ≥ {n} cm)", too_far: "Too far (keep ≤ {n} cm)", dist_ok: "Good distance",
      src_ai_us: "Camera + ultrasonic ({c}%)", src_ai: "Side camera ({c}%)", src_us: "Ultrasonic ({c}%)", src_rules: "OSHA distance rule", src_sensors: "Sensors",
      calib_h: "Posture not calibrated yet",
      calib_desc: "Sit upright with your back against the chair, look straight at the screen, then press the button. The device measures for 10 seconds and beeps when done, so the ultrasonic sensors can help judge.",
      calib_btn: "Calibrate posture",
      relax_h: "Time to relax!!", relax_info: "How to relax", relax_rule: "20-20-20 rule: every 20 minutes, look 6 m away for 20 seconds",
      relax_pause: "Pause timer", relax_play: "Start timer", relax_reset: "Restart timer",
      relax_running: "Counting — the device beeps when it's time to rest your eyes", relax_paused: "Paused — press ▶ to start",
      relax_due: "Time to rest your eyes! Look 6 m away for 20 seconds", test_buzzer: "Test device sound",
      cmd_calibrate: "Sent — sit upright against the backrest for 10 seconds; the device beeps when done",
      cmd_test_buzzer: "Sent — the device will beep within ~10 seconds", cmd_relax_toggle: "Sent", cmd_relax_reset: "Restarted the 20-minute timer",
      cmd_fail: "Couldn't send — try again",
      range: "Time range", daily: "Daily", weekly: "Weekly", chart_day: "Today by hour", chart_week: "7-day trend (hours)",
      good_time: "Good posture", bad_time: "Bad posture", as_table: "Show as table", total_h: "Total sitting time per day",
      chart_alt_week: "7-day chart: {s}", chart_alt_day: "Today by hour: good {g} total, bad {b} total",
      tip: "{d} · ✓ good {g} / ✗ bad {b} · {a} alerts", day_sub: "Good posture {p}% · {a} alerts · {r} breaks",
      col_day: "Day", col_sit: "Total sitting", col_good: "Good", col_bad: "Bad", col_alerts: "Alerts", col_hour: "Hour",
      no_data: "No data yet", hm: "{h} h {m} min", m_only: "{m} min", s_only: "{s} s",
      browser_h: "On this browser", font: "Font size", font_n: "Normal", font_l: "Large", font_xl: "Extra large",
      theme: "Theme", light: "Light", dark: "Dark", web_noti: "Web notifications",
      web_noti_hint: "Notify you about bad posture while this page is open (the device already beeps — no need to keep the page open)",
      noti_denied: "The browser blocked notifications — allow them in the browser's site settings",
      device_h: "Device", sound_on: "Device alert sound", eye_auto: "Automatic 20-20-20 eye breaks",
      bad_seconds: "Alert after bad posture for (seconds)", sit_minutes: "Remind me to stand up every (minutes)",
      screen_range: "Ideal screen distance (cm) · OSHA recommends 50–100", min: "Nearest", max: "Farthest",
      push: "Phone notifications (ntfy)", push_off: "Get alerts on your phone even with the screen off (free ntfy app)",
      push_wait: "Saved — waiting for the device to create your channel (~10 s)",
      push_on: "Install the ntfy app and subscribe to this channel:", push_link: "Open notification channel",
      save: "Save", saving: "Saving…", saved: "Saved — the device will use the new values within ~10 seconds", save_fail: "Couldn't save — try again",
      err_range: "Enter a number {a}–{b}", err_screen: "Nearest must be less than farthest",
      account_h: "My account", acc_personal: "Personal use · your company can't see your data",
      acc_company: "Employee of {n} · {d}", acc_share_on: "Company sees the name “{n}”", acc_share_off: "Company sees only the desk code",
      acc_desk: "Desk code: {d}", join: "Join a company", rejoin: "Edit company details", leave: "Leave company", unpair: "Unpair this browser",
      join_h: "Join a company", company: "Company", join_pass: "Employee password (from HR)", dept: "Department",
      share: "Let my company see my name and statistics (PDPA consent) — otherwise they only see a desk code", disp_name: "Display name",
      join_go: "Join", cancel: "Cancel", joined: "Joined {n}", no_companies: "No companies yet",
      e_wrong_password: "Wrong password", e_locked: "Too many wrong attempts — locked for 10 minutes", e_no_company: "Company not found",
      e_network: "Can't connect — try again", e_bad_request: "Missing information", e_pick: "Choose a company", e_pass: "Enter the password", e_name: "Enter a display name",
      leave_q: "Leave the company?", leave_t: "This desk's data on the company system will be deleted. The device keeps alerting as usual.", leave_yes: "Leave company", left: "Left the company",
      unpair_q: "Unpair?", unpair_t: "This browser will no longer see the device's data. You'll need the pairing code to use it again.", unpair_yes: "Unpair",
      report_h: "Report", csv: "Download CSV", mail: "✉ Email report",
      mail_subject: "7-day posture report", mail_line: "{d}: sat {s} · good posture {p}% · {a} alerts",
      help_h: "How to use", ok: "Got it",
      help_1: "Place the camera at your side, about 1 m away, at shoulder height, so it sees your head, shoulders and hips",
      help_2: "Mount the ultrasonic sensors at the bottom edge of the screen: top one aimed at your face, bottom one at your chest",
      help_3: "Sit upright against the backrest and press \"Calibrate posture\" once. Then just work — the device beeps by itself when you sit badly; no need to keep this page open",
      relax_dlg_h: "How to relax", relax_1: "Every 20 minutes, look away from the screen", relax_2: "Look at something about 20 feet (6 m) away",
      relax_3: "Keep looking for at least 20 seconds and blink slowly", relax_src: "Source: American Academy of Ophthalmology (20-20-20 rule)",
      noti_title: "Bad posture", noti_body: "{p} — please adjust your posture",
      wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },
  };

  // ================= PWA: service worker (แจ้งเตือนบนมือถือ + ติดตั้งลงหน้าจอโฮม) =================
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const STANDALONE = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  let SW_REG = null;
  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("sw.js").then((r) => { SW_REG = r; }).catch(() => { /* ใช้ Notification ธรรมดาแทน */ });
  }

  // ================= ค่าบนเบราว์เซอร์นี้ =================
  const PREF_KEY = "pg_web_prefs";
  const prefs = (() => {
    const d = { lang: (navigator.language || "th").startsWith("th") ? "th" : "en", font: "1", theme: "light", noti: false };
    try { return Object.assign(d, JSON.parse(localStorage.getItem(PREF_KEY) || "{}")); } catch (e) { return d; }
  })();
  if (!localStorage.getItem || !(function () { try { return localStorage.getItem(PREF_KEY); } catch (e) { return null; } })()) {
    try { if (window.matchMedia("(prefers-color-scheme: dark)").matches) prefs.theme = "dark"; } catch (e) { /* ไม่รองรับ */ }
  }
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* storage ปิด */ } }

  function t(key, vars) {
    const dict = I18N[prefs.lang] || I18N.th;
    let s = key in dict ? dict[key] : (I18N.th[key] !== undefined ? I18N.th[key] : key);
    if (vars && typeof s === "string") s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));
    return s;
  }
  function applyI18n() {
    document.documentElement.lang = prefs.lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    $("pair-hint").textContent = PG.mock ? t("pair_mock") : "";
    $("cfg-banner").hidden = !(PG.mock || PG.noConfig);
    $("cfg-banner").textContent = PG.noConfig ? t("no_config") : PG.mock ? t("mock_banner") : "";
    $("noti-ios").hidden = !(IOS && !STANDALONE);
  }
  function applyPrefs() {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.style.setProperty("--fs", prefs.font);
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === prefs.lang)));
    document.querySelectorAll("[data-font]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.font === prefs.font)));
    document.querySelectorAll("[data-theme-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeBtn === prefs.theme)));
    $("sw-noti").setAttribute("aria-checked", String(!!prefs.noti && "Notification" in window && Notification.permission === "granted"));
    applyI18n();
    if (data) render();
  }

  // ================= ตัวช่วย =================
  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h) return t("hm", { h, m });
    if (m) return t("m_only", { m });
    return t("s_only", { s: sec });
  }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0"); }
  // รับได้ทั้ง "2026-11-25" และ "2026-11-25T00:00:00+00:00" (กันเซิร์ฟเวอร์ส่งรูปแบบเวลามาเต็ม)
  function isoDay(iso) { const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(NaN); }
  function dayName(iso) { const d = isoDay(iso); return t("wd")[d.getDay()] || "—"; }
  function dateLabel(iso) {
    const d = isoDay(iso);
    return d.toLocaleDateString(prefs.lang === "en" ? "en-GB" : "th-TH", { weekday: "short", day: "numeric", month: "short" });
  }
  let toastTimer = 0;
  function toast(msg) { $("toast").textContent = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $("toast").textContent = ""; }, 5000); }
  function errText(code) { return t("e_" + code) !== "e_" + code ? t("e_" + code) : t("e_network"); }
  const BAD = new Set(["forward", "backward", "bad"]);

  // ================= สถานะ =================
  let data = null, lastAt = 0, pollTimer = 0, statsMode = "week", selDay = -1, lastPosture = null, lastNotiAt = 0;
  let relaxLocal = { left: 1200, running: false, at: 0 };

  // ================= หน้า (router) =================
  const VIEWS = ["home", "stats", "settings"];
  function currentView() { const h = location.hash.replace("#", ""); return VIEWS.includes(h) ? h : "home"; }
  function showView(focus) {
    const paired = PG.isPaired();
    $("view-pair").hidden = paired;
    $("tabbar").hidden = !paired;
    const v = currentView();
    VIEWS.forEach((name) => { $("view-" + name).hidden = !paired || name !== v; });
    document.querySelectorAll(".tab").forEach((a) => {
      if (a.dataset.view === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (!paired) { $("bad-banner").hidden = true; }
    if (focus) $("main").focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", () => { showView(true); window.scrollTo(0, 0); });

  // ================= จับคู่ =================
  $("pair-code").addEventListener("input", (e) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    const f = raw.length > 8 ? raw.slice(0, 4) + "-" + raw.slice(4, 8) + "-" + raw.slice(8) : raw.length > 4 ? raw.slice(0, 4) + "-" + raw.slice(4) : raw;
    if (e.target.value !== f) e.target.value = f;
    e.target.removeAttribute("aria-invalid"); $("pair-err").textContent = "";
  });
  $("pair-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const inp = $("pair-code"), code = inp.value.replace(/[^A-Za-z0-9]/g, "");
    if (code.length !== 10) { inp.setAttribute("aria-invalid", "true"); $("pair-err").textContent = t("pair_len"); inp.focus(); return; }
    const btn = $("btn-pair"); btn.disabled = true; btn.textContent = t("pair_busy");
    const r = await PG.pair(code);
    btn.disabled = false; btn.textContent = t("pair_btn");
    if (!r || !r.ok) {
      inp.setAttribute("aria-invalid", "true");
      $("pair-err").textContent = r && r.error === "bad_code" ? t("pair_bad") : r && r.error === "no_config" ? t("no_config") : t("pair_net");
      inp.focus(); return;
    }
    inp.value = ""; location.hash = "#home"; showView(true); refresh();
  });

  // ================= ดึงข้อมูล =================
  async function refresh() {
    clearTimeout(pollTimer);
    if (!PG.isPaired()) { showView(false); return; }
    const r = await PG.me(14);
    if (r && r.ok) {
      data = r; lastAt = Date.now(); $("net-banner").hidden = true;
      if (data.live && data.live.relax) relaxLocal = { left: data.live.relax.left, running: !!data.live.relax.running, at: Date.now() };
      render();
    } else if (r && r.error === "unpaired") {
      data = null; showView(true); return;
    } else {
      $("net-banner").hidden = false;
    }
    if (document.visibilityState === "visible") pollTimer = setTimeout(refresh, POLL_MS);
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); else clearTimeout(pollTimer); });

  // ================= แสดงผล =================
  function render() {
    if (!data) return;
    renderConn(); renderHome(); renderStats(); renderSettings();
  }
  function renderConn() {
    const c = $("conn");
    c.classList.toggle("on", !!data.online); c.classList.toggle("off", !data.online);
    let txt;
    if (PG.mock) txt = t("conn_mock") + " · " + t("conn_on", { s: Math.max(0, data.live_age_s || 0) });
    else if (data.online) txt = t("conn_on", { s: Math.max(0, data.live_age_s || 0) });
    else if (data.last_seen) txt = t("conn_off", { t: new Date(data.last_seen).toLocaleString(prefs.lang === "en" ? "en-GB" : "th-TH") });
    else txt = t("conn_never");
    $("conn-text").textContent = txt;
  }
  function postureKey(live) {
    if (!live || !data.online && !PG.mock) return "unknown";
    if (!live.present || live.posture === "away") return "away";
    return ["good", "forward", "backward"].includes(live.posture) ? live.posture : "unknown";
  }
  function renderHome() {
    const live = data.live || {}, s = data.settings || {}, p = postureKey(live);
    const bad = BAD.has(p) || (live.is_bad && p !== "away");
    const card = $("status-card");
    card.classList.toggle("bad", bad); card.classList.toggle("good", p === "good" && !bad);
    $("posture-name").textContent = t("p_" + p);
    $("posture-badge").textContent = p === "away" || p === "unknown" ? "" : bad ? t("badge_bad") : t("badge_good");
    if (p !== lastPosture) {
      $("posture-live").textContent = t("p_" + p);
      if (bad && lastPosture !== null) notify(p);
      lastPosture = p;
    }
    // ระยะ
    const d = live.screen_cm, chip = $("dist-chip");
    $("dist-val").textContent = d == null || p === "away" ? "—" : Math.round(d);
    chip.className = "chip";
    if (d == null || p === "away") chip.textContent = "";
    else if (d < (s.screen_min || 50)) { chip.textContent = t("too_close", { n: s.screen_min || 50 }); chip.classList.add("no"); }
    else if (d > (s.screen_max || 100)) { chip.textContent = t("too_far", { n: s.screen_max || 100 }); chip.classList.add("no"); }
    else { chip.textContent = t("dist_ok"); chip.classList.add("ok"); }
    drawPose(p);
    $("pose-cap").textContent = t("cap_" + p);
    $("f-bad").textContent = bad ? fmtDur(live.bad_for) : "—";
    $("f-sit").textContent = live.present ? fmtDur(live.sit_for) : "—";
    const src = live.posture_source, c = Math.round((live.confidence || 0) * 100);
    $("f-src").textContent = p === "away" || !src ? "—" : t("src_" + src, { c });
    // แถบเตือน
    const showBanner = bad && live.nudge && live.nudge !== "none";
    $("bad-banner").hidden = !showBanner;
    $("bad-banner-text").textContent = showBanner ? "— " + t("p_" + p) : "";
    $("calib-card").hidden = live.calibrated !== false;
    renderRelax();
  }
  function renderRelax() {
    const left = relaxLocal.running ? relaxLocal.left - (Date.now() - relaxLocal.at) / 1000 : relaxLocal.left;
    $("relax-timer").textContent = mmss(Math.max(0, left));
    const btn = $("btn-relax-toggle");
    btn.setAttribute("aria-label", relaxLocal.running ? t("relax_pause") : t("relax_play"));
    $("relax-icon").setAttribute("d", relaxLocal.running ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5v14l11-7z");
    const st = left <= 0 && relaxLocal.running ? t("relax_due") : relaxLocal.running ? t("relax_running") : t("relax_paused");
    if ($("relax-state").textContent !== st) $("relax-state").textContent = st;
  }
  setInterval(() => { if (data && !$("view-home").hidden) renderRelax(); }, 1000);

  // รูปคนนั่ง (SVG วาดเอง)
  const POSES = {
    good: { hip: [56, 88], sh: [54, 52], head: [55, 37], hand: [104, 82], elbow: [76, 74] },
    forward: { hip: [58, 88], sh: [80, 56], head: [95, 47], hand: [108, 82], elbow: [96, 76] },
    backward: { hip: [70, 92], sh: [44, 60], head: [36, 46], hand: [100, 84], elbow: [70, 80] },
  };
  function drawPose(p) {
    const svg = $("pose-svg");
    const chair = '<path d="M30 40v52h44M30 92v34M70 92v34" fill="none" stroke="var(--muted)" stroke-width="4" stroke-linecap="round"/>';
    const desk = '<path d="M98 90h58M150 90v36M118 40h34v30h-34zM135 70v20" fill="none" stroke="var(--muted)" stroke-width="4" stroke-linejoin="round"/>';
    let body = "";
    const pose = POSES[p];
    if (pose) {
      const col = p === "good" ? "var(--good)" : "var(--bad)";
      const knee = [pose.hip[0] + 30, pose.hip[1] + 2], foot = [knee[0] + 2, 126];
      const L = (a, b) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
      body = `<g stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="${L(pose.hip, pose.sh)}${L(pose.hip, knee)}${L(knee, foot)}${L(pose.sh, pose.elbow)}${L(pose.elbow, pose.hand)}"/></g>
        <circle cx="${pose.head[0]}" cy="${pose.head[1]}" r="10" fill="${col}"/>`;
      if (p !== "good") body += `<text x="${pose.head[0] + 12}" y="${pose.head[1] - 12}" font-size="20" font-weight="700" fill="${col}">!</text>`;
    } else if (p === "unknown") {
      body = '<text x="52" y="76" font-size="34" font-weight="700" fill="var(--muted)">?</text>';
    }
    svg.innerHTML = chair + desk + body;
    svg.setAttribute("aria-label", t("pose_alt", { p: t("cap_" + p) }));
  }

  // ================= สถิติ =================
  function setStatsMode(m) {
    statsMode = m; selDay = -1; $("chart-tip").textContent = "";
    $("seg-day").setAttribute("aria-pressed", String(m === "day"));
    $("seg-week").setAttribute("aria-pressed", String(m === "week"));
    renderStats();
  }
  $("seg-day").addEventListener("click", () => setStatsMode("day"));
  $("seg-week").addEventListener("click", () => setStatsMode("week"));

  function renderStats() {
    if (!data) return;
    const days = (data.days || []).slice(-7);
    $("h-chart").textContent = statsMode === "day" ? t("chart_day") : t("chart_week");
    if (statsMode === "week") drawWeek(days); else drawDay();
    // รายการรายวัน (ใหม่ → เก่า)
    const ul = $("day-list"); ul.innerHTML = "";
    const all = (data.days || []).slice().reverse().filter((d) => d.sit_s > 0);
    if (!all.length) { const li = document.createElement("li"); li.textContent = t("no_data"); ul.appendChild(li); }
    all.forEach((d) => {
      const li = document.createElement("li");
      const pct = d.sit_s ? Math.round((d.good_s / d.sit_s) * 100) : 0;
      li.innerHTML = `<span></span><span class="big"></span><span class="sub"></span>`;
      li.children[0].textContent = dateLabel(d.date);
      li.children[1].textContent = fmtDur(d.sit_s);
      li.children[2].textContent = t("day_sub", { p: pct, a: d.alerts, r: d.breaks });
      ul.appendChild(li);
    });
  }
  const W = 340, H = 180, PAD = { l: 30, r: 10, t: 10, b: 24 };
  function axis(maxH, unitLabel) {
    let g = "";
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = (maxH / steps) * i, y = H - PAD.b - (v / maxH) * (H - PAD.t - PAD.b);
      g += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
      g += `<text x="${PAD.l - 4}" y="${y + 4}" text-anchor="end">${unitLabel(v)}</text>`;
    }
    return g;
  }
  const PATTERN = `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="6" fill="var(--bad-bg)"/><rect width="3" height="6" fill="var(--bad)"/></pattern></defs>`;
  function drawWeek(days) {
    const wrap = $("chart"), btns = $("day-btns");
    btns.hidden = false;
    const maxH = Math.max(1, Math.ceil(Math.max(...days.map((d) => d.sit_s / 3600), 1)));
    const x = (i) => PAD.l + ((W - PAD.l - PAD.r) / Math.max(1, days.length - 1)) * i;
    const y = (h) => H - PAD.b - (h / maxH) * (H - PAD.t - PAD.b);
    const line = (key) => days.map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d[key] / 3600)}`).join("");
    let pts = "";
    days.forEach((d, i) => {
      pts += `<rect class="pt" data-i="${i}" x="${x(i) - 16}" y="${PAD.t}" width="32" height="${H - PAD.t - PAD.b}" fill="transparent"/>`;
      pts += `<circle cx="${x(i)}" cy="${y(d.good_s / 3600)}" r="${i === selDay ? 7 : 5}" fill="var(--good)" pointer-events="none"/>`;
      pts += `<rect x="${x(i) - 5}" y="${y(d.bad_s / 3600) - 5}" width="10" height="10" fill="url(#hatch)" stroke="var(--bad)" stroke-width="2"/>`;
      pts += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${dayName(d.date)}</text>`;
    });
    const summary = days.map((d) => `${dayName(d.date)} ${t("good_time")} ${fmtDur(d.good_s)}, ${t("bad_time")} ${fmtDur(d.bad_s)}`).join("; ");
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="">${PATTERN}${axis(maxH, (v) => Math.round(v * 10) / 10 + "h")}
      <path d="${line("good_s")}" fill="none" stroke="var(--good)" stroke-width="3"/>
      <path d="${line("bad_s")}" fill="none" stroke="var(--bad)" stroke-width="3" stroke-dasharray="6 4"/>${pts}</svg>`;
    wrap.firstChild.setAttribute("aria-label", t("chart_alt_week", { s: summary || t("no_data") }));
    // กดจุดบนกราฟ (เมาส์/นิ้ว) = กดปุ่มวันด้านล่าง (ปุ่มวันใช้คีย์บอร์ดได้)
    wrap.onclick = (ev) => { const el = ev.target.closest(".pt"); if (el) btns.children[Number(el.dataset.i)].click(); };
    // ปุ่มวัน
    btns.innerHTML = "";
    days.forEach((d, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "day-btn"; b.textContent = dayName(d.date);
      b.setAttribute("aria-pressed", String(i === selDay));
      b.setAttribute("aria-label", dateLabel(d.date));
      b.addEventListener("click", () => {
        selDay = i;
        $("chart-tip").textContent = t("tip", { d: dateLabel(d.date), g: fmtDur(d.good_s), b: fmtDur(d.bad_s), a: d.alerts });
        drawWeek(days); btns.children[i].focus();
      });
      btns.appendChild(b);
    });
    // ตาราง
    let rows = days.map((d) => `<tr><td>${dateLabel(d.date)}</td><td>${fmtDur(d.sit_s)}</td><td>${fmtDur(d.good_s)}</td><td>${fmtDur(d.bad_s)}</td><td>${d.alerts}</td></tr>`).join("");
    $("chart-table").innerHTML = `<table><thead><tr><th scope="col">${t("col_day")}</th><th scope="col">${t("col_sit")}</th><th scope="col">${t("col_good")}</th><th scope="col">${t("col_bad")}</th><th scope="col">${t("col_alerts")}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function drawDay() {
    const wrap = $("chart");
    $("day-btns").hidden = true;
    const hours = ((data.live || {}).hours || []).map((h) => [h[0] || 0, h[1] || 0, h[2] || 0]);
    while (hours.length < 24) hours.push([0, 0, 0]);
    const maxM = Math.max(10, Math.ceil(Math.max(...hours.map((h) => (h[0] + h[1]) / 60)) / 10) * 10);
    const bw = (W - PAD.l - PAD.r) / 24;
    const y = (m) => H - PAD.b - (m / maxM) * (H - PAD.t - PAD.b);
    let bars = "";
    let gT = 0, bT = 0;
    hours.forEach((h, i) => {
      const g = h[0] / 60, b = h[1] / 60; gT += h[0]; bT += h[1];
      const x = PAD.l + i * bw + 1;
      if (g > 0) bars += `<rect x="${x}" y="${y(g)}" width="${bw - 2}" height="${y(0) - y(g)}" fill="var(--good)"/>`;
      if (b > 0) bars += `<rect x="${x}" y="${y(g + b)}" width="${bw - 2}" height="${y(g) - y(g + b)}" fill="url(#hatch)" stroke="var(--bad)" stroke-width="1"/>`;
      if (i % 3 === 0) bars += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${i}</text>`;
    });
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="">${PATTERN}${axis(maxM, (v) => Math.round(v) + "m")}${bars}</svg>`;
    wrap.firstChild.setAttribute("aria-label", t("chart_alt_day", { g: fmtDur(gT), b: fmtDur(bT) }));
    const rows = hours.map((h, i) => (h[0] + h[1] > 0 ? `<tr><td>${String(i).padStart(2, "0")}:00</td><td>${fmtDur(h[0])}</td><td>${fmtDur(h[1])}</td><td>${h[2]}</td></tr>` : "")).join("");
    $("chart-table").innerHTML = `<table><thead><tr><th scope="col">${t("col_hour")}</th><th scope="col">${t("col_good")}</th><th scope="col">${t("col_bad")}</th><th scope="col">${t("col_alerts")}</th></tr></thead><tbody>${rows || `<tr><td colspan="4">${t("no_data")}</td></tr>`}</tbody></table>`;
  }

  // ================= ตั้งค่า =================
  let formDirty = false;
  const FIELDS = [["in-bad", "bad_seconds", 5, 600, "err-bad"], ["in-sit", "sit_minutes", 10, 180, "err-sit"],
    ["in-smin", "screen_min", 30, 90, "err-screen"], ["in-smax", "screen_max", 50, 150, "err-screen"]];
  function setSwitch(id, on) { $(id).setAttribute("aria-checked", String(!!on)); }
  function renderSettings() {
    const s = data.settings || {};
    if (!formDirty) {
      setSwitch("sw-sound", !s.muted); setSwitch("sw-eye", s.eye_auto !== false); setSwitch("sw-push", !!s.push_enabled);
      FIELDS.forEach(([id, key]) => { if (document.activeElement !== $(id)) $(id).value = s[key] != null ? s[key] : ""; });
    }
    const topic = (data.live || {}).push_topic;
    const ph = $("push-hint");
    if ($("sw-push").getAttribute("aria-checked") !== "true") ph.textContent = t("push_off");
    else if (topic) {
      ph.innerHTML = ""; ph.append(t("push_on") + " ");
      const a = document.createElement("a"); a.href = PG.ntfyUrl(topic); a.target = "_blank"; a.rel = "noopener";
      a.textContent = topic; ph.appendChild(a);
    } else ph.textContent = t("push_wait");
    // บัญชี
    const c = data.company;
    $("acc-status").textContent = c ? t("acc_company", { n: c.name || "—", d: c.department || "—" }) + " · "
      + (c.share_name ? t("acc_share_on", { n: c.display_name || "—" }) : t("acc_share_off")) : t("acc_personal");
    $("acc-desk").textContent = t("acc_desk", { d: data.desk || "—" });
    $("btn-leave").hidden = !c;
    $("btn-join").textContent = c ? t("rejoin") : t("join");
    // อีเมลรายงาน
    const lines = (data.days || []).slice(-7).filter((d) => d.sit_s > 0).map((d) => t("mail_line",
      { d: dateLabel(d.date), s: fmtDur(d.sit_s), p: Math.round((d.good_s / d.sit_s) * 100), a: d.alerts }));
    $("btn-mail").href = "mailto:?subject=" + encodeURIComponent(t("mail_subject")) + "&body=" + encodeURIComponent(lines.join("\n") || t("no_data"));
  }
  ["sw-sound", "sw-eye", "sw-push"].forEach((id) => $(id).addEventListener("click", () => {
    setSwitch(id, $(id).getAttribute("aria-checked") !== "true"); formDirty = true;
    if (id === "sw-push") renderSettings();
  }));
  FIELDS.forEach(([id]) => $(id).addEventListener("input", () => { formDirty = true; $(id).removeAttribute("aria-invalid"); }));
  $("dev-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    ["err-bad", "err-sit", "err-screen"].forEach((id) => { $(id).textContent = ""; });
    const out = {}; let firstBad = null;
    FIELDS.forEach(([id, key, a, b, err]) => {
      const v = Number($(id).value);
      if ($(id).value === "" || !Number.isFinite(v) || v < a || v > b) {
        $(id).setAttribute("aria-invalid", "true"); $(err).textContent = t("err_range", { a, b }); firstBad = firstBad || $(id);
      } else out[key] = Math.round(v);
    });
    if (!firstBad && out.screen_min >= out.screen_max) {
      $("in-smin").setAttribute("aria-invalid", "true"); $("err-screen").textContent = t("err_screen"); firstBad = $("in-smin");
    }
    if (firstBad) { firstBad.focus(); return; }
    out.muted = $("sw-sound").getAttribute("aria-checked") !== "true";
    out.eye_auto = $("sw-eye").getAttribute("aria-checked") === "true";
    out.push_enabled = $("sw-push").getAttribute("aria-checked") === "true";
    out.lang = prefs.lang;
    const btn = $("btn-save"); btn.disabled = true; btn.textContent = t("saving"); $("save-msg").textContent = "";
    const r = await PG.saveSettings(out);
    btn.disabled = false; btn.textContent = t("save");
    if (r && r.ok) { formDirty = false; data.settings = r.settings; $("save-msg").textContent = t("saved"); renderSettings(); }
    else $("save-msg").textContent = r && r.error === "unpaired" ? "" : t("save_fail");
    if (r && r.error === "unpaired") refresh();
  });

  // ค่าบนเบราว์เซอร์
  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => {
    prefs.lang = b.dataset.lang; savePrefs(); applyPrefs();
    if (data && data.settings && data.settings.lang !== prefs.lang) PG.saveSettings({ lang: prefs.lang });  // ภาษาแจ้งเตือนมือถือ
  }));
  document.querySelectorAll("[data-font]").forEach((b) => b.addEventListener("click", () => { prefs.font = b.dataset.font; savePrefs(); applyPrefs(); }));
  document.querySelectorAll("[data-theme-btn]").forEach((b) => b.addEventListener("click", () => { prefs.theme = b.dataset.themeBtn; savePrefs(); applyPrefs(); }));
  $("sw-noti").addEventListener("click", async () => {
    const on = $("sw-noti").getAttribute("aria-checked") !== "true";
    if (on) {
      if (!("Notification" in window)) { toast(t("noti_denied")); return; }
      const perm = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (perm !== "granted") { toast(t("noti_denied")); prefs.noti = false; savePrefs(); applyPrefs(); return; }
    }
    prefs.noti = on; savePrefs(); applyPrefs();
  });
  function notify(p) {
    if (!prefs.noti || !("Notification" in window) || Notification.permission !== "granted") return;
    if (Date.now() - lastNotiAt < 60000) return;
    lastNotiAt = Date.now();
    const title = t("noti_title"), opts = { body: t("noti_body", { p: t("p_" + p) }), tag: "posture", renotify: true, icon: "icons/icon-192.png", badge: "icons/icon-192.png" };
    // จุดบอด: Chrome บน Android ห้าม new Notification() → ต้องให้ service worker แสดงแทน
    if (SW_REG) { SW_REG.showNotification(title, opts).catch(() => {}); return; }
    try { new Notification(title, opts); } catch (e) { /* เบราว์เซอร์นี้ไม่รองรับ */ }
  }

  // ================= คำสั่งไปเครื่อง =================
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-cmd]");
    if (!b) return;
    const cmd = b.dataset.cmd;
    b.disabled = true;
    const r = await PG.command(cmd);
    b.disabled = false;
    if (r && r.ok) {
      toast(t("cmd_" + cmd));
      if (cmd === "relax_reset") relaxLocal = { left: 1200, running: true, at: Date.now() };
      renderRelax();
    } else toast(t("cmd_fail"));
  });
  $("btn-relax-toggle").addEventListener("click", async () => {
    const r = await PG.command("relax_toggle");
    if (r && r.ok) {
      const left = relaxLocal.running ? relaxLocal.left - (Date.now() - relaxLocal.at) / 1000 : relaxLocal.left;
      relaxLocal = { left: Math.max(0, left), running: !relaxLocal.running, at: Date.now() };
      renderRelax();
    } else toast(t("cmd_fail"));
  });

  // ================= หน้าต่าง =================
  function openDialog(dlg, opener) {
    dlg._opener = opener || document.activeElement;
    dlg.showModal();
  }
  document.querySelectorAll("dialog").forEach((dlg) => dlg.addEventListener("close", () => {
    if (dlg._opener && document.contains(dlg._opener)) dlg._opener.focus();
  }));
  $("btn-help").addEventListener("click", (e) => openDialog($("dlg-help"), e.currentTarget));
  $("btn-relax-info").addEventListener("click", (e) => openDialog($("dlg-relax"), e.currentTarget));

  function confirmBox(title, text, yes) {
    return new Promise((resolve) => {
      const dlg = $("dlg-confirm");
      $("h-confirm").textContent = title; $("confirm-text").textContent = text; $("btn-confirm-yes").textContent = yes;
      const done = (v) => { cleanup(); dlg.close(); resolve(v); };
      const onYes = () => done(true), onNo = () => done(false), onCancel = () => { cleanup(); resolve(false); };
      function cleanup() { $("btn-confirm-yes").removeEventListener("click", onYes); $("btn-confirm-no").removeEventListener("click", onNo); dlg.removeEventListener("cancel", onCancel); }
      $("btn-confirm-yes").addEventListener("click", onYes); $("btn-confirm-no").addEventListener("click", onNo); dlg.addEventListener("cancel", onCancel);
      openDialog(dlg); $("btn-confirm-no").focus();
    });
  }

  // ================= บัญชี =================
  $("btn-join").addEventListener("click", async (e) => {
    const sel = $("j-company"); sel.innerHTML = "";
    $("j-err").textContent = ""; ["j-company", "j-pass", "j-name"].forEach((id) => $(id).removeAttribute("aria-invalid"));
    const c = data && data.company;
    $("j-pass").value = ""; $("j-dept").value = c ? c.department || "" : "";
    $("j-share").checked = !!(c && c.share_name); $("j-name").value = c ? c.display_name || "" : ""; $("j-name-wrap").hidden = !$("j-share").checked;
    openDialog($("dlg-join"), e.currentTarget);
    const r = await PG.listCompanies();
    const opt0 = document.createElement("option"); opt0.value = ""; opt0.textContent = r.ok && r.companies.length ? "—" : t("no_companies"); sel.appendChild(opt0);
    (r.companies || []).forEach((co) => {
      const o = document.createElement("option"); o.value = co.id; o.textContent = co.name;
      if (c && c.id === co.id) o.selected = true; sel.appendChild(o);
    });
    if (!r.ok) $("j-err").textContent = t("e_network");
  });
  $("j-share").addEventListener("change", () => { $("j-name-wrap").hidden = !$("j-share").checked; });
  $("btn-join-cancel").addEventListener("click", () => $("dlg-join").close());
  $("join-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("j-err"); err.textContent = "";
    const bad = (id, msg) => { $(id).setAttribute("aria-invalid", "true"); err.textContent = msg; $(id).focus(); };
    if (!$("j-company").value) return bad("j-company", t("e_pick"));
    if (!$("j-pass").value) return bad("j-pass", t("e_pass"));
    if ($("j-share").checked && !$("j-name").value.trim()) return bad("j-name", t("e_name"));
    const btn = $("btn-join-go"); btn.disabled = true;
    const r = await PG.join($("j-company").value, $("j-pass").value, $("j-share").checked ? $("j-name").value.trim() : "",
      $("j-dept").value.trim(), $("j-share").checked);
    btn.disabled = false;
    if (!r || !r.ok) {
      if (r && r.error === "wrong_password") return bad("j-pass", t("e_wrong_password"));
      err.textContent = errText(r ? r.error : "network"); return;
    }
    $("dlg-join").close(); $("acc-msg").textContent = t("joined", { n: r.name || "" }); refresh();
  });
  $("btn-leave").addEventListener("click", async () => {
    if (!(await confirmBox(t("leave_q"), t("leave_t"), t("leave_yes")))) return;
    const r = await PG.leave();
    $("acc-msg").textContent = r && r.ok ? t("left") : errText(r ? r.error : "network");
    refresh();
  });
  $("btn-unpair").addEventListener("click", async () => {
    if (!(await confirmBox(t("unpair_q"), t("unpair_t"), t("unpair_yes")))) return;
    await PG.unpair(); data = null; lastPosture = null; location.hash = ""; showView(true); $("pair-code").focus();
  });

  // ================= รายงาน CSV =================
  $("btn-csv").addEventListener("click", () => {
    const rows = [["date", "sit_min", "good_min", "bad_min", "good_pct", "alerts", "breaks"]];
    ((data && data.days) || []).forEach((d) => rows.push([d.date, Math.round(d.sit_s / 60), Math.round(d.good_s / 60), Math.round(d.bad_s / 60),
      d.sit_s ? Math.round((d.good_s / d.sit_s) * 100) : 0, d.alerts, d.breaks]));
    const blob = new Blob(["﻿" + rows.map((r) => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "posture-report.csv";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // ================= เริ่ม =================
  applyPrefs();
  showView(false);
  refresh();
})();
