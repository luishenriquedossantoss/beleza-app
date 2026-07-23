import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { exchangeOAuthCode } from "../mercadopago.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// devolve o status atual da conexao (o app usa isso pra mostrar "conectado" ou nao)
router.get("/status", requireAuth, async (req, res) => {
  const professional = await prisma.professional.findUnique({ where: { id: req.professionalId } });
  res.json({ connected: Boolean(professional.mpAccessToken), mpUserId: professional.mpUserId });
});

// gera a URL de autorizacao do Mercado Pago — o app abre essa URL num navegador embutido
router.get("/connect", requireAuth, async (req, res) => {
  const state = jwt.sign({ professionalId: req.professionalId }, JWT_SECRET, { expiresIn: "10m" });

  const url = new URL("https://auth.mercadopago.com.br/authorization");
  url.searchParams.set("client_id", process.env.MP_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", process.env.MP_OAUTH_REDIRECT_URI);
  url.searchParams.set("state", state);

  res.json({ url: url.toString() });
});

// o Mercado Pago chama essa rota depois que o profissional autoriza — SEM header de auth,
// entao a identidade do profissional vem validando o "state" assinado, nao um token Bearer
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  try {
    const { professionalId } = jwt.verify(state, JWT_SECRET);
    const tokens = await exchangeOAuthCode(code);

    await prisma.professional.update({
      where: { id: professionalId },
      data: {
        mpUserId: String(tokens.user_id),
        mpAccessToken: tokens.access_token,
        mpRefreshToken: tokens.refresh_token,
        mpTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    res.redirect("belezaapp://payment-connected");
  } catch (err) {
    console.error("Erro no callback OAuth do Mercado Pago:", err);
    res.redirect("belezaapp://payment-connected?error=1");
  }
});

export default router;