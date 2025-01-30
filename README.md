Oh, saya paham sekarang! Berikut adalah **README.md** yang menjelaskan cara penggunaan bot ini, langkah-langkah konfigurasi, dan fungsionalitas bot.

---

# Tea-Fi Daily Task Bot

Bot ini secara otomatis menjalankan beberapa tugas harian di Tea-Fi, seperti klaim sugar cubes, melakukan transaksi deposit/withdraw di WMATIC, dan mengelola interaksi dengan API Tea-Fi.

## Langkah-langkah Penggunaan

### 1. **Clone Repository**
Clone repository ini ke komputer Anda:

```bash
git clone https://github.com/caraka15/teafi-bot.git
cd teafi-bot
```

### 2. **Instal Dependensi**
Install dependensi yang dibutuhkan menggunakan `npm`:

```bash
npm install
```

### 3. **Konfigurasi File**
Buat dan atur konfigurasi bot dengan mengikuti langkah-langkah berikut:

#### a. **Buat File `.env`**

Buat file `.env` di direktori root dan masukkan **PRIVATE_KEY** dari wallet yang akan digunakan oleh bot:

```ini
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
```

**Catatan**: Pastikan Anda mengganti `YOUR_PRIVATE_KEY_HERE` dengan kunci pribadi (private key) yang valid.

#### b. **Setting File `config.json`**

Setting file `config.json` di direktori root dengan konfigurasi seperti berikut:

```json
{
  "RPC_URL": "https://polygon-rpc.com",
  "WMATIC_ADDRESS": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  "ITERATIONS": 1,
  "API_URL_CHECK_IN": "https://api.tea-fi.com/wallet/check-in",
  "API_URL_CURRENT": "https://api.tea-fi.com/wallet/check-in/current",
  "API_TOTAL_POINT": "https://api.tea-fi.com/points",
  "API_URLS": {
    "GAS_QUOTE": "https://api.tea-fi.com/transaction/gas-quote",
    "TRANSACTION": "https://api.tea-fi.com/transaction"
  }
}
```

**Catatan:**
- `RPC_URL`: URL RPC untuk menghubungkan bot ke jaringan Polygon.
- `WMATIC_ADDRESS`: Alamat kontrak WMATIC yang digunakan untuk deposit dan withdraw.
- `ITERATIONS`: Jumlah iterasi untuk proses deposit/withdraw.
- API URLs adalah untuk interaksi dengan API Tea-Fi.

### 4. **Jalankan Bot dalam Screen**

Bot dapat dijalankan menggunakan `screen` agar tetap berjalan di latar belakang:

```bash
screen -Rd tea
```

Kemudian jalankan bot dengan:

```bash
node bot.js
```

Bot akan mulai menjalankan siklus yang telah ditentukan dalam file konfigurasi (`ITERATIONS`).

---

## Fungsi-Fungsi Utama Bot

### 1. **Melakukan Claim Sugar Cubes Harian**
Bot akan secara otomatis melakukan klaim sugar cubes setiap hari dan mengupdate status streak.

### 2. **Melakukan Deposit dan Withdraw di WMATIC**
Bot akan melakukan deposit dan withdraw untuk setiap iterasi yang ditentukan, dengan transaksi dilakukan di kontrak WMATIC. Deposit dan withdraw dilakukan secara otomatis dengan gas fee yang sudah ditentukan.

### 3. **Push Transaksi ke API Tea-Fi**
Setelah melakukan deposit dan withdraw, bot akan mengirimkan data transaksi ke API Tea-Fi untuk memperbarui riwayat dan menghitung total poin.

### 4. **Gas Fee dan Transaksi**
Bot mengatur gas fee secara otomatis, menggunakan nilai tetap di 31 Gwei untuk setiap transaksi deposit dan withdraw.

### 5. **Pengaturan Interval**
Bot mengatur waktu interval antara setiap transaksi agar tidak terdeteksi sebagai bot oleh sistem.

---


## Troubleshooting

Jika Anda mengalami masalah atau kesalahan, pastikan Anda sudah memeriksa beberapa hal berikut:

- Pastikan `PRIVATE_KEY` yang digunakan valid.
- Pastikan koneksi ke RPC URL Polygon tidak terputus.
- Jika bot tidak berjalan dengan baik, coba periksa apakah ada pembaruan pada API Tea-Fi atau jika ada perubahan pada kontrak smart contract yang digunakan.

---

## Donasi

Jika Anda merasa terbantu dengan bot ini, Anda dapat memberikan dukungan melalui:

- Crypto: `0xede7fa099638d4f39931d2df549ac36c90dfbd26`
- Saweria: [https://saweria.co/caraka15](https://saweria.co/caraka15)
