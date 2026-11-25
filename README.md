# Don't let your boss kill you back — เว็บแอปออนไลน์ (v5)

เว็บเดียวใช้ได้ทั้งมือถือและคอม (จอ ≥ 1024px มีเมนูข้าง + 2 คอลัมน์) · WCAG 2.2 AA (ทดสอบด้วย axe ทั้งธีมสว่าง/มืด)

## โครงสร้าง
- `index.html`, `style.css`, `js/app.js` — หน้าเว็บผู้ใช้ (จับคู่ / วันนี้ / สถิติ / ตั้งค่า)
- `js/api.js` — ตัวเชื่อม Supabase (RPC เท่านั้น ตารางทั้งหมดปิดจาก anon)
- `config.js` — ใส่ Supabase URL + คีย์ **publishable** เท่านั้น (ห้ามคีย์ secret/service_role)
- `sw.js`, `manifest.webmanifest`, `icons/` — แจ้งเตือนบน Android, ติดตั้งลงหน้าจอโฮม (iPhone ต้องติดตั้งก่อนจึงแจ้งเตือนได้)
- `hr/` — แดชบอร์ดฝ่ายบุคคล
- `supabase/schema.sql` — รันครั้งเดียวใน Supabase → SQL Editor (รันซ้ำได้ ไม่ลบข้อมูล)

## ขึ้นเว็บ (GitHub Pages)
Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save
ลิงก์: `https://<ชื่อผู้ใช้>.github.io/<ชื่อ repo>/`

## โหมดสาธิต
เปิดด้วย `?mock=1` → ข้อมูลจำลอง รหัส `TEST-TEST-22` (บนเว็บจริงที่ลืมใส่ config.js จะขึ้นแถบเตือน ไม่แอบใช้ข้อมูลจำลอง)

## v5 แก้จุดบอด
- วันที่ใช้เวลาไทยแม้ Supabase เป็น UTC (เดิมช่วง 00:00–07:00 วันเพี้ยน และวันที่ในกราฟขึ้น Invalid Date)
- Android แจ้งเตือนผ่าน service worker · iPhone บอกวิธีติดตั้งก่อน
- รหัสจับคู่เปลี่ยนได้จากหน้าเครื่อง → ตัดทุกเบราว์เซอร์ที่จับคู่ไว้ · รองรับผู้ดู 50 เบราว์เซอร์ต่อเครื่อง
