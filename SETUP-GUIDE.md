# คู่มือการตั้งค่าระบบส่งงานออนไลน์
## โรงเรียนสันติวิทยา จังหวัดกระบี่ | ครูธีรพงษ์ เขาทอง

---

## วิธีใช้งาน (ทดสอบ offline)

เปิดไฟล์ `index.html` หรือ `login.html` ในเบราว์เซอร์ได้เลย

---

## ข้อมูล Login

### ครู:
- **Username:** `teacher`
- **Password:** `santiwittaya2567`

### นักเรียน:
- กรอก ชื่อ-นามสกุล, เลขที่, ระดับชั้น, ห้อง

---

## ตั้งค่า Google Sheets Backend

1. สร้าง Google Sheets ใหม่
2. ไปที่ Extensions > Apps Script
3. วางโค้ดจาก `google-apps-script/Code.gs`
4. Deploy > New deployment > Web app
5. Execute as: Me, Who has access: Anyone
6. คัดลอก URL มาใส่ใน `js/config.js`

---

## Host บน GitHub Pages

เว็บจะพร้อมใช้ที่ URL ของ GitHub Pages
