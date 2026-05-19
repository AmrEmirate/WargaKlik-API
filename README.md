# 🌐 WargaKlik API (Backend)

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-24.x-green?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.x-blue?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Sequelize-6.x-lightblue?style=for-the-badge&logo=sequelize" alt="Sequelize" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/WhatsApp_Web.js-Enabled-brightgreen?style=for-the-badge&logo=whatsapp" alt="WhatsApp" />
</div>

---

**WargaKlik API** adalah sistem backend berkinerja tinggi yang dirancang untuk mendukung ekosistem aplikasi **WargaKlik** (Sistem Informasi & Pembayaran Iuran Warga). Sistem ini dibangun menggunakan arsitektur **Express.js**, diintegrasikan dengan database **PostgreSQL** via **Sequelize ORM**, didukung gerbang pembayaran otomatis **Midtrans**, serta layanan pengiriman notifikasi/OTP langsung melalui **WhatsApp Web.js** & **SMTP Email (Nodemailer)**.

---

## ✨ Fitur Utama

- 🔑 **Otentikasi & Keamanan**:
  - Implementasi JSON Web Token (JWT) ganda (Access Token & Refresh Token).
  - Keamanan berlapis menggunakan **Helmet.js**, **XSS Clean**, **Express Rate Limit**, dan enkripsi **Bcryptjs**.
  - Sistem *Graceful Token Cleanup* berkala.

- 🗄️ **Database Relasional & Sinkronisasi**:
  - Manajemen data warga, iuran, kas RT, laporan keluhan, dan notifikasi menggunakan **PostgreSQL**.
  - Skema database dinamis didukung sinkronisasi otomatis menggunakan **Sequelize ORM** (Development Mode).

- 💳 **Gerbang Pembayaran Terintegrasi (Midtrans)**:
  - Pembayaran otomatis iuran warga via Snap API & Core API (Sandbox mode).
  - Manajemen status transaksi secara *real-time* via webhook.

- 💬 **Layanan WhatsApp & OTP**:
  - Integrasi **WhatsApp Web.js** dengan Puppeteer headless browser untuk pengiriman kode OTP serta reminder iuran bulanan warga secara instan.
  - Penjanaan QR Code langsung pada terminal untuk otorisasi WhatsApp.

- 📧 **Notifikasi Email (SMTP)**:
  - Pengiriman email otomatis untuk registrasi, aktivasi akun, dan reset kata sandi menggunakan **Nodemailer**.

- ⏰ **Tugas Berkala (Cron Jobs)**:
  - Automasi berkala menggunakan **Node-Cron** untuk penjanaan tagihan otomatis setiap tanggal 1 dan pengiriman pengingat (reminder) setiap tanggal 10 dan 20.

---

## 🛠️ Persyaratan Sistem

Sebelum memulai, pastikan perangkat Anda telah terpasang:
- **Node.js** (v20 ke atas direkomendasikan)
- **npm** atau **yarn**
- **PostgreSQL Database**

---

## 🚀 Panduan Instalasi & Penggunaan

### 1. Klon & Masuk ke Folder Projek
Jika belum, masuk ke direktori backend:
```bash
cd backend
```

### 2. Pasang Dependensi
Pasang semua paket library yang dibutuhkan:
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env` lalu lengkapi nilai variabelnya:
```bash
# Untuk Windows (PowerShell)
Copy-Item .env.example .env

# Untuk Linux/macOS
cp .env.example .env
```

Berikut adalah skema konfigurasi `.env` yang digunakan:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_DIALECT=postgres
DB_HOST=72.61.215.164
DB_PORT=3009
DB_NAME=postgres
DB_USER=postgres
DB_PASS=your_db_password

# JWT
JWT_SECRET=your_jwt_secret_64_characters
JWT_REFRESH_SECRET=your_jwt_refresh_secret_64_characters
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
JWT_REFRESH_EXPIRE_DAYS=7

# Midtrans (Sandbox)
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_IS_PRODUCTION=false

# Mail (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_gmail_user@gmail.com
MAIL_PASS=your_gmail_app_password

# Frontend URLs
USE_NGROK=false
LOCAL_FRONTEND_URL=http://localhost:3000

# WhatsApp Service
WHATSAPP_ENABLED=true
```

### 4. Jalankan Server Pengembangan (Development Server)
Jalankan server dengan mode *hot-reload* otomatis menggunakan nodemon:
```bash
npm run dev
```

*Catatan: Saat pertama kali dijalankan dengan `WHATSAPP_ENABLED=true`, sistem akan mengunduh headless browser Chromium (jika belum ada) dan memunculkan **QR Code** di terminal. Pindai QR Code tersebut menggunakan aplikasi WhatsApp di ponsel Anda untuk mengaktifkan bot notifikasi.*

---

## 📂 Struktur Folder Utama

```text
backend/
├── src/
│   ├── config/          # Konfigurasi Database, Mail, Midtrans & Env
│   ├── controllers/     # Logika Kontroler API (Auth, Iuran, Kas, Warga, dll)
│   ├── jobs/            # Defini & Penjadwalan Cron Jobs (Tagihan & Reminder)
│   ├── middlewares/     # Proteksi Keamanan, Hak Akses (Role) & Validasi Input
│   ├── models/          # Definisi Skema Tabel Sequelize (Database Models)
│   ├── routes/          # Peta Endpoint/Rute API
│   ├── seeders/         # Dummy data untuk inisialisasi basis data
│   ├── services/        # Integrasi Pihak Ketiga (Midtrans, Mail, WA)
│   ├── utils/           # Template Notifikasi, Format Respon & Helper
│   ├── app.js           # Konfigurasi middleware utama Express
│   └── server.js        # Entry point utama inisialisasi server & database
├── package.json
└── nodemon.json
```

---

## 🔒 Lisensi & Keamanan
Seluruh parameter rahasia di dalam file `.env` telah secara ketat dimasukkan ke dalam `.gitignore` guna mencegah kebocoran kredensial di repositori publik.

---
<div align="center">
  <p>Dibuat dengan ❤️ untuk kemudahan pengelolaan administrasi warga.</p>
</div>
