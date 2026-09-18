# 📖 Diary With You — Project Rules & Architecture
> ⚠️ JANGAN UBAH APAPUN sebelum ada instruksi selanjutnya dari user. Dokumen ini merekam semua keputusan arsitektur dan desain yang telah disepakati.

---

## 🏗️ Arsitektur Aplikasi (Tech Stack)

*   **Framework:** Next.js (App Router, JavaScript)
*   **Hosting:** Vercel (direkomendasikan)
*   **Database & Storage:** Supabase (PostgreSQL untuk data, Storage untuk foto/video)
*   **Library Flipbook:** `StPageFlip` v2.0.7 (diload via CDN di klien)
*   **Styling:** Vanilla CSS (CSS Modules untuk komponen, `globals.css` untuk styling dasar) — *Tanpa Tailwind*.

---

## 📁 Struktur Direktori Utama

```
diary-app/
├── app/
│   ├── components/
│   │   ├── DiaryViewer.js / .module.css  — Komponen utama flipbook (Viewer)
│   │   ├── DiaryPage.js                  — Komponen isi halaman diary
│   │   ├── DiaryCover.js                 — Komponen sampul depan
│   │   ├── DiaryBackCover.js             — Komponen sampul belakang
│   │   ├── EditorClient.js / .module.css — Komponen UI Editor (Upload & tata letak)
│   │   └── PinGate.js / .module.css      — Komponen gerbang PIN OTP-style
│   ├── editor/
│   │   └── page.js                       — Rute halaman editor (/editor)
│   ├── lib/
│   │   └── supabase.js                   — Singleton Supabase client
│   ├── globals.css                       — Global styling (Tema Vintage)
│   ├── layout.js                         — Root layout Next.js
│   └── page.js                           — Rute halaman utama (Viewer)
├── supabase-schema.sql                   — Skema tabel & policy untuk Supabase
└── .env.local                            — Environment variables (Supabase URL, Key, dan PIN)
```

---

## 🎨 Desain Sistem & Estetika (Vintage Diary)

*   **Tema:** Buku harian lawas (vintage), kertas usang, tekstur kulit.
*   **Warna Utama:**
    *   Kertas: Cream/Aged Paper (`#f5f0e8`, `#d4c5a0`)
    *   Tinta: Cokelat tua/pudar (`#2c2416`, `#4a3f2e`)
    *   Sampul: Kulit cokelat tua (`#3d2b1f`, `#6b4c35`)
*   **Tipografi:**
    *   Tulisan Tangan (Handwriting): `Caveat` (untuk catatan dan caption).
    *   Mesin Tik (Typewriter): `Special Elite` (untuk hint, label, nomor halaman).
    *   Vintage Serif: `IM Fell English` (untuk judul sampul).
*   **Kertas Isi:** Memiliki garis kisi-kisi (grid) samar yang menyerupai buku catatan bergaris kotak.

---

## 📸 Template Memori (Item Halaman)

Halaman diary diisi dengan elemen absolut (drag & drop saat di editor). Template yang tersedia:

1.  **Polaroid:** Bingkai putih tebal di bawah dengan efek bayangan dan teks caption opsional font tulisan tangan.
2.  **Vintage Print:** Foto dengan bingkai tipis dan filter warna sepia/pudar.
3.  **Taped:** Foto yang menempel ke kertas dengan elemen selotip (washi tape) kuning transparan di bagian atas.
4.  **Note:** Kotak catatan kertas dengan font tulisan tangan.
5.  **Video:** Klip video (maksimal 5 detik, looping otomatis).

*Semua foto dan video tidak tertembus garis grid buku.*

---

## 🔒 Sistem Keamanan (PIN Gate)

Kedua halaman (Viewer dan Editor) dilindungi oleh sistem PIN bergaya kotak OTP:
*   **Viewer PIN (`NEXT_PUBLIC_VIEWER_PIN`):** Diset ke angka spesial (contoh: tanggal jadian `170508`).
*   **Editor PIN (`NEXT_PUBLIC_EDITOR_PIN`):** PIN khusus untuk akses mengedit dan menambah foto.
*   Status *unlocked* disimpan di `sessionStorage` sehingga tidak perlu login ulang saat me-refresh halaman pada sesi yang sama.

---

## ⚙️ Logika Halaman Dinamis (Supabase)

*   Aplikasi membaca data secara dinamis dari tabel `pages` dan `items` di Supabase.
*   Setiap kali user menyimpan memori baru dari `/editor`, sistem akan membuat `page_number` baru dan halaman otomatis bertambah (di-fetch oleh viewer).
*   Data foto dan video diunggah ke *bucket* Supabase Storage bernama `diary-media`.
*   Posisi elemen (X, Y, rotasi, ukuran) dikunci permanen di *database* dan di-*render* secara *absolute* pada `DiaryPage`.

---

## 📖 Flipbook Mechanics & Physics (Hasil Kalibrasi)

Bagian ini merekam hasil perbaikan bug (layout shift & garis hitam) dan kalibrasi fisik buku agar terasa nyata:

1. **Stabilitas Layout (Anti-Shift):**
   - Container flipbook dikunci lebarnya dengan `size: 'fixed'`, `width`, dan `height` yang proporsional.
   - `showCover: true` diaktifkan agar halaman pertama dan terakhir (yang memiliki `data-density="hard"`) tampil sebagai cover tunggal (buku tertutup).
   - Efek *hover paper curl manual* yang dulu menyebabkan buku bergeser telah **dihapus**. Kita murni mengandalkan `showPageCorners: true` bawaan library.

2. **Cover State Detection (Menghilangkan Garis Hitam):**
   - Saat buku tertutup (di halaman 0 atau halaman terakhir), sebuah fungsi mendeteksi status ini dan otomatis **menyembunyikan garis tengah (spine) dan tumpukan kertas (stack)** via CSS (`opacity: 0`). Ini mencegah munculnya mark/garis hitam di sebelah buku saat mode satu halaman.

3. **Ketebalan Tumpukan Kertas (Page Stacks):**
   - Di kiri dan kanan buku, terdapat elemen visual (`.stackLeft` dan `.stackRight`) yang merepresentasikan ketebalan kertas.
   - Ketebalan ini (lebar elemen) dihitung secara dinamis di `DiaryViewer` berdasarkan rasio halaman saat ini terhadap total halaman (`MIN_STACK` hingga `MAX_STACK`).
   - Stack menggunakan CSS `repeating-linear-gradient` dan `clip-path` untuk memberikan ilusi 3D lembaran kertas.

---

## ❌ LARANGAN MUTLAK (Do Not Touch)

1.  **JANGAN** mengubah pustaka flipbook (`StPageFlip`). Pengaturannya sudah dikalibrasi.
2.  **JANGAN** menghapus status penahanan PIN (OTP input logic) di `PinGate.js`.
3.  **JANGAN** mengubah relasi database antara tabel `pages` dan `items` di `supabase-schema.sql`.
4.  **JANGAN** mengembalikan gaya majalah Vogue. Fokus pada estetika "Diary".
5.  **JANGAN** menyertakan Tailwind CSS; patuhi penggunaan CSS murni untuk kontrol visual absolut yang telah ditetapkan.
6.  **JANGAN** mengubah logika `showCover: true` dan penyembunyian `spine`/`stack` saat buku ditutup, karena akan merusak layout dan memunculkan kembali bug garis hitam.
