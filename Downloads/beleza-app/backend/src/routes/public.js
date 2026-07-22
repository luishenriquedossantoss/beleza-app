import { Router } from "express";
import { prisma } from "../prisma.js";
import { mpPayment } from "../mercadopago.js";

const router = Router();

// dados que a pagina publica de agendamento precisa pra montar a tela
router.get("/:slug", async (req, res) => {
  const professional = await prisma.professional.findUnique({
    where: { slug: req.params.slug },
    include: { services: { where: { active: true } } },
  });
  if (!professional) return res.status(404).json({ error: "Profissional nao encontrado." });

  res.json({
    name: professional.name,
    slug: professional.slug,
    services: professional.services.map((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
      depositPercent: s.depositPercent,
    })),
  });
});

// horarios livres de um servico num dia especifico
router.get("/:slug/slots", async (req, res) => {
  const { serviceId, date } = req.query; // date = "2026-07-23"
  const professional = await prisma.professional.findUnique({
    where: { slug: req.params.slug },
    include: { workHours: true },
  });
  if (!professional) return res.status(404).json({ error: "Profissional nao encontrado." });

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return res.status(404).json({ error: "Servico nao encontrado." });

  const day = new Date(`${date}T00:00:00`);
  const weekday = day.getDay();
  const workHour = professional.workHours.find((w) => w.weekday === weekday);
  if (!workHour) return res.json({ slots: [] });

  const dayStart = new Date(day);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const existingBookings = await prisma.booking.findMany({
    where: {
      professionalId: professional.id,
      status: { not: "CANCELED" },
      startAt: { gte: dayStart, lte: dayEnd },
    },
    include: { service: true },
  });

  const slots = [];
  for (let m = workHour.startMinutes; m + service.durationMin <= workHour.endMinutes; m += 30) {
    const slotStart = new Date(day);
    slotStart.setMinutes(m);
    const slotEnd = new Date(slotStart.getTime() + service.durationMin * 60000);

    const conflicts = existingBookings.some((b) => {
      const bStart = b.startAt;
      const bEnd = new Date(bStart.getTime() + b.service.durationMin * 60000);
      return slotStart < bEnd && bStart < slotEnd;
    });

    if (!conflicts) {
      slots.push(slotStart.toISOString());
    }
  }

  res.json({ slots });
});

// cria o agendamento pendente de pagamento e gera a cobranca PIX real no Mercado Pago
router.post("/:slug/bookings", async (req, res) => {
  const { serviceId, startAt, clientName, clientPhone, clientEmail } = req.body;
  if (!serviceId || !startAt || !clientName || !clientPhone || !clientEmail) {
    return res.status(400).json({ error: "Preencha todos os dados pra continuar." });
  }

  const professional = await prisma.professional.findUnique({ where: { slug: req.params.slug } });
  if (!professional) return res.status(404).json({ error: "Profissional nao encontrado." });

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return res.status(404).json({ error: "Servico nao encontrado." });

  const client = await prisma.client.upsert({
    where: { professionalId_phone: { professionalId: professional.id, phone: clientPhone } },
    update: { name: clientName },
    create: { name: clientName, phone: clientPhone, professionalId: professional.id },
  });

  const depositCents = Math.round((service.priceCents * service.depositPercent) / 100);

  const booking = await prisma.booking.create({
    data: {
      startAt: new Date(startAt),
      depositCents,
      serviceId: service.id,
      clientId: client.id,
      professionalId: professional.id,
    },
  });

  try {
    const [firstName, ...rest] = clientName.trim().split(" ");
    const payment = await mpPayment.create({
      body: {
        transaction_amount: depositCents / 100,
        description: `Sinal — ${service.name} com ${professional.name}`,
        payment_method_id: "pix",
        external_reference: booking.id,
        notification_url: process.env.MP_WEBHOOK_URL,
        payer: {
          email: clientEmail,
          first_name: firstName,
          last_name: rest.join(" ") || firstName,
        },
      },
    });

    await prisma.booking.update({ where: { id: booking.id }, data: { pixTxId: String(payment.id) } });

    const txData = payment.point_of_interaction?.transaction_data;
    res.status(201).json({
      bookingId: booking.id,
      depositCents,
      pixCopiaECola: txData?.qr_code,
      pixQrCodeBase64: txData?.qr_code_base64,
    });
  } catch (err) {
    // se o pagamento falhar ao ser criado, nao deixa o agendamento orfao sem forma de pagar
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELED" } });
    console.error("Erro ao criar pagamento PIX no Mercado Pago:", err);
    res.status(502).json({ error: "Nao foi possivel gerar a cobranca PIX agora. Tente novamente." });
  }
});

// webhook chamado pelo Mercado Pago quando o status do pagamento muda
router.post("/webhook/pix", async (req, res) => {
  // o MP manda o id tanto no body quanto na query, dependendo da configuracao
  const paymentId = req.body?.data?.id ?? req.query["data.id"];
  if (!paymentId) return res.status(400).json({ error: "Notificacao sem id de pagamento." });

  try {
    const payment = await mpPayment.get({ id: paymentId });
    const bookingId = payment.external_reference;
    if (!bookingId) return res.status(200).json({ ok: true });

    if (payment.status === "approved") {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { depositPaid: true, status: "CONFIRMED" },
      });
    } else if (["rejected", "cancelled"].includes(payment.status)) {
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "CANCELED" } });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao processar webhook do Mercado Pago:", err);
    // responde 200 mesmo assim pra evitar que o MP fique reenviando a notificacao indefinidamente
    res.status(200).json({ ok: false });
  }
});

export default router;
