# Campus Lost & Found Management System

> **Final Project — Study Club Backend VeteranTech**  
> **Nama:** Ibnu Ahmad Fauzan  
> **NIM:** 2510512079  

REST API backend untuk pengelolaan laporan barang hilang (*Lost Item*) dan barang temuan (*Found Item*) di lingkungan kampus secara terpusat oleh administrator.

---

## Fitur Utama

- **Model Terpisah:** `LostItem` (status: `Belum ditemukan`, `Ditemukan`) & `FoundItem` (status: `Belum diklaim`, `Sudah diklaim`).
- **CRUD & Partial Update:** Dukungan penuh pembuatan, pembaruan parsial, pencarian, dan penghapusan laporan.
- **Query Filtering & Search:** Filter `category`, `location`, `status`, dan `search` (logika AND, aman dari regex injection).
- **Secure Photo Upload:** Upload foto opsional (maks 5 MB, `.jpg`/`.jpeg`/`.png`), nama acak (`crypto.randomBytes`), validasi *magic bytes*, dan *orphan file cleanup*.
- **Centralized Error Handling:** Penanganan terpusat untuk validasi Mongoose, CastError, duplicate key, error Multer, dan HTTP 500 tanpa kebocoran *stack trace*.

---

## Teknologi

- **Runtime & Framework:** Node.js (ESM), Express.js (v5)
- **Database & ODM:** MongoDB (Lokal), Mongoose (v9)
- **File Upload:** Multer (v2)
- **Konfigurasi:** dotenv

---

## Struktur Folder

```text
campus-lost-and-found-final-project/
├── .env.example
├── README.md
├── uploads/               # Penyimpanan file gambar lokal
├── postman/
│   ├── seed-lost-items.json
│   ├── seed-found-items.json
│   └── collections/       # Postman Collection request files
└── src/
    ├── app.js             # Konfigurasi Express & middleware
    ├── server.js          # Inisialisasi koneksi DB & server HTTP
    ├── config/database.js # Koneksi MongoDB
    ├── controllers/       # Controller Lost & Found
    ├── middlewares/       # errorHandler & uploadMiddleware
    ├── models/            # Model Mongoose (LostItem & FoundItem)
    ├── routes/            # Routing API (/api/lost & /api/found)
    ├── services/          # Business logic & query database
    └── utils/             # Helper validasi & manipulasi file
```

---

## Instalasi & Menjalankan Server

1. **Clone & Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Environment (`.env`):**
   Salin `.env.example` ke `.env`:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/campus-lost-and-found
   ```

3. **Jalankan Aplikasi:**
   ```bash
   # Mode pengembangan (watch mode)
   npm run dev

   # Mode produksi
   npm start
   ```

---

## Format Response API

- **Sukses (200 / 201):**
  ```json
  { "success": true, "message": "Pesan sukses", "data": {} }
  ```
- **Gagal / Validasi (400 / 404):**
  ```json
  { "success": false, "message": "Validasi gagal", "errors": ["Deskripsi error"] }
  ```
- **Server Error (500):**
  ```json
  { "success": false, "message": "Terjadi kesalahan pada server", "errors": ["Terjadi kesalahan internal pada server"] }
  ```

---

## Dokumentasi 10 Endpoint API

Base URL: `http://localhost:3000/api`

### Aturan Validasi Input:
- **Kategori:** `Elektronik`, `Dokumen`, `Aksesoris`, `Pakaian`, `Lainnya` (*case-insensitive*).
- **Tanggal (`eventDate`):** Format ketat `YYYY-MM-DD`.
- **Kontak (`reporterContact`):** Format nomor HP Indonesia (`08...` / `+62...`) atau email valid.
- **Upload (`image`):** Form-data field `image`, maks 5 MB, format `.jpg`/`.jpeg`/`.png`.

### 1. Laporan Barang Hilang (`/api/lost`)

| Method | Endpoint | Fungsi | Keterangan & Body Parameter |
|---|---|---|---|
| `POST` | `/api/lost` | Tambah laporan kehilangan | Form-data / JSON: `itemName`, `category`, `description`, `location`, `eventDate`, `reporterName`, `reporterContact`, `image` (opsional). Status default: `Belum ditemukan`. |
| `GET` | `/api/lost` | Daftar seluruh barang hilang | Mendukung query: `category`, `location`, `status`, `search`. |
| `GET` | `/api/lost/:id` | Detail laporan kehilangan | Mengambil detail berdasarkan ObjectId. |
| `PUT` | `/api/lost/:id` | Perbarui laporan kehilangan | Partial update field di atas + `status` (`Belum ditemukan`/`Ditemukan`). Kirim `image: null` untuk hapus foto. |
| `DELETE` | `/api/lost/:id` | Hapus laporan kehilangan | Menghapus data dari DB dan membersihkan file foto fisik di `uploads/`. |

### 2. Laporan Barang Temuan (`/api/found`)

| Method | Endpoint | Fungsi | Keterangan & Body Parameter |
|---|---|---|---|
| `POST` | `/api/found` | Tambah laporan penemuan | Form-data / JSON: `itemName`, `category`, `description`, `location`, `eventDate`, `reporterName`, `reporterContact`, `image` (opsional). Status default: `Belum diklaim`. |
| `GET` | `/api/found` | Daftar seluruh barang temuan | Mendukung query: `category`, `location`, `status`, `search`. |
| `GET` | `/api/found/:id` | Detail laporan penemuan | Mengambil detail berdasarkan ObjectId. |
| `PUT` | `/api/found/:id` | Perbarui laporan penemuan | Partial update field di atas + `status` (`Belum diklaim`/`Sudah diklaim`). |
| `DELETE` | `/api/found/:id` | Hapus laporan penemuan | Menghapus data dari DB dan membersihkan file foto fisik di `uploads/`. |

---

## Query Parameters & Pencarian

Endpoint `GET /api/lost` dan `GET /api/found` mendukung filter:
- `category`: Cocok persis, case-insensitive (contoh: `?category=elektronik`).
- `location`: Pencarian parsial, case-insensitive (contoh: `?location=perpus`).
- `status`: Cocok persis sesuai status valid masing-masing model.
- `search`: Pencarian parsial kata kunci pada `itemName` dan `description`.
- **Kombinasi:** Seluruh filter digabung dengan logika **AND**. Parameter kosong/spasi diabaikan.

---

## Upload Foto & Folder `uploads/`

- File disimpan lokal di folder `uploads/` dengan nama acak `crypto.randomBytes(16)` (mencegah *path traversal*).
- Path relatif disimpan di database (contoh: `uploads/9103ad975ddb2d9970bdd7e334a87729.jpg`).
- File dapat diakses langsung secara publik via `http://localhost:3000/uploads/<filename>`.
- Jika upload foto baru saat `PUT`, foto lama otomatis terhapus. Jika simpan DB gagal, file baru langsung dihapus (*orphan cleanup*).
