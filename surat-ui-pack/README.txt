# Surat UI Pack (Premium Look)

## Cara pakai
1) Extract zip ini ke root project Next.js kamu (folder `surat/`).
   - Pastikan struktur foldernya jadi:
     - `public/logo.svg`
     - `components/app-shell.tsx`
     - `app/inbox/page.tsx`
     - `app/dashboard/page.tsx`
     - `app/globals.additions.css`

2) Tambahkan isi file `app/globals.additions.css` ke file `app/globals.css` kamu (paste di bagian paling bawah).

3) Install dependency yang dibutuhkan:
   - lucide-react (ikon) dan sonner (toast) jika belum ada:
     ```bash
     pnpm add lucide-react sonner
     ```

4) Jalankan:
   ```bash
   pnpm dev
   ```

## Catatan
- Pack ini hanya mengubah tampilan (UI) agar lebih branded/premium.
- File `globals.additions.css` adalah tambahan, bukan pengganti `globals.css`.
