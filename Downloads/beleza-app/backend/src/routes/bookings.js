import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

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
    include: { client: true },
  });
  if (!booking) return res.status(404).json({ error: "Agendamento nao encontrado." });

  // TODO: integrar com provedor de WhatsApp (Twilio ou Z-API) para reenviar
  // o link de pagamento do sinal pro telefone booking.client.phone
  res.json({ sent: true });
});

export default router;
