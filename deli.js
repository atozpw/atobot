const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const mysql = require("mysql2/promise");

const CLIENT_ID = "deli";

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: CLIENT_ID,
  }),
  puppeteer: {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
});

const connection = async () => {
  return await mysql.createConnection({
    host: "192.168.0.101",
    port: "3306",
    user: "root",
    password: "",
    database: "",
  });
};

const getCustomer = async (id) => {
  const db = await connection();
  const [rows] = await db.query(
    "select pel_no, pel_nama, pel_alamat from tm_pelanggan where pel_no = ?",
    [id]
  );
  if (rows.length > 0) return rows[0];
  return false;
};

const getBills = async (id) => {
  const db = await connection();
  const [rows] = await db.query(
    "select rek_thn, rek_bln, rek_total from tm_rekening where rek_sts = 1 and rek_byr_sts = 0 and pel_no = ?",
    [id]
  );
  if (rows.length > 0) return rows;
  return false;
};

const monthFormatter = (value) => {
  const month = [
    "",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  let formatted = month[value];
  return formatted;
};

const rupiahFormatter = (number) => {
  let tempNum = String(number).split("").reverse();
  let formatted = "";
  for (let i = 0; i < tempNum.length; i++) {
    if ((i + 1) % 3 == 0 && i != tempNum.length - 1) {
      tempNum[i] = `.${tempNum[i]}`;
    }
  }
  formatted = `Rp. ${tempNum.reverse().join("")}`;
  return formatted;
};

client.once("ready", () => {
  console.log(`AtoBot with Client ID ${CLIENT_ID} is ready!`);
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("message_create", async (message) => {
  if (message.body === "!ping") {
    const chat = await message.getChat();
    chat.sendStateTyping();

    const greetingMessage =
      "Selamat datang di *AI Assistant Tirta Deli*, saya adalah Robot Kecerdasan Buatan yang hanya akan membantu Anda melakukan cek tagihan secara mandiri via Chat Only. Sekarang, cek tagihan dapat dilakukan secara mandiri via WhatsApp Chatbot dengan ketik format keyword sebagai berikut :\n- Tagihan#NomorPelanggan\n\nContoh :\n- Tagihan#12345678\n\nNote :\n- Pastikan kembali keyword Anda sudah benar.\n- Robot tidak dapat merespon yang bukan keyword.\n- Untuk layanan Telepon / Call Center : 0812-3456-7890";

    setTimeout(() => {
      chat.clearState();
      client.sendMessage(message.from, greetingMessage);
    }, 5000);
  }

  if (message.body.startsWith("Tagihan#")) {
    const chat = await message.getChat();
    chat.sendStateTyping();

    const id = message.body.split("#")[1];
    const customer = await getCustomer(id);
    const bills = await getBills(id);

    let reply = "";

    if (customer) {
      reply += `Nomor Pelanggan: ${customer.pel_no}\n`;
      reply += `Nama Lengkap: ${customer.pel_nama}\n`;
      reply += `Alamat: ${customer.pel_alamat}\n`;
      reply += `\n`;
      reply += `Tagihan: \n`;

      if (bills) {
        let i = 0;
        for (let bill of bills) {
          if (i > 0) reply += `\n`;
          reply += `Periode ${monthFormatter(bill.rek_bln)} ${
            bill.rek_thn
          }: ${rupiahFormatter(bill.rek_total)}`;
          i++;
        }
      } else {
        reply += `Tidak ada tagihan`;
      }
    } else {
      reply += `Data tidak ditemukan`;
    }

    setTimeout(() => {
      chat.clearState();
      client.sendMessage(message.from, reply);
    }, 5000);
  }
});

client.initialize();
