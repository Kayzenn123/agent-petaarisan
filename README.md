# Peta Arisan — 30 Days of Code #13 (j1600)

Seluruh situs = satu **peta arisan interaktif** (pan + pinch/scroll-zoom). Tanpa navbar,
tanpa hero marketing: pengunjung mendarat di intro zoom-through "KOCOK!", lalu
menjelajah 16 titik anggota bergaya cap stempel risograph.

**Live:** [ISI MANUAL — belum deploy]

## Fungsional
- Peta canvas: drag pan, wheel/pinch zoom (0.6x–2.5x), tombol +/-, keyboard
  (panah/PageUp/PageDown/Home), tombol reset
- 16 titik anggota (nama & nominal **fiktif — CONTOH**): klik → kartu tilt 3D
  (nama, setoran, status bayar, riwayat menang)
- Kalkulator iuran: target + anggota + frekuensi → iuran/orang (bulat ribuan)
- Kocokan fair: PRNG mulberry32 seedable, seed = hash(ronde+tanggal), ditampilkan
  untuk verifikasi; pool adil (belum menang didahulukan); animasi nama flip 3D
- Jadwal 12 ronde (Nov 2026–Okt 2027): ganti ronde = GSAP Flip formasi titik
- Riwayat kocokan (localStorage `arisan-v1`, tervalidasi) + hapus
- Ekspor: unduh JSON + salin ringkasan gaya WA (fallback textarea)
- Deep-link `?anggota=` & `?ronde=` (divalidasi; salah → pesan Bu Bendahara)
- Easter egg: ketik `lunas` saat fokus di peta → hujan koin + cap "LUNAS SEMUA"
- Aksesibilitas: prefers-reduced-motion, toggle gerak persist, jeda marquee,
  skip link, aria-live, tap target ≥44px, keyboard penuh

## Teknologi
Single-page tanpa build: `index.html` + `styles.css` + `app.js` (ESM).
GSAP 3.12.5 self-host (`vendor/`, lazy setelah window load — CDN gagal konsisten di
lingkungan ini). Font self-host (latin woff2): Playwrite HR Lijeva, Anek Bangla,
Mansalva. Tanpa tracker, tanpa `innerHTML` untuk data, tanpa gambar raster.

## Skor
- **qa.js chromium: EXIT 0** — 4 viewport: 0 overflow, 0 console issue, 0 tap <44px,
  1 h1, lang=id; reduced-motion: 0 animasi berjalan; **fps4x: 56.3**
- **qa.js webkit: EXIT 0** — 4 viewport: 0 overflow, 0 console issue, 0 tap <44px
  (fps4x dilewati: throttle CPU hanya di chromium)
- **Lighthouse desktop:** 95 / 100 / 100 / 100 (performance/a11y/best-practices/seo)
- **Lighthouse mobile:** **97** / 100 / 100 / 100 — diukur via server gzip lokal
  (produksi riil: GitHub Pages/dll selalu serve gzip/brotli). Via `python http.server`
  tanpa kompresi: 79 — murni artefak server tes, bukan kode.
- Kritik: karakter 8, keunikan 8, kerapian 8 (detail: `../CRITIQUE.md`)

## Kredit aset
- Font: Playwrite HR Lijeva, Anek Bangla, Mansalva — via Fontsource (OFL)
- GSAP 3.12.5 — GreenSock (lisensi standar, file lokal di `vendor/`)
- Ikon: 17 monoline hand-built (SVG inline, buatan sendiri)
- Grain: filter SVG `feTurbulence` inline; halftone: CSS radial-gradient
- Semua nama anggota & angka = contoh fiktif, bukan data nyata
