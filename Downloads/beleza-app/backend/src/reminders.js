import cron from "node-cron";
import { prisma } from "./prisma.js";
import { sendWhatsAppMessage } from "./whatsapp.js";

async function sendReminder(booking, field) {
  const horario = new Date(booking.startAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const message =
    field === "reminder24hSentAt"
      ? `Oi, ${booking.client.name}! Passando pra lembrar do seu horário de ${booking.service.name} amanhã, ${horario}, com ${booking.professional.name}.`
      : `Oi, ${booking.client.name}! Seu horário de ${booking.service.name} é daqui a pouco, às ${horario}, com ${booking.professional.name}. Até já!`;

  try {
    await sendWhatsAppMessage(booking.client.phone, message);
    await prisma.booking.update({ where: { id: booking.id }, data: { [field]: new Date() } });
  } catch (err) {
    // nao derruba o cron inteiro se um envio falhar — so tenta esse agendamento de novo no proximo ciclo
    console.error(`Erro ao enviar lembrete (${field}) do agendamento ${booking.id}:`, err.message);
  }
}

async function checkReminders() {
  const now = new Date();

  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in24hWindowEnd = new Date(in24h.getTime() + 5 * 60 * 1000); // janela de 5 min pra nao perder o ciclo

  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const in2hWindowEnd = new Date(in2h.getTime() + 5 * 60 * 1000);

  const bookingsFor24h = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminder24hSentAt: null,
      startAt: { gte: in24h, lt: in24hWindowEnd },
    },
    include: { client: true, service: true, professional: true },
  });

  const bookingsFor2h = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminder2hSentAt: null,
      startAt: { gte: in2h, lt: in2hWindowEnd },
    },
    include: { client: true, service: true, professional: true },
  });

  for (const booking of bookingsFor24h) await sendReminder(booking, "reminder24hSentAt");
  for (const booking of bookingsFor2h) await sendReminder(booking, "reminder2hSentAt");
}

export function startReminderCron() {
  // roda a cada 5 minutos — a janela de checagem acima cobre essa margem
  cron.schedule("*/5 * * * *", checkReminders);
  console.log("Cron de lembretes automaticos iniciado (a cada 5 min).");
}
