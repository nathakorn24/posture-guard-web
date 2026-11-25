/* Don't let your boss kill you back — service worker
 * หน้าที่มีแค่ 2 อย่าง: (1) แสดงแจ้งเตือนบนมือถือ Android/iOS ที่ห้ามใช้ new Notification()
 * (2) กดแจ้งเตือนแล้วเปิด/สลับมาที่แอป
 * ตั้งใจไม่แคชไฟล์ใดๆ (ไม่มี fetch handler) — กันจุดบอดที่แก้ config.js แล้วเบราว์เซอร์ยังใช้ไฟล์เก่า */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow("./#home");
  })());
});
