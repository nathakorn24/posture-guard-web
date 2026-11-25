// ตั้งค่าครั้งเดียว: ใส่ค่าจาก Supabase → Project Settings → API Keys
// คีย์ publishable/anon ออกแบบมาให้อยู่ในหน้าเว็บได้ (ตารางทั้งหมดถูกปิด เข้าได้ผ่านฟังก์ชันที่ต้องใช้รหัสผ่านเท่านั้น)
// ⚠️ ห้ามใส่คีย์ secret / service_role ในไฟล์นี้เด็ดขาด
window.PG_CONFIG = {
  supabaseUrl: "https://flsglkwcpikshjbwknsc.supabase.co",   // เช่น "https://abcdefghijkl.supabase.co"
  supabaseKey: "sb_publishable_SQ8oURoNDMrOkHpbnPSn2w_SCUx479F",   // คีย์ publishable (sb_publishable_...) หรือ anon
};
