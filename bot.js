require('dotenv').config();
const { ethers } = require('ethers');
const fetch = require('node-fetch');
const chalk = require('chalk');
const fs = require('fs');

// Memuat konfigurasi dan ABI dari file JSON
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const TPOL_ABI = JSON.parse(fs.readFileSync('abi.json', 'utf8'));

const ITERATIONS = config.ITERATIONS;
const RPC_URL = config.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Membuat provider dan wallet instance untuk Polygon
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Mendapatkan alamat wallet secara otomatis dari private key
const WALLET_ADDRESS = wallet.address;
const WMATIC_ADDRESS = config.WMATIC_ADDRESS;
const TPOL_ADDRESS = config.TPOL_ADDRESS;
const APi_TOTAL_POINT = config.APi_TOTAL_POINT;
const API_URL_CHECK_IN = config.API_URL_CHECK_IN;
const API_URL_CURRENT = config.API_URL_CURRENT;
const API_URLS = config.API_URLS;

// Headers untuk semua request API
const headers = {
    "Content-Type": "application/json",
    "Origin": "https://app.tea-fi.com",
    "Referer": "https://app.tea-fi.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

// Fungsi untuk melakukan POST request (check-in)
const dailyCheckIn = async (retryCount = 3) => {
    try {
        console.log(chalk.yellow("\n[⏳] Mengirim request check-in..."));

        const payload = { address: WALLET_ADDRESS };
        console.log(chalk.green("Payload yang dikirim:"), JSON.stringify(payload));

        const response = await fetch(`${API_URL_CHECK_IN}?address=${WALLET_ADDRESS}`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.status === 201) {
            console.log(chalk.green(`[✓] Check-in Berhasil!`));
            console.log(chalk.cyan(`    Wallet ID: ${data.walletId}`));
            console.log(chalk.cyan(`    Points   : ${data.points}`));
            console.log(chalk.cyan(`    Time     : ${data.createdAt}`));
            console.log(chalk.cyan(`    Check-in ID: ${data.id}\n`));
        } else if (response.status === 400 && data.message === "Already checked in today") {
            console.log(chalk.yellow(`[✓] Sudah melakukan check-in hari ini. Melanjutkan ke hari berikutnya...\n`));
        } else if (response.status === 400) {
            if (retryCount > 0) {
                console.log(chalk.red(`[X] Gagal Check-in! Status: ${response.status}, Respon: ${JSON.stringify(data)}. Retrying...`));
                await delay(2000);
                await dailyCheckIn(retryCount - 1);
            } else {
                console.log(chalk.red(`[X] Gagal setelah 3 kali percobaan. Melanjutkan ke hari berikutnya...\n`));
            }
        }

        await getCurrentData();

        // Jalankan cycles dengan iterasi
        for (let i = 0; i < ITERATIONS; i++) {
            await performCycle(i);
            // Tambah delay 5 detik antara setiap iterasi
            if (i < ITERATIONS - 1) {
                await delay(5000);
            }
        }

        await getTotalPoint();
        await startCountdown();
    } catch (error) {
        console.error(chalk.red("\n[ERROR] Gagal menghubungi API:", error));
        await getCurrentData();

        // Tetap jalankan cycles meski check-in gagal
        for (let i = 0; i < ITERATIONS; i++) {
            await performCycle(i);
            if (i < ITERATIONS - 1) {
                await delay(5000);
            }
        }

        await getTotalPoint();
        await startCountdown();
    }
};

// Fungsi untuk menambahkan delay sebelum mencoba lagi
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi untuk memulai countdown ke hari berikutnya dengan format custom
const startCountdown = async () => {
    // Generate random reset time once when starting countdown
    const randomHour = Math.floor(Math.random() * 8) + 1; // 1-8
    const randomMinute = Math.floor(Math.random() * 60); // 0-59

    console.log(chalk.cyan(`\n[ℹ] Daily reset ditetapkan pada ${randomHour.toString().padStart(2, '0')}:${randomMinute.toString().padStart(2, '0')} UTC`));

    const updateCountdown = () => {
        const now = new Date();
        const nextReset = new Date(now);

        // Set to today's reset time
        nextReset.setUTCHours(randomHour, randomMinute, 0, 0);

        // If we're past today's reset time, set for tomorrow
        if (now > nextReset) {
            nextReset.setUTCDate(nextReset.getUTCDate() + 1);
        }

        const timeUntilReset = nextReset - now;

        // Calculate remaining time
        const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeUntilReset % (1000 * 60)) / 1000);

        // Display updated countdown on same line
        process.stdout.write(chalk.blue(`\r[⏳] Check-in berikutnya dalam: ${hours}j ${minutes}m ${seconds}s`));

        // If countdown finished, do check-in
        if (timeUntilReset <= 0) {
            clearInterval(countdownInterval);
            dailyCheckIn();
        }
    };

    // Update countdown every second
    const countdownInterval = setInterval(updateCountdown, 1000);

    // Call once to display countdown immediately
    updateCountdown();
};

// Fetch gas quote from API
const getGasQuote = async () => {
    try {
        const response = await fetch(
            `${API_URLS.GAS_QUOTE}?chain=137&txType=2&gasPaymentToken=0x0000000000000000000000000000000000000000&neededGasPermits=0`,
            {
                headers: headers
            }
        );
        const data = await response.json();
        return data.gasInGasPaymentToken;
    } catch (error) {
        console.error(chalk.red("Error fetching gas quote:", error));
        throw error;
    }
};

const notifyTransaction = async (hash, isWrap, gasFeeAmount) => {
    try {
        const payload = {
            blockchainId: 137,
            type: isWrap ? 2 : 3,  // type 2 untuk wrap, 3 untuk unwrap
            walletAddress: WALLET_ADDRESS,
            hash: hash,
            fromTokenAddress: isWrap ?
                "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270" :
                "0x1Cd0cd01c8C902AdAb3430ae04b9ea32CB309CF1",
            toTokenAddress: isWrap ?
                "0x1Cd0cd01c8C902AdAb3430ae04b9ea32CB309CF1" :
                "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
            fromTokenSymbol: isWrap ? "WPOL" : "tPOL",
            toTokenSymbol: isWrap ? "tPOL" : "WPOL",
            fromAmount: "1000000000000000000",
            toAmount: "1000000000000000000",
            gasFeeTokenAddress: "0x0000000000000000000000000000000000000000",
            gasFeeTokenSymbol: "POL",
            gasFeeAmount: gasFeeAmount
        };

        console.log(chalk.yellow("\n[⏳] Notifying API about transaction..."));
        // console.log(chalk.cyan("Payload:"), JSON.stringify(payload, null, 2));

        const response = await fetch(API_URLS.TRANSACTION, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.status === 201) {
            console.log(chalk.green(`[✓] API notification successful - Points: ${result.pointsAmount}`));
        } else {
            console.log(chalk.red("[X] API notification failed:", result));
        }
    } catch (error) {
        console.error(chalk.red("[X] Failed to notify API:", error));
    }
};

const performCycle = async (iteration) => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const tpolContract = new ethers.Contract(TPOL_ADDRESS, TPOL_ABI, wallet);
    const amount = ethers.parseEther("1");

    const GAS_PRICE = ethers.parseUnits("60", "gwei");

    try {
        console.log(chalk.yellow(`\n🔄 Starting cycle ${iteration + 1}/${ITERATIONS}`));

        // Wrap Process
        const wrapGasFee = await getGasQuote();
        console.log(chalk.blue(`Got gas quote for wrap: ${wrapGasFee}`));

        const wrapTx = await tpolContract.wrap(
            amount,
            WALLET_ADDRESS,
            {
                gasPrice: GAS_PRICE
            }
        );
        console.log(chalk.green(`⏳ Wrap transaction sent: ${wrapTx.hash}`));

        const wrapReceipt = await wrapTx.wait();
        console.log(chalk.green("✅ Wrap confirmed!"));

        await delay(5000);
        await notifyTransaction(wrapReceipt.hash, true, wrapGasFee);

        await delay(5000);

        // Unwrap Process
        const unwrapGasFee = await getGasQuote();
        console.log(chalk.blue(`Got gas quote for unwrap: ${unwrapGasFee}`));

        const unwrapTx = await tpolContract.unwrap(
            amount,
            WALLET_ADDRESS,
            {
                gasPrice: GAS_PRICE
            }
        );
        console.log(chalk.green(`⏳ Unwrap transaction sent: ${unwrapTx.hash}`));

        const unwrapReceipt = await unwrapTx.wait();
        console.log(chalk.green("✅ Unwrap confirmed!"));

        await delay(5000);
        await notifyTransaction(unwrapReceipt.hash, false, unwrapGasFee);

    } catch (error) {
        console.error(chalk.red(`❌ Cycle ${iteration + 1} failed:`, error));
    }
};

// Fungsi untuk melakukan GET request untuk mendapatkan status saat ini
const getCurrentData = async () => {
    try {
        console.log(chalk.yellow("[⏳] Mengambil data check-in saat ini..."));

        const response = await fetch(`${API_URL_CURRENT}?address=${WALLET_ADDRESS}`, {
            headers: headers
        });
        const data = await response.json();

        if (response.status === 200) {
            console.log(chalk.green("\n[✓] Data Check-in Saat Ini:"));
            console.log(chalk.cyan(`    Current Day: ${data.currentDay.start} to ${data.currentDay.end}`));
            console.log(chalk.cyan(`    Activity Level: ${data.activityLevel}`));
            console.log(chalk.cyan(`    Total Points Daily: ${data.totalPoints}`));
            console.log(chalk.cyan(`    Last Check-in: ${data.lastCheckIn}`));
            console.log(chalk.cyan(`    Streak: ${data.streak}`));
            console.log(chalk.cyan(`    Daily Rewards: ${data.dailyRewards.join(', ')}`));
        } else {
            console.log(chalk.red(`[X] Gagal mendapatkan data! Status: ${response.status}, Respon: ${JSON.stringify(data)}`));
        }
    } catch (error) {
        console.error(chalk.red("\n[ERROR] Gagal menghubungi API untuk data saat ini:", error));
    }
};

const getTotalPoint = async () => {
    try {
        console.log(chalk.yellow("[⏳] Mengambil Total Points saat ini..."));

        const response = await fetch(`${APi_TOTAL_POINT}/${WALLET_ADDRESS}`, {
            headers: headers
        });
        const data = await response.json();

        if (response.status === 200) {
            console.log(chalk.green(`Total Points: ${data.pointsAmount}`));
        } else {
            console.log(chalk.red(`[X] Gagal mendapatkan total point! Status: ${response.status}, Respon: ${JSON.stringify(data)}`));
        }
    } catch (error) {
        console.error(chalk.red("\n[ERROR] Gagal menghubungi API untuk data saat ini:", error));
    }
};

// Jalankan check-in pertama kali saat bot dimulai
(async () => {
    console.log(chalk.green("🚀 Bot Daily Check-in dimulai..."));
    await dailyCheckIn();  // Mulai check-in dengan retry 3 kali jika gagal
})();