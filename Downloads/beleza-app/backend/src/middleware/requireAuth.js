import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Faca login para continuar." });
  }
  try {
    const token = header.replace("Bearer ", "");
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.professionalId = payload.professionalId;
    next();
  } catch {
    return res.status(401).json({ error: "Sessao expirada, faca login novamente." });
  }
}
