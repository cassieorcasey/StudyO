# StudyO

Pencatat waktu belajar dan istirahat. Atur target per topik, jalankan Stopwatch, Countdown, atau Break, lalu lihat konsistensi dan keseimbangan belajar di Statistik. Data tersimpan di perangkat dan tersinkron antar perangkat lewat Supabase.

Aplikasi: https://cassieorcasey.github.io/StudyO/

## Struktur

| Lokasi | Isi |
|---|---|
| `src/template.html` | Sumber aplikasi: CSS, HTML, dan JavaScript. **Sunting di sini.** |
| `src/cadence.js` | Generator logo The Cadence Disk (SVG), dipakai di aplikasi dan untuk ikon |
| `src/icons.js` | Membuat ulang ikon dari `cadence.js` |
| `src/assets/` | Ikon yang disisipkan ke aplikasi saat build |
| `build.py` | Menggabungkan `src/` menjadi `index.html` |
| `index.html` | Hasil build yang dibuka GitHub Pages. **Jangan disunting langsung.** |
| `tests/` | Uji Playwright, dengan Supabase tiruan (`mock-sb.js`) |

## Perintah

```bash
npm install                      # sekali, memasang Playwright
npx playwright install chromium  # sekali, memasang browser uji

npm run build   # src/ → index.html
npm test        # build lalu jalankan semua uji
npm run icons   # buat ulang ikon dari src/cadence.js, lalu build
```

Setiap push menjalankan uji di GitHub Actions. Uji juga memeriksa bahwa `index.html` sudah dibangun ulang dari `src/`.

## Arsitektur (di dalam `src/template.html`)

| Module | Tanggung jawab | Interface |
|---|---|---|
| **Hari** | Memecah Sesi per hari (zona Asia/Bangkok, jam pergantian hari) | `dayKey`, `perDay`, `split` |
| **Kategori** | Kategori aktif dan yang sudah dihapus (tetap dihitung di statistik) | `find`, `group`, `label`, `remove`, `remember` |
| **Timer** | Satu-satunya pemilik Sesi aktif: mode, jeda, Countdown, pindah topik | `toggle`, `reset`, `setMode`, `setCountdown`, `switchTo`, `cut`, `stoppedBy`, `tick`, `state`, `on` |
| **Sync** | Sinkron Supabase, dipasang lewat seam `sync` (adapter offline bila belum terpasang) | `changed`, `started`, `ended`, `beforeStart`, `notice`, `remote`, `device` |

Tampilan (`render`, `renderTimerCard`, `renderToday`, `renderStats`) hanya membaca keadaan dan mendengarkan `Timer.on(...)`. Daftar yang berisi tombol memakai `keyed(...)` agar tidak dibangun ulang di tengah klik. `window.StudyO` membuka module inti untuk `tests/timer.js`.

## Alur mengubah aplikasi

1. Sunting `src/template.html` (atau `src/cadence.js` untuk logo).
2. `npm test`. Semua uji harus lolos.
3. Commit `src/` dan `index.html` bersamaan, lalu push.

Kalau skema database berubah, jalankan SQL-nya di Supabase sebelum push.
