import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

router.post("/register", async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Preencha nome, telefone e senha." });
  }

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.professional.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const professional = await prisma.professional.create({
    data: { name, phone, slug, passwordHash },
  });

  const token = jwt.sign({ professionalId: professional.id }, JWT_SECRET, { expiresIn: "30d" });
  res.status(201).json({ token, professional: { id: professional.id, name, slug, plan: professional.plan } });
});

router.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  const professional = await prisma.professional.findFirst({ where: { phone } });
  if (!professional || !(await bcrypt.compare(password, professional.passwordHash))) {
    return res.status(401).json({ error: "Telefone ou senha incorretos." });
  }
  const token = jwt.sign({ professionalId: professional.id }, JWT_SECRET, { expiresIn: "30d" });
  res.json({
    token,
    professional: { id: professional.id, name: professional.name, slug: professional.slug, plan: professional.plan },
  });
});

export default router;
