import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { PLAN_LIMITS } from "../planLimits.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const services = await prisma.service.findMany({
    where: { professionalId: req.professionalId, active: true },
    orderBy: { name: "asc" },
  });
  res.json(services);
});

router.post("/", async (req, res) => {
  const { name, durationMin, priceCents, depositPercent } = req.body;
  if (!name || !durationMin || !priceCents) {
    return res.status(400).json({ error: "Preencha nome, duracao e preco do servico." });
  }

  const professional = await prisma.professional.findUnique({ where: { id: req.professionalId } });
  const currentCount = await prisma.service.count({
    where: { professionalId: req.professionalId, active: true },
  });
  const limit = PLAN_LIMITS[professional.plan].maxServices;
  if (currentCount >= limit) {
    return res.status(403).json({
      error: `Seu plano atual permite ${limit} servico(s) ativo(s). Faca upgrade para PRO para cadastrar mais.`,
    });
  }

  const service = await prisma.service.create({
    data: {
      name,
      durationMin,
      priceCents,
      depositPercent: depositPercent ?? 30,
      professionalId: req.professionalId,
    },
  });
  res.status(201).json(service);
});

router.patch("/:id", async (req, res) => {
  const service = await prisma.service.findFirst({
    where: { id: req.params.id, professionalId: req.professionalId },
  });
  if (!service) return res.status(404).json({ error: "Servico nao encontrado." });

  const updated = await prisma.service.update({
    where: { id: service.id },
    data: req.body,
  });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const service = await prisma.service.findFirst({
    where: { id: req.params.id, professionalId: req.professionalId },
  });
  if (!service) return res.status(404).json({ error: "Servico nao encontrado." });

  // soft delete pra nao quebrar agendamentos ja existentes
  await prisma.service.update({ where: { id: service.id }, data: { active: false } });
  res.status(204).end();
});

export default router;
