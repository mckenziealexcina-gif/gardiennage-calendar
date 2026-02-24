import { PrismaClient } from "@prisma/client";

/* eslint-disable */
let _prisma: any;

function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;

  const url = process.env.DATABASE_URL ?? "";

  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    // Loaded lazily so the module isn't evaluated at build time
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const adapter = new PrismaLibSql({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    _prisma = new PrismaClient({ adapter });
  } else {
    _prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }

  return _prisma;
}
/* eslint-enable */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = globalForPrisma.prisma ?? getPrisma();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
    // eslint-disable-next-line
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
