import { PrismaClient } from "@prisma/client";

// evita abrir varias conexoes durante hot-reload em dev
export const prisma = globalThis.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
