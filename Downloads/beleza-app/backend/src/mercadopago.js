const API_BASE = "https://api.mercadopago.com";

async function mpFetch(accessToken, path, options = {}) {
  if (!accessToken) {
    throw new Error("Esse profissional ainda nao conectou a conta do Mercado Pago.");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID(),
      ...options.headers,
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message ?? `Erro ${res.status} na API do Mercado Pago`);
  }
  return body;
}

// cria o pagamento PIX usando o access token do PROPRIO profissional — o dinheiro cai
// direto na conta dele, sem nenhuma etapa de repasse ou split da sua parte
export function createPixPayment(accessToken, { amountCents, description, externalId, payerEmail, payerName }) {
  const [firstName, ...rest] = payerName.trim().split(" ");
  return mpFetch(accessToken, "/v1/payments", {
    method: "POST",
    idempotencyKey: externalId,
    body: JSON.stringify({
      transaction_amount: amountCents / 100,
      description,
      payment_method_id: "pix",
      external_reference: externalId,
      payer: { email: payerEmail, first_name: firstName, last_name: rest.join(" ") || firstName },
    }),
  });
}

export function getPayment(accessToken, paymentId) {
  return mpFetch(accessToken, `/v1/payments/${paymentId}`, { method: "GET" });
}

// troca o "code" do OAuth pelo access_token/refresh_token do profissional
export async function exchangeOAuthCode(code) {
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.MP_OAUTH_REDIRECT_URI,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "Nao foi possivel conectar a conta do Mercado Pago.");
  return body;
}