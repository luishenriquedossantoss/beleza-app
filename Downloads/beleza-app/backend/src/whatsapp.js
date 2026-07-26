import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";

const logger = pino({ level: "warn" });

let sock = null;
let isReady = false;

export async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({ auth: state, printQRInTerminal: false, logger, version });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\nEscaneie esse QR code com o WhatsApp que vai mandar os lembretes:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      isReady = true;
      console.log("WhatsApp conectado — pronto pra mandar lembretes.");
    }

    if (connection === "close") {
      isReady = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`Conexao com o WhatsApp caiu (codigo ${statusCode}). Reconectando:`, shouldReconnect);
      if (shouldReconnect) connectWhatsApp();
      else console.log("Sessao desconectada pelo proprio WhatsApp — apague auth_info/ e escaneie o QR de novo.");
    }
  });
}

function toWhatsAppId(phone) {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;
  return `${withCountryCode}@s.whatsapp.net`;
}

export async function sendWhatsAppMessage(phone, message) {
  if (!isReady || !sock) {
    throw new Error("WhatsApp ainda nao esta conectado. Escaneie o QR code no terminal do backend.");
  }
  await sock.sendMessage(toWhatsAppId(phone), { text: message });
}