import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { createPixPayment, getPayment } from "../mercadopago.js";
import { sendWhatsAppMessage } from "../whatsapp.js";

const router = Router();
router.use(requireAuth);

// agenda do dia (ou de um periodo), usada pela tela inicial do app
router.get("/", async (req, res) => {
  const { from, to } = req.query;
  const bookings = await prisma.booking.findMany({
    where: {
      professionalId: req.professionalId,
      startAt: {
        gte: from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0)),
        lte: to ? new Date(to) : new Date(new Date().setHours(23, 59, 59, 999)),
      },
    },
    include: { client: true, service: true },
    orderBy: { startAt: "asc" },
  });
  res.json(bookings);
});

router.get("/:id", async (req, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, professionalId: req.professionalId },
    include: { client: true, service: true },
  });
  if (!booking) return res.status(404).json({ error: "Agendamento nao encontrado." });
  res.json(booking);
});

router.post("/:id/cancel", async (req, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, professionalId: req.professionalId },
  });
  if (!booking) return res.status(404).json({ error: "Agendamento nao encontrado." });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELED" },
  });
  res.json(updated);
});

router.post("/:id/resend-charge", async (req, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, professionalId: req.professionalId },
    include: { client: true, service: true },
  });
  if (!booking) return res.status(404).json({ error: "Agendamento nao encontrado." });
  if (booking.depositPaid) {
    return res.status(422).json({ error: "O sinal desse agendamento ja foi pago." });
  }
  if (!booking.pixTxId) {
    return res.status(422).json({ error: "Esse agendamento ainda nao tem cobranca PIX gerada." });
  }

  const professional = await prisma.professional.findUnique({ where: { id: req.professionalId } });

  try {
    const payment = await getPayment(professional.mpAccessToken, booking.pixTxId);
    const pixCopiaECola = payment.point_of_interaction?.transaction_data?.qr_code;

    const valor = (booking.depositCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const horario = new Date(booking.startAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    await sendWhatsAppMessage(
      booking.client.phone,
      `Oi, ${booking.client.name}! Passando pra lembrar do sinal do seu horário de ` +
        `${booking.service.name} em ${horario} com ${professional.name}.\n` +
        `Valor do sinal: ${valor}\n\n` +
        `👇  *PIX COPIA E COLA*  👇\n`
    );

    await sendWhatsAppMessage(
      booking.client.phone,
      `     \`\`\`${pixCopiaECola}\`\`\``
    );

    res.json({ sent: true });
  } catch (err) {
    console.error("Erro ao reenviar cobranca pelo WhatsApp:", err);
    res.status(502).json({ error: err.message ?? "Nao foi possivel reenviar a cobranca agora." });
  }
});

// gera o PIX do valor restante (total do servico menos o sinal ja pago), pra cobrar
// na hora do atendimento — usa a conta Mercado Pago do PROPRIO profissional
router.post("/:id/charge-remaining", async (req, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, professionalId: req.professionalId },
    include: { client: true, service: true },
  });
  if (!booking) return res.status(404).json({ error: "Agendamento nao encontrado." });

  if (!booking.depositPaid) {
    return res.status(422).json({ error: "O sinal desse agendamento ainda nao foi pago." });
  }
  if (booking.remainingPaid) {
    return res.status(422).json({ error: "O restante desse agendamento ja foi pago." });
  }
  if (!booking.client.email) {
    return res.status(422).json({
      error: "Esse cliente nao tem e-mail cadastrado (agendamentos antigos podem nao ter). Peça o e-mail dele antes de cobrar.",
    });
  }

  const professional = await prisma.professional.findUnique({ where: { id: req.professionalId } });
  if (!professional.mpAccessToken) {
    return res.status(422).json({ error: "Conecte sua conta do Mercado Pago antes de cobrar pagamentos." });
  }

  const remainingCents = booking.service.priceCents - booking.depositCents;
  if (remainingCents <= 0) {
    return res.status(422).json({ error: "Nao ha valor restante a cobrar nesse agendamento." });
  }

  try {
    const payment = await createPixPayment(professional.mpAccessToken, {
      amountCents: remainingCents,
      description: `Restante — ${booking.service.name} com ${professional.name}`,
      externalId: `${booking.id}-remaining`,
      payerEmail: booking.client.email,
      payerName: booking.client.name,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { remainingCents, remainingPixTxId: String(payment.id) },
    });

    const txData = payment.point_of_interaction?.transaction_data;
    res.status(201).json({
      remainingCents,
      pixCopiaECola: txData?.qr_code,
      pixQrCodeBase64: txData?.qr_code_base64,
    });
  } catch (err) {
    console.error("Erro ao criar cobranca do restante no Mercado Pago:", err);
    res.status(502).json({ error: "Nao foi possivel gerar a cobranca agora. Tente novamente." });
  }
});

export default router;
