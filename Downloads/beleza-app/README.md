# Beleza App — MVP

Sistema de agenda e cobranca de sinal via PIX para profissionais de beleza autonomos
(manicures, esteticistas, maquiadoras) que atendem sozinhos.

## Estrutura

```
backend/          API Node/Express + Prisma (Postgres)
mobile/           App do profissional em React Native + Expo (expo-router)
public-booking/   Pagina publica de agendamento em Next.js — o cliente acessa
                  pelo link, sem precisar instalar nada
```

## Rodando localmente

### 1. Backend
```
cd backend
cp .env.example .env   # ajuste DATABASE_URL e JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run dev             # sobe em http://localhost:3333
```

### 2. Mobile (app do profissional)
```
cd mobile
npm install
npx expo start
```
Cria uma variavel `EXPO_PUBLIC_API_URL` apontando pro backend (ex: seu IP local na rede,
ja que o simulador/celular nao enxerga `localhost` da sua maquina).

### 3. Public booking (pagina do cliente)
```
cd public-booking
npm install
npm run dev              # sobe em http://localhost:3000
```
Acesse `http://localhost:3000/{slug-do-profissional}` — o slug e gerado automaticamente
no cadastro (`POST /auth/register`).

## Configurando o Mercado Pago (PIX)

1. Crie uma aplicacao em https://www.mercadopago.com.br/developers/panel/app
2. Copie o **Access Token de teste** (comeca com `TEST-`) e cole em `MP_ACCESS_TOKEN` no `.env`
3. O webhook precisa de uma URL publica. Em dev, use `ngrok http 3333` e cole a URL gerada
   em `MP_WEBHOOK_URL` (ex: `https://abcd1234.ngrok.io/public/webhook/pix`) — e cadastre a
   mesma URL no painel do Mercado Pago em Webhooks
4. Pra simular um pagamento aprovado em teste, use os dados de comprador de teste do MP
   (veja "Testando pagamentos" na documentacao deles) — o `payment.status` chega como
   `approved` no webhook e o agendamento e confirmado automaticamente
5. Quando for pra producao, troque o Access Token de teste pelo de producao (`APP_USR-...`)

O fluxo já implementado em `backend/src/routes/public.js`:
- `POST /public/:slug/bookings` cria o agendamento e gera o pagamento PIX real via
  `mercadopago` SDK, devolvendo `pixQrCodeBase64` (imagem do QR) e `pixCopiaECola` (codigo)
- `POST /public/webhook/pix` recebe a notificacao do Mercado Pago, busca o pagamento pelo
  id, e confirma ou cancela o agendamento (`external_reference`) de acordo com o status

## O que falta pra virar produto real

- Integrar envio de WhatsApp (Twilio ou Z-API) pros lembretes automaticos e reenvio de
  cobranca em `backend/src/routes/bookings.js`
- Cron job pra disparar lembrete 24h e 2h antes de cada agendamento
