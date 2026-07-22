# Como trabalhar nesse repo em dupla

## Regra principal
Nunca commitar direto na `main`. Toda mudança entra por branch + Pull Request,
mesmo sendo só vocês dois — é o que evita um sobrescrever sem querer o que o
outro fez (ex: alguem mexe no schema do Prisma sem o outro saber).

## Fluxo do dia a dia

1. Antes de comecar qualquer coisa, atualiza sua `main` local:
   ```
   git checkout main
   git pull
   ```

2. Cria uma branch pra sua tarefa, com prefixo que indica o tipo:
   ```
   git checkout -b feature/tela-horarios
   git checkout -b fix/login-network
   git checkout -b chore/atualiza-dependencias
   ```

3. Trabalha, commita em pedacos pequenos e com mensagem clara:
   ```
   git add .
   git commit -m "feat: adiciona tela de horario de trabalho"
   ```

4. Sobe a branch e abre PR (pelo GitHub/GitLab, o botao aparece sozinho depois do push):
   ```
   git push -u origin feature/tela-horarios
   ```

5. O outro revisa antes de mergear — mesmo que seja só um "ok, testei e funcionou".

## Como dividir pra nao pisar no pe um do outro

Como o projeto tem 3 pastas relativamente independentes (`backend`, `mobile`,
`public-booking`), a forma mais simples de dividir é por pasta:

- Uma pessoa foca mais em `backend/` + `public-booking/` (compartilham o mesmo
  contrato de API do lado do link publico)
- Outra foca mais em `mobile/`

Quando alguem mexe em algo que afeta as duas pontas (ex: muda um campo que a
API devolve), avisa o outro na hora — nao deixa só a PR falar por si.

## Arquivos que puxam conflito com frequencia

- `backend/prisma/schema.prisma` — se os dois mexerem em modelos diferentes ao
  mesmo tempo, o conflito de merge aqui é chato de resolver manualmente. Avisem
  um ao outro antes de mudar o schema.
- `package.json` de cada pasta — evitem os dois rodarem `npm install` de pacotes
  diferentes na mesma branch sem sincronizar depois.

## .env nunca vai pro Git

Cada um cria o proprio `.env` localmente a partir do `.env.example` de cada
pasta (`backend/.env.example`). As credenciais reais (Supabase, Mercado Pago)
combinam por fora do Git — Whatsapp, ou um gerenciador de segredos se quiserem
formalizar mais pra frente.
