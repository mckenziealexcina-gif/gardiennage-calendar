import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

// Augment the global scope to hold the Prisma client
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const buildPrismaClient = (): PrismaClient => {
  const isTurso = process.env.DATABASE_URL?.startsWith("libsql:");

  if (isTurso) {
    console.log("Connecting to Turso database...");
    const turso = createClient({
      url: process.env.DATABASE_URL!,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });

    const adapter = new PrismaLibSQL(turso);
    return new PrismaClient({ adapter });
  }

  console.log("Connecting to local SQLite database...");
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

// Prevent multiple instances of Prisma Client in development
export const prisma = global.prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
