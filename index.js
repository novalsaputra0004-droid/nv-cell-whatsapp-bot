require("dotenv").config();
const http = require("http");
const QRCode = require("qrcode");

const PORT = process.env.PORT || 3000;

let currentQR = null;
let whatsappStatus = "Starting...";

const server = http.createServer((req, res) => {
    if (req.url === "/health") {
    const isReady =
      whatsappStatus === "READY";

    res.writeHead(
      isReady ? 200 : 503,
      {
        "Content-Type":
          "application/json; charset=utf-8",
      }
    );

    return res.end(
      JSON.stringify({
        status:
          isReady ? "ok" : "starting",
        whatsapp:
          whatsappStatus,
        uptime:
          process.uptime(),
        timestamp:
          new Date().toISOString(),
      })
    );
  }
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
  });

  if (currentQR) {
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>NV CELL WhatsApp</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            background: #111;
            color: white;
            padding: 30px;
          }

          img {
            background: white;
            padding: 15px;
            border-radius: 15px;
            width: 350px;
            max-width: 90%;
          }

          h1 {
            color: #25D366;
          }
        </style>
      </head>

      <body>
        <h1>📱 NV CELL WhatsApp</h1>
        <h2>Scan QR Code</h2>

        <p>
          WhatsApp → Perangkat tertaut → Tautkan perangkat
        </p>

        <img src="${currentQR}">

        <p>QR akan diperbarui otomatis.</p>

        <script>
          setTimeout(() => location.reload(), 5000);
        </script>
      </body>
      </html>
    `);
  } else {
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>NV CELL WhatsApp</title>
      </head>

      <body style="
        font-family: Arial;
        text-align: center;
        background: #111;
        color: white;
        padding: 50px;
      ">
        <h1>🟢 NV CELL WhatsApp</h1>
        <h2>${whatsappStatus}</h2>
        <p>Menunggu QR WhatsApp...</p>

        <script>
          setTimeout(() => location.reload(), 5000);
        </script>
      </body>
      </html>
    `);
  }
});

const {
  Client,
  LocalAuth,
  MessageMedia,
} = require("whatsapp-web.js");

const qrcode = require("qrcode-terminal");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ==================================================
// SUPABASE
// ==================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log(
  "SUPABASE_URL:",
  process.env.SUPABASE_URL ? "ADA" : "TIDAK ADA"
);

console.log(
  "SUPABASE_KEY:",
  process.env.SUPABASE_KEY ? "ADA" : "TIDAK ADA"
);

// ==================================================
// WHATSAPP CLIENT
// ==================================================

console.log("📦 VOLUME MOUNT:", process.env.RAILWAY_VOLUME_MOUNT_PATH);

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "/app/data/.wwebjs_auth",
    clientId: "nv-cell"
  }),

  puppeteer: {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  }
});
client.on("loading_screen", (percent, message) => {
  console.log(
    `⏳ LOADING: ${percent}% - ${message}`
  );
});

client.on("message", (message) => {
  console.log("🔥🔥 MESSAGE MASUK");
  console.log("FROM:", message.from);
  console.log("BODY:", message.body);
});

client.on("ready", async () => {
  console.log("🟢 CLIENT READY");

  try {
    console.log(
      "🌐 WA WEB VERSION:",
      await client.getWWebVersion()
    );
  } catch (error) {
    console.log(
      "❌ GET WA VERSION ERROR:",
      error.message
    );
  }
});

client.on("disconnected", (reason) => {
    console.log("🔴 WHATSAPP DISCONNECTED:", reason);
});


// ==================================================
// RAILWAY PERSISTENT DATA
// ==================================================

// Railway Volume akan memberikan path melalui
// RAILWAY_VOLUME_MOUNT_PATH.
//
// Jika dijalankan lokal dan variable tidak ada,
// gunakan folder ./data sebagai fallback.

const DATA_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(process.cwd(), "data");

console.log("======================================");
console.log("💾 DATA STORAGE");
console.log("📁 DATA_DIR:", DATA_DIR);
console.log("======================================");

// ==================================================
// BUAT FOLDER DATA
// ==================================================

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true,
    });

    console.log(
      "📁 Folder data dibuat:",
      DATA_DIR
    );
  } else {
    console.log(
      "📁 Folder data ditemukan:",
      DATA_DIR
    );
  }
} catch (error) {
  console.error(
    "❌ GAGAL MEMBUAT FOLDER DATA:",
    error.message
  );

  process.exit(1);
}

// ==================================================
// WHATSAPP AUTH SESSION
// ==================================================

const AUTH_DIR =
  path.join(
    DATA_DIR,
    ".wwebjs_auth"
  );

// ==================================================
// FILE DATABASE JSON
// ==================================================

const cooldownFile =
  path.join(
    DATA_DIR,
    "cooldown.json"
  );

const ordersFile =
  path.join(
    DATA_DIR,
    "orders.json"
  );

const notifiedFile =
  path.join(
    DATA_DIR,
    "notified.json"
  );

const pointsFile =
  path.join(
    DATA_DIR,
    "points.json"
  );

const rewardsFile =
  path.join(
    DATA_DIR,
    "rewards.json"
  );

const customersFile =
  path.join(
    DATA_DIR,
    "customers.json"
  );

// ==================================================
// DEBUG DATA PATH
// ==================================================

console.log(
  "======================================"
);

console.log(
  "💾 PERSISTENT DATA CONFIGURATION"
);

console.log(
  "📁 DATA DIR:",
  DATA_DIR
);

console.log(
  "🔐 AUTH DIR:",
  AUTH_DIR
);

console.log(
  "👥 CUSTOMERS:",
  customersFile
);

console.log(
  "⭐ POINTS:",
  pointsFile
);

console.log(
  "🎁 REWARDS:",
  rewardsFile
);

console.log(
  "🛒 ORDERS:",
  ordersFile
);

console.log(
  "🔔 NOTIFIED:",
  notifiedFile
);

console.log(
  "⏱️ COOLDOWN:",
  cooldownFile
);

console.log(
  "======================================"
);
// ==================================================
// COOLDOWN
// ==================================================

const COOLDOWN_TIME = 10 * 60 * 1000;

// ==================================================
// REWARD
// ==================================================

const REWARDS = {
  5: {
    points: 5,
    discount: 1000,
    name: "Diskon Rp1.000",
  },

  10: {
    points: 10,
    discount: 2500,
    name: "Diskon Rp2.500",
  },

  20: {
    points: 20,
    discount: 5000,
    name: "Diskon Rp5.000",
  },
};

// ==================================================
// HELPER JSON
// ==================================================

function loadJson(file) {
  try {
    if (!fs.existsSync(file)) {
      return {};
    }

    const content = fs.readFileSync(file, "utf8");

    if (!content.trim()) {
      return {};
    }

    return JSON.parse(content);
  } catch (error) {
    console.log(
      `❌ Gagal membaca ${file}:`,
      error.message
    );

    return {};
  }
}

function saveJson(file, data) {
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2),
      "utf8"
    );
  } catch (error) {
    console.log(
      `❌ Gagal menyimpan ${file}:`,
      error.message
    );
  }
}

// ==================================================
// LOAD DATA
// ==================================================

let cooldowns = loadJson(cooldownFile);
let orders = loadJson(ordersFile);
let notifiedTransactions = loadJson(notifiedFile);
let customerPoints = loadJson(pointsFile);
let customerRewards = loadJson(rewardsFile);
let customers = loadJson(customersFile);

// ==================================================
// SESSION PELANGGAN
// ==================================================

let customerSessions = {};

// ==================================================
// NORMALISASI NOMOR
// ==================================================

function normalizePhone(phone) {
  let number = String(phone || "")
    .replace(/\D/g, "");

  if (!number) {
    return null;
  }

  if (number.startsWith("0")) {
    number = "62" + number.substring(1);
  }

  if (!number.startsWith("62")) {
    number = "62" + number;
  }

  return number;
}

// ==================================================
// CUSTOMER KEY
// ==================================================

function getCustomerKey(phone) {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return null;
  }

  return `${normalized}@c.us`;
}

// ==================================================
// HASH PASSWORD
// ==================================================

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

// ==================================================
// VERIFY PASSWORD
// ==================================================

function verifyPassword(password, storedPassword) {
  try {
    if (!storedPassword) {
      return false;
    }

    const parts = storedPassword.split(":");

    if (parts.length !== 2) {
      return false;
    }

    const salt = parts[0];
    const originalHash = parts[1];

    const hash = crypto
      .scryptSync(password, salt, 64)
      .toString("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch (error) {
    return false;
  }
}

// ==================================================
// NORMALISASI CUSTOMER ID
// ==================================================

function normalizeCustomerId(id) {
  return String(id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

// ==================================================
// CARI CUSTOMER BERDASARKAN ID
// ==================================================

function findCustomer(customerId) {
  const id = normalizeCustomerId(customerId);

  if (!id) {
    return null;
  }

  return customers[id] || null;
}

// ==================================================
// CARI CUSTOMER BERDASARKAN NOMOR HP
// ==================================================

function findCustomerByPhone(phone) {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return null;
  }

  for (const customerId of Object.keys(customers)) {
    const customer = customers[customerId];

    if (
      customer &&
      normalizePhone(customer.phone) === normalized
    ) {
      return {
        id: customerId,
        data: customer,
      };
    }
  }

  return null;
}

// ==================================================
// CARI CUSTOMER BERDASARKAN CHAT ID
// ==================================================

function findCustomerByChatId(chatId) {
  if (!chatId) {
    return null;
  }

  for (const customerId of Object.keys(customers)) {
    const customer = customers[customerId];

    if (
      customer &&
      customer.whatsappChatId === chatId
    ) {
      return {
        id: customerId,
        data: customer,
      };
    }
  }

  return null;
}

// ==================================================
// LOGOUT AKUN LAMA DARI WHATSAPP
// ==================================================

function logoutAllAccountsFromChatId(chatId) {
  if (!chatId) {
    return [];
  }

  const loggedOutAccounts = [];

  for (const customerId of Object.keys(customers)) {
    const customer = customers[customerId];

    if (
      customer &&
      customer.whatsappChatId === chatId
    ) {
      customer.whatsappChatId = null;

      customers[customerId] = customer;

      loggedOutAccounts.push(customerId);

      console.log(
        `🔓 Akun ${customerId} otomatis logout dari WhatsApp ${chatId}`
      );
    }
  }

  if (loggedOutAccounts.length > 0) {
    saveJson(customersFile, customers);
  }

  return loggedOutAccounts;
}

// ==================================================
// DATA POIN CUSTOMER
// ==================================================

function ensureCustomerPointData(customerId) {
  if (!customerId) {
    return false;
  }

  if (!customerPoints[customerId]) {
    customerPoints[customerId] = {
      points: 0,
      transactions: 0,
    };
  }

  if (
    typeof customerPoints[customerId].points !==
    "number"
  ) {
    customerPoints[customerId].points = 0;
  }

  if (
    typeof customerPoints[customerId].transactions !==
    "number"
  ) {
    customerPoints[customerId].transactions = 0;
  }

  return true;
}

// ==================================================
// GET CHAT ID
// ==================================================

function getChatId(message) {
  return message.from || null;
}

// ==================================================
// START REGISTER
// ==================================================

function startRegistration(message) {
  const chatId = getChatId(message);

  if (!chatId) {
    return;
  }

  customerSessions[chatId] = {
    type: "register",
    step: "id",
  };
}

// ==================================================
// START LOGIN
// ==================================================

function startPointLogin(message) {
  const chatId = getChatId(message);

  if (!chatId) {
    return;
  }

  customerSessions[chatId] = {
    type: "pointLogin",
    step: "id",
  };
}

// ==================================================
// CLEAR SESSION
// ==================================================

function clearSession(message) {
  const chatId = getChatId(message);

  if (chatId) {
    delete customerSessions[chatId];
  }
}

// ==================================================
// GET SESSION
// ==================================================

function getSession(message) {
  const chatId = getChatId(message);

  if (!chatId) {
    return null;
  }

  return customerSessions[chatId] || null;
}

// ==================================================
// WHATSAPP STATUS
// ==================================================


let reconnecting = false;
let shuttingDown = false;
let transactionMonitorStarted = false;

// ==================================================
// QR
// ==================================================

client.on("qr", async (qr) => {
  console.log("");
  console.log("📱 QR CODE BARU - BUKA URL RAILWAY UNTUK SCAN");
  console.log("");

  try {
    currentQR = await QRCode.toDataURL(qr);

    whatsappStatus = "Menunggu scan QR...";

    console.log("✅ QR WEB berhasil dibuat.");
  } catch (error) {
    console.error(
      "❌ GAGAL MEMBUAT QR:",
      error.message
    );

    whatsappStatus = "QR Error";
  }
});

// ==================================================
// AUTHENTICATED
// ==================================================

client.on("authenticated", () => {
  console.log(
    "🔐 WHATSAPP AUTHENTICATED"
  );

  whatsappStatus = "Authenticated";
});

// ==================================================
// AUTH FAILURE
// ==================================================

client.on("auth_failure", (message) => {
  console.error(
    "❌ WHATSAPP AUTH FAILURE:",
    message
  );

  whatsappStatus = "Auth Failure";
});

// ==================================================
// CHANGE STATE
// ==================================================

client.on("change_state", (state) => {
  console.log(
    "🔄 WHATSAPP STATE:",
    state
  );

  whatsappStatus = String(state);
});

// ==================================================
// READY
// ==================================================

client.on("ready", () => {
  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "✅ BOT WHATSAPP BERHASIL TERHUBUNG"
  );
  console.log(
    "======================================"
  );
  console.log("");

  whatsappStatus = "READY";

  // QR sudah tidak diperlukan
  currentQR = null;

  console.log(
    "🔄 Monitor transaksi aktif."
  );

 if (!transactionMonitorStarted) {
  transactionMonitorStarted = true;

  console.log(
    "🔄 Monitor transaksi dimulai."
  );

  checkCompletedTransactions();

  setInterval(
    checkCompletedTransactions,
    10 * 1000
  );
}
});
// ==================================================
// DISCONNECTED
// ==================================================

client.on("disconnected", (reason) => {
  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "🔴 WHATSAPP DISCONNECTED"
  );
  console.log(
    "Alasan:",
    reason
  );
  console.log(
    "======================================"
  );

  whatsappStatus =
    `Disconnected: ${reason}`;

  if (shuttingDown) {
    console.log(
      "🛑 Shutdown sedang berjalan."
    );

    return;
  }

  if (reconnecting) {
    console.log(
      "⏳ Reconnect sudah sedang berjalan."
    );

    return;
  }

  reconnecting = true;

  console.log(
    "🔄 Reconnect akan dicoba dalam 10 detik..."
  );

  setTimeout(async () => {
    try {
      if (shuttingDown) {
        return;
      }

      console.log(
        "🔄 MENCOBA RECONNECT WHATSAPP..."
      );

      await client.initialize();

      console.log(
        "✅ Initialize reconnect berhasil."
      );

    } catch (error) {
      console.error(
        "❌ RECONNECT GAGAL:",
        error.message
      );
    } finally {
      reconnecting = false;
    }
  }, 10000);
});

// ==================================================
// PESAN MASUK
// ==================================================

client.on(
  "message",
  async (message) => {

    console.log("🔥🔥 MESSAGE EVENT MASUK!");
    console.log("FROM:", message.from);
    console.log("BODY:", message.body);

    try {
      const text = (
        message.body || ""
      ).trim();
      const lowerText =
        text.toLowerCase();

      const chatId =
        message.from;

      console.log("");

      console.log(
        "======================================"
      );

      console.log(
        "📩 PESAN MASUK"
      );

      console.log(
        "📱 CHAT ID:",
        chatId
      );

      console.log(
        "💬 Pesan:",
        text
      );

      console.log(
        "======================================"
      );

      // ==================================================
      // BATAL
      // ==================================================

      if (
        lowerText === "batal" ||
        lowerText === "cancel"
      ) {
        clearSession(message);

        await message.reply(
          "❌ Proses dibatalkan.\n\n" +
          "Ketik *MENU* untuk melihat menu."
        );

        return;
      }

      // ==================================================
      // SESSION
      // ==================================================

      const session =
        getSession(message);

      if (session) {

        // ==================================================
        // REGISTER - ID
        // ==================================================

        if (
          session.type === "register" &&
          session.step === "id"
        ) {
          const customerId =
            normalizeCustomerId(text);

          if (
            !/^[a-z0-9_]{4,20}$/.test(
              customerId
            )
          ) {
            await message.reply(
              "❌ *ID TIDAK VALID*\n\n" +
              "ID harus 4–20 karakter.\n" +
              "Gunakan huruf, angka, atau _.\n\n" +
              "Contoh:\n" +
              "*noval123*"
            );

            return;
          }

          if (
            customers[customerId]
          ) {
            await message.reply(
              "❌ *ID SUDAH DIGUNAKAN*\n\n" +
              "Silakan masukkan ID pelanggan lain."
            );

            return;
          }

          session.customerId =
            customerId;

          session.step =
            "password";

          await message.reply(
            "✅ ID pelanggan tersedia.\n\n" +
            `🆔 ID: *${customerId}*\n\n` +
            "🔐 Sekarang buat *PASSWORD* kamu.\n\n" +
            "Password minimal *6 karakter*.\n\n" +
            "Ketik password kamu:"
          );

          return;
        }

        // ==================================================
        // REGISTER - PASSWORD
        // ==================================================

        if (
          session.type === "register" &&
          session.step === "password"
        ) {
          const password = text;

          if (
            password.length < 6
          ) {
            await message.reply(
              "❌ Password minimal *6 karakter*.\n\n" +
              "Silakan masukkan password lagi."
            );

            return;
          }

          session.password =
            password;

          session.step =
            "phone";

          await message.reply(
            "✅ Password diterima.\n\n" +
            "📱 Sekarang masukkan *nomor HP yang kamu gunakan saat membeli di website NV CELL*.\n\n" +
            "Contoh:\n" +
            "*089518405828*\n\n" +
            "⚠️ Nomor ini digunakan sebagai nomor akun kamu."
          );

          return;
        }

        // ==================================================
        // REGISTER - PHONE
        // ==================================================

        if (
          session.type === "register" &&
          session.step === "phone"
        ) {
          const phone =
            normalizePhone(text);

          if (!phone) {
            await message.reply(
              "❌ Nomor HP tidak valid.\n\n" +
              "Contoh:\n" +
              "*089518405828*"
            );

            return;
          }

          const existingCustomer =
            findCustomerByPhone(phone);

          if (existingCustomer) {
            await message.reply(
              "❌ Nomor HP tersebut sudah terdaftar pada akun lain.\n\n" +
              "Kalau itu akun kamu, gunakan *LOGIN* untuk masuk ke akun tersebut."
            );

            clearSession(message);

            return;
          }

          const customerId =
            session.customerId;

          customers[customerId] = {
            id: customerId,

            password:
              hashPassword(
                session.password
              ),

            phone: phone,

            whatsappChatId:
              chatId,

            createdAt:
              Date.now(),
          };

          saveJson(
            customersFile,
            customers
          );

          ensureCustomerPointData(
            customerId
          );

          saveJson(
            pointsFile,
            customerPoints
          );

          clearSession(message);

          await message.reply(
            "🎉 *AKUN NV CELL BERHASIL DIBUAT!*\n\n" +

            `🆔 ID Pelanggan: *${customerId}*\n` +

            `📱 Nomor HP akun: *${phone}*\n\n` +

            "🔐 Password kamu berhasil disimpan.\n\n" +

            "📱 WhatsApp ini sekarang terhubung dengan akun kamu.\n\n" +

            "Kalau nanti mau login dari WhatsApp/HP lain:\n" +
            "👉 Ketik *LOGIN*\n\n" +

            "⭐ Ketik *POIN* untuk mengecek poin.\n" +
            "🎁 Ketik *REWARD* untuk melihat hadiah.\n" +
            "🎟️ Ketik *TUKAR 5* untuk menukar poin.\n" +
            "🤖 Ketik *MENU* untuk melihat menu."
          );

          console.log(
            `✅ Customer baru dibuat: ${customerId}`
          );

          return;
        }

        // ==================================================
        // LOGIN - ID
        // ==================================================

        if (
          session.type === "pointLogin" &&
          session.step === "id"
        ) {
          const customerId =
            normalizeCustomerId(text);

          const customer =
            findCustomer(customerId);

          if (!customer) {
            await message.reply(
              "❌ *ID PELANGGAN TIDAK DITEMUKAN*\n\n" +
              "Silakan masukkan ID pelanggan yang benar.\n\n" +
              "Atau ketik *BATAL* untuk membatalkan."
            );

            return;
          }

          session.customerId =
            customerId;

          session.step =
            "password";

          await message.reply(
            "🆔 ID ditemukan.\n\n" +
            `ID Pelanggan: *${customerId}*\n\n` +
            "🔐 Sekarang masukkan password:"
          );

          return;
        }

        // ==================================================
        // LOGIN - PASSWORD
        // ==================================================

        if (
          session.type === "pointLogin" &&
          session.step === "password"
        ) {
          const customerId =
            session.customerId;

          const customer =
            findCustomer(customerId);

          if (!customer) {
            clearSession(message);

            await message.reply(
              "❌ Akun tidak ditemukan."
            );

            return;
          }

          const valid =
            verifyPassword(
              text,
              customer.password
            );

          if (!valid) {
            await message.reply(
              "❌ *PASSWORD SALAH*\n\n" +
              "Silakan masukkan password yang benar.\n\n" +
              "Atau ketik *BATAL* untuk membatalkan."
            );

            return;
          }

          // ==================================================
          // PUTUSKAN AKUN LAMA DARI CHAT INI
          // ==================================================

          logoutAllAccountsFromChatId(
            chatId
          );

          // ==================================================
          // HUBUNGKAN AKUN BARU
          // ==================================================

          customer.whatsappChatId =
            chatId;

          customers[customerId] =
            customer;

          saveJson(
            customersFile,
            customers
          );

          ensureCustomerPointData(
            customerId
          );

          saveJson(
            pointsFile,
            customerPoints
          );

          const data =
            customerPoints[
              customerId
            ];

          const points =
            Number(data.points) || 0;

          const transactions =
            Number(data.transactions) || 0;

          clearSession(message);

          await message.reply(
            "🎉 *LOGIN BERHASIL!*\n\n" +

            `🆔 ID Pelanggan: *${customerId}*\n\n` +

            "📱 WhatsApp ini sekarang terhubung ke akun kamu.\n\n" +

            `⭐ Total poin: *${points} poin*\n` +

            `🛒 Transaksi berhasil: *${transactions}x*\n\n` +

            "🎁 Ketik *REWARD* untuk melihat hadiah.\n" +

            "🎟️ Ketik *TUKAR 5*, *TUKAR 10*, atau *TUKAR 20* untuk menukar poin.\n" +

            "🤖 Ketik *MENU* untuk melihat semua fitur."
          );

          console.log(
            `🔐 ${customerId} berhasil login dari WhatsApp: ${chatId}`
          );

          return;
        }
      }

      // ==================================================
      // DAFTAR
      // ==================================================

      if (
        lowerText === "daftar" ||
        lowerText === "register" ||
        lowerText === "buat akun"
      ) {
        if (
          findCustomerByChatId(chatId)
        ) {
          await message.reply(
            "⚠️ WhatsApp ini sudah terhubung dengan akun NV CELL.\n\n" +
            "Kalau ingin masuk ke akun lain, ketik *LOGIN AKUN LAIN*."
          );

          return;
        }

        startRegistration(message);

        await message.reply(
          "📝 *PENDAFTARAN AKUN NV CELL*\n\n" +

          "Kita akan membuat akun pelanggan kamu.\n\n" +

          "Langkah 1 dari 3\n\n" +

          "🆔 Buat *ID Pelanggan* kamu.\n\n" +

          "4–20 karakter.\n" +
          "Gunakan huruf, angka, atau _.\n\n" +

          "Contoh:\n" +
          "*noval123*\n\n" +

          "Ketik ID yang kamu inginkan:"
        );

        return;
      }

      // ==================================================
      // LOGIN
      // ==================================================

      if (
        lowerText === "login" ||
        lowerText === "masuk" ||
        lowerText === "login akun"
      ) {
        const currentAccount =
          findCustomerByChatId(chatId);

        if (currentAccount) {
          await message.reply(
            "⚠️ WhatsApp ini sedang terhubung dengan akun:\n\n" +
            `🆔 *${currentAccount.id}*\n\n` +
            "Kalau kamu ingin masuk ke akun lain, ketik *LOGIN AKUN LAIN*."
          );

          return;
        }

        startPointLogin(message);

        await message.reply(
          "🔐 *LOGIN AKUN NV CELL*\n\n" +

          "Kamu bisa login ke akun NV CELL dari HP/WhatsApp lain.\n\n" +

          "Masukkan *ID Pelanggan* kamu.\n\n" +

          "Contoh:\n" +
          "*noval123*\n\n" +

          "Ketik ID Pelanggan:"
        );

        return;
      }

      // ==================================================
      // LOGIN AKUN LAIN
      // ==================================================

      if (
        lowerText === "login akun lain"
      ) {
        startPointLogin(message);

        await message.reply(
          "🔐 *LOGIN AKUN LAIN*\n\n" +

          "Masukkan *ID Pelanggan* akun yang ingin kamu gunakan.\n\n" +

          "Contoh:\n" +
          "*noval123*\n\n" +

          "Ketik ID Pelanggan:"
        );

        return;
      }

      // ==================================================
      // MENU
      // ==================================================

      if (
        lowerText === "menu" ||
        lowerText === "help" ||
        lowerText === "bantuan"
      ) {
        await message.reply(
          "🤖 *MENU NV CELL*\n\n" +

          "🌐 *BELI PULSA & INTERNET*\n" +
          "Kunjungi website:\n" +
          "https://nvcelll.vercel.app/\n\n" +

          "📝 *BUAT AKUN PELANGGAN*\n" +
          "Ketik: *DAFTAR*\n\n" +

          "🔐 *LOGIN AKUN*\n" +
          "Ketik: *LOGIN*\n\n" +

          "⭐ *CEK POIN*\n" +
          "Ketik: *POIN*\n\n" +

          "🎁 *LIHAT REWARD*\n" +
          "Ketik: *REWARD*\n\n" +

          "🎟️ *TUKAR REWARD*\n" +
          "Ketik:\n" +
          "👉 *TUKAR 5*\n" +
          "👉 *TUKAR 10*\n" +
          "👉 *TUKAR 20*\n\n" +

          "💳 *MINTA QRIS*\n" +
          "Ketik: *MINTA QRIS*\n\n" +

          "📸 *BUKTI PEMBAYARAN*\n" +
          "Kirim foto bukti pembayaran langsung melalui chat ini.\n\n" +

          "━━━━━━━━━━━━━━\n\n" +

          "💡 Ketik *MENU* kapan saja untuk melihat bantuan ini lagi.\n\n" +

          "🙏 Terima kasih sudah menggunakan *NV CELL*"
        );

        return;
      }

      // ==================================================
      // POIN
      // ==================================================

      if (
        lowerText === "poin" ||
        lowerText === "cek poin" ||
        lowerText === "point"
      ) {
        console.log(
          "🔥 PERINTAH POIN TERDETEKSI"
        );

        console.log(
          "📱 Mencari akun berdasarkan Chat ID:",
          chatId
        );

        const account =
          findCustomerByChatId(chatId);

        if (account) {
          const customerId =
            account.id;

          console.log(
            "🆔 Akun ditemukan:",
            customerId
          );

          ensureCustomerPointData(
            customerId
          );

          const data =
            customerPoints[
              customerId
            ];

          const points =
            Number(data.points) || 0;

          const transactions =
            Number(data.transactions) || 0;

          console.log(
            "⭐ DATA POIN:",
            data
          );

          await message.reply(
            "⭐ *POIN NV CELL*\n\n" +

            `🆔 ID Pelanggan: *${customerId}*\n\n` +

            `⭐ Total poin: *${points} poin*\n\n` +

            `🛒 Transaksi berhasil: *${transactions}x*\n\n` +

            "🎁 Setiap transaksi berhasil mendapatkan *+1 poin*.\n\n" +

            "🎁 Ketik *REWARD* untuk melihat hadiah.\n\n" +

            "🎟️ Ketik *TUKAR 5*, *TUKAR 10*, atau *TUKAR 20* untuk menukar poin.\n\n" +

            "💡 Ketik *MENU* untuk melihat semua fitur."
          );

          console.log(
            `⭐ ${customerId} mengecek poin: ${points}`
          );

          return;
        }

        console.log(
          "⚠️ WhatsApp belum terhubung dengan akun."
        );

        startPointLogin(message);

        await message.reply(
          "⭐ *CEK POIN NV CELL*\n\n" +

          "WhatsApp ini belum terhubung dengan akun pelanggan.\n\n" +

          "Masukkan *ID Pelanggan* kamu.\n\n" +

          "🆔 Contoh:\n" +
          "*noval123*\n\n" +

          "Ketik ID Pelanggan:"
        );

        return;
      }

      // ==================================================
      // REWARD
      // ==================================================

      if (
        lowerText === "reward" ||
        lowerText === "rewards" ||
        lowerText === "hadiah"
      ) {
        await message.reply(
          "🎁 *REWARD NV CELL*\n\n" +

          "⭐ *5 poin* → Diskon Rp1.000\n" +
          "⭐ *10 poin* → Diskon Rp2.500\n" +
          "⭐ *20 poin* → Diskon Rp5.000\n\n" +

          "━━━━━━━━━━━━━━\n\n" +

          "💡 *Cara menukar poin:*\n\n" +

          "👉 Ketik *TUKAR 5*\n" +
          "👉 Ketik *TUKAR 10*\n" +
          "👉 Ketik *TUKAR 20*\n\n" +

          "📌 Ketik *POIN* untuk melihat saldo poin kamu.\n\n" +

          "💡 Ketik *MENU* untuk melihat semua fitur."
        );

        return;
      }

      // ==================================================
      // TUKAR POIN
      // ==================================================

      const redeemMatch =
        lowerText.match(
          /^tukar\s+(\d+)$/
        );

      if (redeemMatch) {
        const redeemPoints =
          Number(redeemMatch[1]);

        console.log(
          `🎟️ Permintaan tukar ${redeemPoints} poin dari ${chatId}`
        );

        const reward =
          REWARDS[redeemPoints];

        if (!reward) {
          await message.reply(
            "❌ *REWARD TIDAK TERSEDIA*\n\n" +

            "Reward yang tersedia:\n\n" +

            "🎁 *TUKAR 5* → Diskon Rp1.000\n" +
            "🎁 *TUKAR 10* → Diskon Rp2.500\n" +
            "🎁 *TUKAR 20* → Diskon Rp5.000\n\n" +

            "Silakan pilih salah satu."
          );

          return;
        }

        const account =
          findCustomerByChatId(chatId);

        if (!account) {
          await message.reply(
            "❌ *AKUN BELUM TERHUBUNG*\n\n" +

            "WhatsApp ini belum terhubung dengan akun NV CELL.\n\n" +

            "Silakan ketik *LOGIN* jika kamu sudah memiliki akun.\n\n" +

            "Atau ketik *DAFTAR* untuk membuat akun baru."
          );

          return;
        }

        const customerId =
          account.id;

        ensureCustomerPointData(
          customerId
        );

        const currentPoints =
          Number(
            customerPoints[
              customerId
            ].points
          ) || 0;

        if (
          currentPoints <
          redeemPoints
        ) {
          await message.reply(
            "❌ *POIN TIDAK CUKUP*\n\n" +

            `⭐ Poin kamu saat ini: *${currentPoints} poin*\n` +

            `🎟️ Poin yang dibutuhkan: *${redeemPoints} poin*\n\n` +

            `❗ Kamu masih kekurangan *${redeemPoints - currentPoints} poin*.\n\n` +

            "🎁 Ketik *REWARD* untuk melihat hadiah yang tersedia."
          );

          return;
        }

        const remainingPoints =
          currentPoints -
          redeemPoints;

        customerPoints[
          customerId
        ].points =
          remainingPoints;

        customerPoints[
          customerId
        ].lastRedeem =
          Date.now();

        saveJson(
          pointsFile,
          customerPoints
        );

        if (
          !customerRewards[
            customerId
          ]
        ) {
          customerRewards[
            customerId
          ] = [];
        }
const rewardId = crypto.randomUUID();

const redeemCode =
  "NV-" +
  crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

customerRewards[
  customerId
].push({
  id: rewardId,

  code: redeemCode,

  points:
    redeemPoints,

  discount:
    reward.discount,

  name:
    reward.name,

  redeemedAt:
    Date.now(),

  status:
    "active",
});
// ==================================================
// SIMPAN REWARD KE SUPABASE
// ==================================================

const customerPhone = normalizePhone(
  customer.phone
);

console.log("💾 MENYIMPAN REWARD KE SUPABASE...");
console.log("📱 CUSTOMER PHONE:", customerPhone);
console.log("🎟️ REDEEM CODE:", redeemCode);
console.log("🎁 REWARD TYPE:", redeemPoints);
console.log("💰 DISCOUNT:", reward.discount);

const { data: insertedReward, error: rewardError } =
  await supabase
    .from("rewards")
    .insert({
      customer_phone: customerPhone,
      reward_type: redeemPoints,
      discount: reward.discount,
      code: redeemCode,
      status: "active",
      used_at: null,
    })
    .select()
    .single();

if (rewardError) {
  console.error(
    "❌ GAGAL MENYIMPAN REWARD KE SUPABASE:"
  );

  console.error(
    "MESSAGE:",
    rewardError.message
  );

  console.error(
    "DETAIL:",
    rewardError.details
  );

  console.error(
    "HINT:",
    rewardError.hint
  );

  console.error(
    "CODE:",
    rewardError.code
  );
} else {
  console.log(
    "✅ REWARD BERHASIL MASUK SUPABASE:"
  );

  console.log(
    JSON.stringify(
      insertedReward,
      null,
      2
    )
  );
}
        saveJson(
          rewardsFile,
          customerRewards
        );

        await message.reply(
          "🎉 *REWARD BERHASIL DITUKAR!*\n\n" +

          `🆔 ID Pelanggan: *${customerId}*\n\n` +

          `🎟️ Reward: *${reward.name}*\n\n` +

          `⭐ Poin digunakan: *${redeemPoints} poin*\n\n` +

          `⭐ Sisa poin kamu: *${remainingPoints} poin*\n\n` +

          `🎟️ Kode Redeem: *${redeemCode}*\n\n` +

          "🎁 Reward kamu sudah tersimpan.\n\n" +

          "📌 Simpan pesan ini sebagai bukti penukaran reward.\n\n" +

          "💡 Ketik *REWARD* untuk melihat daftar hadiah lagi.\n" +
          "💡 Ketik *POIN* untuk melihat saldo poin."
        );

        console.log(
          "🎉 REWARD BERHASIL DITUKAR"
        );

        return;
      }

      // ==================================================
      // ID PESANAN
      // ==================================================

      const orderIdMatch =
        text.match(
          /ID Pesanan:\s*([a-f0-9-]{36})/i
        );

      if (orderIdMatch) {
        const orderId =
          orderIdMatch[1];

        orders[orderId] = {
          whatsapp:
            chatId,

          createdAt:
            Date.now(),

          status:
            "menunggu_pembayaran",
        };

        saveJson(
          ordersFile,
          orders
        );

        console.log(
          `📝 Pesanan dicatat: ${orderId}`
        );
      }

      // ==================================================
      // QRIS
      // ==================================================

      if (
        lowerText.includes(
          "mohon dikirimkan qris"
        ) ||
        lowerText.includes(
          "kirimkan qris"
        ) ||
        lowerText.includes(
          "minta qris"
        )
      ) {
        console.log(
          "💳 Permintaan QRIS diterima."
        );

        try {
          const qris =
            MessageMedia.fromFilePath(
              "./qris.jpg"
            );

          await message.reply(
            "✅ *PESANAN DITERIMA!*\n\n" +

            "Silakan lakukan pembayaran menggunakan QRIS yang kami kirim setelah pesan ini. 💳\n\n" +

            "Pastikan nominal pembayaran sesuai dengan pesanan kamu."
          );

          await client.sendMessage(
            chatId,
            qris,
            {
              caption:
                "💳 *QRIS NV CELL*\n\n" +

                "Silakan scan QRIS ini untuk melakukan pembayaran.\n\n" +

                "Pastikan nominal pembayaran sesuai dengan pesanan kamu.",
            }
          );

          console.log(
            "✅ QRIS berhasil dikirim."
          );

        } catch (error) {
          console.log(
            "❌ Gagal mengirim QRIS:",
            error.message
          );

          await message.reply(
            "❌ *QRIS tidak dapat dikirim.*\n\n" +

            "Silakan hubungi admin NV CELL."
          );
        }

        return;
      }

      // ==================================================
      // BUKTI PEMBAYARAN
      // ==================================================

      if (message.hasMedia) {
        console.log(
          "📸 Media/bukti pembayaran diterima."
        );

        const customerOrderIds =
          Object.keys(orders).filter(
            (id) =>
              orders[id].whatsapp ===
              chatId
          );

        if (
          customerOrderIds.length > 0
        ) {
          const latestOrderId =
  customerOrderIds.sort(
    (a, b) =>
      (orders[b].createdAt || 0) -
      (orders[a].createdAt || 0)
  )[0];
          orders[
            latestOrderId
          ].status =
            "sedang_diproses";

          orders[
            latestOrderId
          ].paymentProofAt =
            Date.now();

          saveJson(
            ordersFile,
            orders
          );

          console.log(
            `🔄 Pesanan ${latestOrderId} sedang diproses.`
          );
        } else {
          console.log(
            "⚠️ Pesanan lokal tidak ditemukan."
          );
        }

        await message.reply(
          "✅ *BUKTI PEMBAYARAN DITERIMA!*\n\n" +

          "Bukti pembayaran kamu sudah kami terima. 👍\n\n" +

          "⏳ *Pesanan sedang diproses.*\n\n" +

          "Mohon tunggu sampai pulsa/paket berhasil dikirim ya 🙏\n\n" +

          "📌 Setelah pesanan berhasil, kamu akan mendapatkan notifikasi otomatis."
        );

        return;
      }

      // ==================================================
      // LINK WEBSITE
      // ==================================================

      const now =
        Date.now();

      const lastSent =
        cooldowns[chatId];

      const canSend =
        !lastSent ||
        now - lastSent >=
          COOLDOWN_TIME;

      if (canSend) {
        await message.reply(
          "👋 *HALO! SELAMAT DATANG DI NV CELL* 👋\n\n" +

          "📱 *BELI PULSA & PAKET INTERNET*\n\n" +

          "Cek harga dan lakukan pemesanan melalui website kami:\n\n" +

          "🌐 https://nvcelll.vercel.app/\n\n" +

          "💳 *Pembayaran tersedia melalui QRIS.*\n\n" +

          "⭐ *PROGRAM POIN NV CELL*\n\n" +

          "Setiap transaksi berhasil mendapatkan *+1 poin* 🎁\n\n" +

          "📝 *BUAT AKUN*\n" +
          "Ketik: *DAFTAR*\n\n" +

          "🔐 *LOGIN AKUN*\n" +
          "Ketik: *LOGIN*\n\n" +

          "📌 *CEK POIN*\n" +
          "Ketik: *POIN*\n\n" +

          "🎁 *LIHAT REWARD*\n" +
          "Ketik: *REWARD*\n\n" +

          "🤖 *MENU BANTUAN*\n" +
          "Ketik: *MENU*\n\n" +

          "Terima kasih sudah menggunakan *NV CELL* 🙏"
        );

        cooldowns[
          chatId
        ] = now;

        saveJson(
          cooldownFile,
          cooldowns
        );

        console.log(
          "✅ Link website + petunjuk dikirim."
        );

      } else {
        const remaining =
          COOLDOWN_TIME -
          (now - lastSent);

        const remainingMinutes =
          Math.ceil(
            remaining /
            (60 * 1000)
          );

        console.log(
          "⏳ Pelanggan masih cooldown."
        );

        console.log(
          `⏰ Sisa sekitar ${remainingMinutes} menit.`
        );
      }

    } catch (error) {
      console.error(
        "❌ ERROR PESAN:",
        error
      );
    }
  }
);

// ==================================================
// MONITOR TRANSAKSI SUPABASE
// ==================================================

async function checkCompletedTransactions() {
  try {
    console.log("");

    console.log(
      "🔎 Mengecek transaksi selesai..."
    );

    const {
      data,
      error,
    } = await supabase
      .from("transactions")
      .select(
        "id, phone, nominal, price, status, payment_status, completed_at"
      )
      .eq(
        "status",
        "completed"
      )
      .eq(
        "payment_status",
        "paid"
      )
      .not(
        "completed_at",
        "is",
        null
      );

    if (error) {
      console.log(
        "❌ ERROR SUPABASE:",
        error.message
      );

      return;
    }

    console.log(
      `📊 Transaksi completed + paid ditemukan: ${
        data?.length || 0
      }`
    );

    if (
      !data ||
      data.length === 0
    ) {
      console.log(
        "ℹ️ Belum ada transaksi yang memenuhi syarat."
      );

      return;
    }

    for (
      const transaction of data
    ) {
      const transactionId =
        transaction.id;

      console.log("");

      console.log(
        "--------------------------------------"
      );

      console.log(
        `🔎 Memproses transaksi: ${transactionId}`
      );

      // ==================================================
      // CEK SUDAH DIPROSES
      // ==================================================

      const processedTransaction =
  notifiedTransactions[transactionId];

if (processedTransaction) {
  console.log(
    "⏭️ Transaksi sudah pernah diproses/diproses."
  );

  continue;
}
      notifiedTransactions[transactionId] = {
  processing: true,
  startedAt: Date.now(),
};

saveJson(
  notifiedFile,
  notifiedTransactions
);

      // ==================================================
      // NOMOR TUJUAN
      // ==================================================

      const customerNumber =
        normalizePhone(
          transaction.phone
        );

      console.log(
        "📱 NOMOR TUJUAN TRANSAKSI:",
        customerNumber
      );

      // ==================================================
      // CARI ORDER DARI ID TRANSAKSI
      // ==================================================

     const order =
  orders[transactionId];

let account = null;
let buyerChatId = null;

if (order) {
  buyerChatId = order.whatsapp;

  console.log(
    "📱 WHATSAPP PEMBELI:",
    buyerChatId
  );

  if (buyerChatId) {
    account =
      findCustomerByChatId(
        buyerChatId
      );
  }
} else {
  console.log(
    "⚠️ Order lokal tidak ditemukan:",
    transactionId
  );
}
      // ==================================================
      // FALLBACK NOMOR HP
      // ==================================================

      if (
        !account &&
        customerNumber
      ) {
        console.log(
          "⚠️ Akun berdasarkan WhatsApp tidak ditemukan."
        );

        console.log(
          "🔄 Mencoba fallback berdasarkan nomor transaksi..."
        );

        account =
          findCustomerByPhone(
            customerNumber
          );
      }

      // ==================================================
      // AKUN TIDAK DITEMUKAN
      // ==================================================

      if (!account) {
        console.log(
          "⚠️ Tidak ditemukan akun NV CELL untuk transaksi ini."
        );

        console.log(
          "⚠️ Poin tidak ditambahkan."
        );

        continue;
      }

      const customerId =
        account.id;

      const customer =
        account.data;

      console.log(
        "🆔 CUSTOMER ID:",
        customerId
      );

      console.log(
        "📱 NOMOR AKUN:",
        customer.phone
      );

      // ==================================================
      // DATA POIN
      // ==================================================

      ensureCustomerPointData(
        customerId
      );

      const currentPoints =
        Number(
          customerPoints[
            customerId
          ].points
        ) || 0;

      const currentTransactions =
        Number(
          customerPoints[
            customerId
          ].transactions
        ) || 0;

      const newTotalPoints =
        currentPoints + 1;

      console.log(
        `⭐ Poin sebelumnya: ${currentPoints}`
      );

      console.log(
        `⭐ Poin setelah transaksi: ${newTotalPoints}`
      );

      // ==================================================
      // WHATSAPP NOTIFIKASI
      // ==================================================

      const whatsappChatId =
        customer.whatsappChatId;

      if (!whatsappChatId) {
        console.log(
          "❌ Akun tidak mempunyai WhatsApp Chat ID."
        );

        console.log(
          "⚠️ Poin belum ditambahkan."
        );

        continue;
      }

      console.log(
        "📱 NOTIFIKASI KE:",
        whatsappChatId
      );

      // ==================================================
      // PESAN SELESAI
      // ==================================================

      const successMessage =
        "🎉 *PESANAN BERHASIL!*\n\n" +

        "Pesanan kamu sudah berhasil diproses. ✅\n\n" +

        `📱 Nomor tujuan: ${customerNumber}\n` +

        `💰 Nominal: Rp${Number(
          transaction.nominal
        ).toLocaleString(
          "id-ID"
        )}\n` +

        `💵 Harga: Rp${Number(
          transaction.price
        ).toLocaleString(
          "id-ID"
        )}\n\n` +

        "⭐ *BONUS POIN*\n" +

        "Kamu mendapatkan *+1 poin* dari transaksi ini! 🎁\n\n" +

        `⭐ Total poin kamu: *${newTotalPoints} poin*\n\n` +

        "🎁 Ketik *REWARD* untuk melihat hadiah.\n" +

        "📌 Ketik *POIN* untuk mengecek saldo poin.\n\n" +

        "🤖 Ketik *MENU* untuk melihat semua fitur.\n\n" +

        "Terima kasih sudah menggunakan *NV CELL* 🙏";

      // ==================================================
      // KIRIM NOTIFIKASI
      // ==================================================

      try {
        console.log(
          "📤 Mengirim notifikasi WhatsApp..."
        );

        await client.sendMessage(
          whatsappChatId,
          successMessage
        );

        console.log(
          "✅ PESAN BERHASIL DIKIRIM KE:",
          whatsappChatId
        );

        // ==================================================
        // TAMBAH POIN
        // ==================================================

        customerPoints[
          customerId
        ].points =
          newTotalPoints;

        customerPoints[
          customerId
        ].transactions =
          currentTransactions + 1;

        customerPoints[
          customerId
        ].lastTransaction =
          Date.now();

        saveJson(
          pointsFile,
          customerPoints
        );

        console.log(
          `⭐ Poin +1 berhasil disimpan untuk ${customerId}. Total: ${newTotalPoints}`
        );

        console.log(
          "💾 DATA POIN TERBARU:",
          customerPoints[
            customerId
          ]
        );

        // ==================================================
        // TANDAI TRANSAKSI
        // ==================================================

        notifiedTransactions[
  transactionId
] = {
  processing: false,

  sentAt:
    Date.now(),

  whatsapp:
    whatsappChatId,

  customerId:
    customerId,

  pointsAdded:
    1,
};
        saveJson(
          notifiedFile,
          notifiedTransactions
        );

        console.log(
          "💾 Transaksi ditandai sudah diproses."
        );

      } catch (sendError) {
        console.log(
          "❌ GAGAL MENGIRIM PESAN WHATSAPP:"
        );

        console.log(
          sendError.message
        );

        console.log(
          "📱 Chat ID tujuan:",
          whatsappChatId
        );

        console.log(
          "⚠️ Poin belum ditambahkan karena notifikasi gagal."
        );
      }
    }

  } catch (error) {
    console.log(
      "❌ ERROR MONITOR:",
      error.message
    );
  }
}

// ==================================================
// TEST SUPABASE
// ==================================================

async function testSupabase() {
  try {
    console.log(
      "🔎 Menguji koneksi Supabase..."
    );

    const {
      data,
      error,
    } = await supabase
      .from("transactions")
      .select("id")
      .limit(1);

    if (error) {
      console.log(
        "❌ Supabase error:",
        error.message
      );

      return false;
    }

    console.log(
      "✅ Supabase berhasil terhubung!"
    );

    console.log(
      `📊 Test transaksi: ${
        data?.length || 0
      }`
    );

    return true;

  } catch (error) {
    console.log(
      "❌ Gagal test Supabase:",
      error.message
    );

    return false;
  }
}

// ==================================================
// START BOT
// ==================================================

async function startBot() {
  console.log("");

  console.log(
    "======================================"
  );

  console.log(
    "🚀 MEMULAI NV CELL WHATSAPP BOT"
  );

  console.log(
    "======================================"
  );

  console.log("");

  const supabaseOK =
    await testSupabase();

  if (!supabaseOK) {
    console.log(
      "⚠️ Supabase bermasalah."
    );
  }

  console.log(
    "🚀 Menjalankan WhatsApp Bot..."
  );
console.log(
  "🔥 AUTH DATAPATH:",
  client.authStrategy.dataPath
);

console.log(
  "🔥 DATA DIR:",
  DATA_DIR
);

console.log(
  "🔥 CURRENT DIR:",
  process.cwd()
);

console.log(
  "🔥 RAILWAY VOLUME:",
  process.env.RAILWAY_VOLUME_MOUNT_PATH || "TIDAK ADA"
);

console.log(
  "🔥 DATA DIR EXISTS:",
  fs.existsSync(DATA_DIR)
);

console.log(
  "🔥 AUTH DIR EXISTS:",
  fs.existsSync(AUTH_DIR)
);

console.log(
  "🔥 CUSTOMERS FILE EXISTS:",
  fs.existsSync(customersFile)
);

console.log(
  "🔥 POINTS FILE EXISTS:",
  fs.existsSync(pointsFile)
);

console.log(
  "🔥 REWARDS FILE EXISTS:",
  fs.existsSync(rewardsFile)
);

await client.initialize();
}
// ==================================================
// RAILWAY WEB SERVER
// ==================================================

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🌐 QR WEB SERVER berjalan di port ${PORT}`
  );
});
startBot();
// ==================================================
// GRACEFUL SHUTDOWN
// ==================================================

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log("");
  console.log(
    `🛑 MENERIMA SIGNAL: ${signal}`
  );

  console.log(
    "🛑 Menghentikan WhatsApp client..."
  );

  try {
    await client.destroy();

    console.log(
      "✅ WhatsApp client dihentikan."
    );
  } catch (error) {
    console.error(
      "❌ Gagal menghentikan WhatsApp:",
      error.message
    );
  }

  server.close(() => {
    console.log(
      "✅ HTTP server dihentikan."
    );

    process.exit(0);
  });

  setTimeout(() => {
    console.log(
      "⚠️ Forced shutdown."
    );

    process.exit(0);
  }, 10000);
}

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);