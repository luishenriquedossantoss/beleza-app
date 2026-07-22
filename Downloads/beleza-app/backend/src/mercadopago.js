import { MercadoPagoConfig, Payment } from "mercadopago";

if (!process.env.MP_ACCESS_TOKEN) {
  console.warn(
    "MP_ACCESS_TOKEN nao configurado — cadastre o Access Token de teste no .env pra gerar cobrancas PIX reais."
  );
}

export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN ?? "",
});

export const mpPayment = new Payment(mpClient);
