const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const mysql = require("mysql2/promise");

const CLIENT_ID = "ato";

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

const dbConnection = async () => {
  return await mysql.createConnection({
    host: "127.0.0.1",
    port: "3306",
    user: "root",
    password: "secret",
    database: "atobot",
  });
};

const billConnection = async () => {
  return await mysql.createConnection({
    host: "192.168.0.209",
    port: "3307",
    user: "root",
    password: "pohodeui",
    database: "pdam_sopp",
  });
};

const getSession = async (from) => {
  const db = await dbConnection();
  const [rows] = await db.query(
    "select `id`, `step` from `sessions` where `from` = ? and `expired_at` > unix_timestamp() order by `expired_at` desc limit 1",
    [from]
  );
  if (rows.length > 0) return rows[0];
  return false;
};

const storeSession = async (from) => {
  const db = await dbConnection();
  await db.execute(
    "insert into `sessions` (`from`, `expired_at`) values (?, unix_timestamp() + (60 * 60))",
    [from]
  );
};

const updateSession = async (from, step) => {
  const db = await dbConnection();
  await db.execute(
    "update `sessions` set `step` = ? where `from` = ? and `expired_at` > unix_timestamp()",
    [step, from]
  );
};

const getGreeting = async () => {
  const db = await dbConnection();
  const [rows] = await db.query(
    "select `message` from `greetings` order by `created_at` desc limit 1"
  );
  if (rows.length > 0) return rows[0];
  return false;
};

const getKeywords = async (message) => {
  const db = await dbConnection();
  const [rows] = await db.query(
    "select id, keyword, answer_id, match (keyword) against (? in natural language mode) as score from keywords where match (keyword) against (? in natural language mode) limit 2",
    [message, message]
  );
  if (rows.length > 0) return rows;
  return false;
};

const getAnswer = async (id) => {
  const db = await dbConnection();
  const [rows] = await db.query(
    "select `id`, `answer`, `child_id` from `answers` where `id` = ?",
    [id]
  );
  if (rows.length > 0) return rows[0];
  return false;
};

const getBill = async (id) => {
  const db = await billConnection();
  const [rows] = await db.query(
    "select `id`, `answer`, `child_id` from `answers` where `id` = ?",
    [id]
  );
  if (rows.length > 0) return rows[0];
  return false;
};

client.once("ready", () => {
  console.log(`AtoBot with Client ID ${CLIENT_ID} is Ready!`);
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("message", async (message) => {

  // const mentions = await message.getMentions();
  // for (let mention of mentions) {
  //   if (mention.isMe) {
  //     const contact = await message.getContact();
  // setTimeout(() => {
  //   client.sendMessage(message.from, `Hello @${contact.id.user}`, {
  //     mentions: [contact.id.user + "@c.us"],
  //   });
  // }, 10000);
  //   }
  // }

  // if (message.body === "!info") {
  //   console.log(client.info);
  // }

  // if (message.body === "!ping") {
  //   const chat = await message.getChat();
  //   chat.sendStateTyping();
  //   const reply = "pong";
  //   setTimeout(() => {
  //     chat.clearState();
  //     client.sendMessage(message.from, reply);
  //   }, 5000);
  // }

  const session = await getSession(message.from);

  if (message.body === "!ping") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    setTimeout(() => {
      chat.clearState();
      client.sendMessage(message.from, "pong!");
    }, 3000);
  } else if (message.body === "!bot") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const greeting = await getGreeting();
    await storeSession(message.from);
    setTimeout(() => {
      chat.clearState();
      client.sendMessage(message.from, greeting.message);
    }, 3000);
  } else if (session && session.step == 0) {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const keywords = await getKeywords(message.body);
    let reply = "";
    if (keywords) {
      let score_1 = (keywords[0]) ? keywords[0].score : 0;
      let score_2 = (keywords[1]) ? keywords[1].score : 0;
      if (score_1 == score_2) {
        reply = "Saya tidak memahami konteks dari pertanyaan tersebut";
      } else {
        if (keywords[0].answer_id) {
          const answer = await getAnswer(keywords[0].answer_id);
          reply = answer.answer;
          await updateSession(message.from, 1);
        } else {
          reply = "Mohon maaf, informasi mengenai hal tersebut belum bisa Saya sampaikan";
        }
      }
    } else if (session && session.step == 1) {

    } else {
      reply = "Mohon maaf, Saya belum bisa menjawab pertanyaan tersebut";
    }
    setTimeout(() => {
      chat.clearState();
      if (reply) {
        client.sendMessage(message.from, reply);
      }
    }, 3000);
  }
});

client.initialize();
