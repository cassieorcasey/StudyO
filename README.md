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

## Alur mengubah aplikasi

1. Sunting `src/template.html` (atau `src/cadence.js` untuk logo).
2. `npm test`. Semua uji harus lolos.
3. Commit `src/` dan `index.html` bersamaan, lalu push.

Kalau skema database berubah, jalankan SQL-nya di Supabase sebelum push.
