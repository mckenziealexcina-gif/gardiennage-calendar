/* eslint-disable */
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function buildClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";

  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    const { PrismaLibSql } = require("@prisma/adapter-libsql") as {
      PrismaLibSql: new (config: { url: string; authToken?: string }) => object;
    };
    const adapter = new PrismaLibSql({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter } as never);
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = global.prismaGlobal ?? buildClient();

if (process.env.NODE_ENV !== "production") global.prismaGlobal = prisma;
