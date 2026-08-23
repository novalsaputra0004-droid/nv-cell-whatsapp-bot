#!/usr/bin/env node

const fs = require("fs");

const FILE = "/app/data/points.json";

const id = process.argv[2];
const newPoints = Number(process.argv[3]);

if (!id || !Number.isInteger(newPoints) || newPoints < 0) {
    console.log("❌ Cara pakai:");
    console.log("   setpoin ID JUMLAH");
    console.log("");
    console.log("Contoh:");
    console.log("   setpoin adminnvcell 500");
    process.exit(1);
}

if (!fs.existsSync(FILE)) {
    console.log("❌ File points.json tidak ditemukan:");
    console.log(FILE);
    process.exit(1);
}

try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

    if (!data[id]) {
        console.log("❌ ID pelanggan tidak ditemukan:", id);
        process.exit(1);
    }

    const oldPoints = Number(data[id].points || 0);

    data[id].points = newPoints;

    // Tulis ke file temporary dulu supaya lebih aman
    const tempFile = FILE + ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(data, null, 2),
        "utf8"
    );

    fs.renameSync(tempFile, FILE);

    console.log("");
    console.log("✅ POIN BERHASIL DIUBAH");
    console.log("────────────────────────");
    console.log("ID      :", id);
    console.log("Sebelum :", oldPoints);
    console.log("Sesudah :", newPoints);
    console.log("────────────────────────");
    console.log("");
} catch (error) {
    console.log("❌ Gagal mengubah poin:");
    console.log(error.message);
    process.exit(1);
}