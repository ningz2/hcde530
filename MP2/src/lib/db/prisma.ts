import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient__: PrismaClient | undefined;
}

function withDevConnectTimeout(url: string | undefined): string | undefined {
  if (!url || process.env.NODE_ENV === "production") return url;
  if (url.includes("connect_timeout=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connect_timeout=3`;
}

export const prisma =
  global.__prismaClient__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    datasources: {
      db: {
        url: withDevConnectTimeout(process.env.DATABASE_URL)
      }
    }
  });

if (process.env.NODE_ENV !== "production") {
  global.__prismaClient__ = prisma;
}
