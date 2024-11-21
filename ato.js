const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

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

client.once("ready", () => {
  console.log(`AtoBot with Client ID ${CLIENT_ID} is Ready!`);
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("message", async (message) => {
  const mentions = await message.getMentions();
  for (let mention of mentions) {
    if (mention.isMe) {
      const contact = await message.getContact();
      setTimeout(() => {
        client.sendMessage(message.from, `Hello @${contact.id.user}`, {
          mentions: [contact.id.user + "@c.us"],
        });
      }, 10000);
    }
  }

  if (message.body === "!info") {
    console.log(client.info);
  }

  if (message.body === "!ping") {
    const chat = await message.getChat();
    chat.sendStateTyping();
    const reply = "pong";
    setTimeout(() => {
      chat.clearState();
      client.sendMessage(message.from, reply);
    }, 5000);
  }
});

client.initialize();
