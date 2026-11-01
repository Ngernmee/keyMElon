# Key Vault – ระบบคีย์สำหรับ Roblox (Vercel)

## วิธีติดตั้ง
1. อัปโหลดโฟลเดอร์นี้ขึ้น GitHub แล้ว Import เข้า Vercel (หรือใช้ `vercel` CLI)
2. ใน Vercel ไปที่ **Storage → Marketplace → Upstash Redis** แล้วกด Create + Connect เข้ากับโปรเจกต์
   (จะได้ตัวแปร `KV_REST_API_URL` และ `KV_REST_API_TOKEN` ให้อัตโนมัติ)
3. ไปที่ **Settings → Environment Variables** เพิ่ม
   - `ADMIN_PASSWORD` = รหัสผ่านที่ใช้เข้าหน้าเว็บ
   - `SESSION_SECRET` = ข้อความสุ่มยาวๆ (ไม่บังคับ)
4. กด **Redeploy** แล้วเปิดเว็บ

## วิธีใช้
1. เข้าสู่ระบบ → กด **สร้าง API** แล้วตั้งชื่อ
2. กดเข้าไปใน API → เลือกจำนวนวัน → กด **สร้างคีย์**
3. คัดลอกสคริปต์ในหน้า API ไปรันใน Executor (หรือใช้ไฟล์ `roblox-loader.lua` แล้วแก้ `API_ID` กับ `SERVER`)
4. ผู้เล่นใส่คีย์ในหน้าต่าง → ระบบแจ้งว่าเหลือกี่วัน → รัน `loadstring(game:HttpGet("https://pastefy.app/XPMBIf8N/raw"))()`

> วันของคีย์จะเริ่มนับตอนที่ถูกใช้ครั้งแรก
