import { memoryRepo } from "@/lib/repo/memory";
import { prismaRepo } from "@/lib/repo/prismaRepo";

function usePrismaRepo(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

export const repo = usePrismaRepo() ? prismaRepo : memoryRepo;
