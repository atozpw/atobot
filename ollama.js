import Ollama from "ollama";
import WhatsAppJS from "whatsapp-web.js";
import QrCode from "qrcode-terminal";
import MySQL from "mysql2/promise";

const CLIENT_ID = "ollama";

const client = new WhatsAppJS.Client({
  authStrategy: new WhatsAppJS.LocalAuth({
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

const dbConnection = async () => {
  return await MySQL.createConnection({
    host: "127.0.0.1",
    port: "3306",
    user: "root",
    password: "secret",
    database: "atobot",
  });
};

const getSession = async (from) => {
  const db = await dbConnection();
  const [rows] = await db.query(
    "select `id`, `step` from `sessions` where `from` = ? and `expired_at` > unix_timestamp() order by `expired_at` desc limit 1",
    [from]
  );
  await db.end();
  if (rows.length > 0) return rows[0];
  return false;
};

const storeSession = async (from) => {
  const db = await dbConnection();
  await db.execute(
    "insert into `sessions` (`from`, `expired_at`) values (?, unix_timestamp() + (60 * 60))",
    [from]
  );
  await db.end();
};

client.once("ready", () => {
  console.log(`AtoBot with Client ID ${CLIENT_ID} is Ready!`);
});

client.on("qr", (qr) => {
  QrCode.generate(qr, { small: true });
});

client.on("message", async (message) => {
  const session = await getSession(message.from);
  if (message.body === "!ping") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    setTimeout(() => {
      chat.clearState();
      client.sendMessage(message.from, "pong!");
    }, 3000);
  } else if (message.body === "!ato-ai") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    await storeSession(message.from);
    setTimeout(() => {
      chat.clearState();
      client.sendMessage(message.from, "Halo");
    }, 3000);
  } else if (session && session.step == 0) {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const response = await Ollama.chat({
      model: "llama3.2",
      messages: [{ role: "user", content: message.body }],
    });
    chat.clearState();
    client.sendMessage(message.from, response.message.content);
  }
});

client.initialize();