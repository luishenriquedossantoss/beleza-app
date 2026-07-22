import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

// lista o horario de trabalho configurado (um registro por dia da semana em que atende)
router.get("/", async (req, res) => {
  const hours = await prisma.workHour.findMany({
    where: { professionalId: req.professionalId },
    orderBy: { weekday: "asc" },
  });
  res.json(hours);
});

// substitui o horario inteiro da semana de uma vez — mais simples que editar dia a dia
router.put("/", async (req, res) => {
  const { hours } = req.body; // [{ weekday, startMinutes, endMinutes }]
  if (!Array.isArray(hours)) {
    return res.status(400).json({ error: "Envie a lista de horarios da semana." });
  }

  await prisma.workHour.deleteMany({ where: { professionalId: req.professionalId } });
  await prisma.workHour.createMany({
    data: hours.map((h) => ({
      weekday: h.weekday,
      startMinutes: h.startMinutes,
      endMinutes: h.endMinutes,
      professionalId: req.professionalId,
    })),
  });

  const updated = await prisma.workHour.findMany({
    where: { professionalId: req.professionalId },
    orderBy: { weekday: "asc" },
  });
  res.json(updated);
});

export default router;
