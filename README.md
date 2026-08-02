# Game Kuis Balap 4 Pemain

Game kuis interaktif sederhana yang menampilkan 4 lajur mobil balap di layar. Setiap pemain mendapat soal sendiri dan menjawab langsung di layar.

## Fitur
- 4 pemain bermain bersamaan di satu layar
- Soal diambil dari Google Sheets
- Mobil maju saat jawaban benar
- Cocok untuk GitHub Pages atau hosting statis

## Cara pakai
1. Buat Google Sheet baru.
2. Tambahkan kolom berikut di baris pertama:
   - `question`
   - `a`
   - `b`
   - `c`
   - `d`
   - `answer`
3. Isi soal di baris-baris berikutnya. Contoh:
   - `question`: Apa ibu kota Indonesia?
   - `a`: Jakarta
   - `b`: Bandung
   - `c`: Surabaya
   - `d`: Medan
   - `answer`: A (atau `1`, `2`, `3`, `4`)
4. Klik **File > Publish to the web...** dan publikasikan sheet.
5. Setiap pemain tap langsung jawaban di panel masing-masing di layar smartboard.
5. Salin ID sheet dari URL Google Sheet.
   - Contoh: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`
6. Tempel ID ke form, isi nama sheet (misalnya `Sheet1`), lalu klik **Muat Soal**.
7. Setelah soal berhasil dimuat, klik **Start Game** untuk memulai.

## Fitur tambahan
- Tidak ada timer, jawaban langsung diproses.
- Keyboard shortcut untuk menjawab:
  - Pemain 1: `1`, `2`, `3`, `4`
  - Pemain 2: `Q`, `W`, `E`, `R`
  - Pemain 3: `A`, `S`, `D`, `F`
  - Pemain 4: `Z`, `X`, `C`, `V`

## Menjalankan lokal
Buka `index.html` di browser. Halaman ini adalah setup game; setelah soal dimuat, klik `Start Game` untuk pindah ke `game.html`.

## Deploy ke GitHub Pages
1. Buat repository baru di GitHub.
2. Upload file berikut:
   - `index.html`
   - `game.html`
   - `style.css`
   - `setup.js`
   - `script.js`
   - `README.md`
3. Aktifkan GitHub Pages pada branch utama.
4. Buka URL GitHub Pages repository untuk memainkan game.

## Format Google Sheets
Gunakan kolom:
- `question`
- `a`
- `b`
- `c`
- `d`
- `answer`

Jawaban benar ditulis sebagai huruf `A`, `B`, `C`, atau `D`.
