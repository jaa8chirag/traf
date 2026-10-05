import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: env().DATABASE_URL, max: process.env.VERCEL ? 3 : 10 }) });

if (env().NODE_ENV !== "production") globalForPrisma.prisma = prisma;
