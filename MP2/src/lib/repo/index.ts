import { memoryRepo } from "@/lib/repo/memory";
import { prismaRepo } from "@/lib/repo/prismaRepo";

export type Repo = typeof memoryRepo;

function usePrismaRepo(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

let dbUnavailable = false;

function isDbUnavailable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error) {
    const code = String((error as { code: unknown }).code);
    if (code === "P1001" || code === "P1017") return true;
  }
  if (error instanceof Error && /can't reach database server/i.test(error.message)) {
    return true;
  }
  return false;
}

function createResilientRepo(primary: Repo, fallback: Repo): Repo {
  return new Proxy(primary, {
    get(target, prop, receiver) {
      const primaryValue = Reflect.get(target, prop, receiver);
      const fallbackValue = Reflect.get(fallback, prop, receiver);

      if (typeof primaryValue !== "function") {
        return dbUnavailable && fallbackValue !== undefined ? fallbackValue : primaryValue;
      }

      return (...args: unknown[]) => {
        const invoke = (impl: Repo) =>
          (Reflect.get(impl, prop, impl) as (...a: unknown[]) => unknown).apply(impl, args);

        if (dbUnavailable) {
          return invoke(fallback);
        }

        try {
          const result = invoke(target);
          return Promise.resolve(result).catch((error: unknown) => {
            if (!isDbUnavailable(error)) {
              throw error;
            }
            dbUnavailable = true;
            console.warn(
              "[repo] Postgres unreachable; falling back to in-memory storage for this dev session."
            );
            return invoke(fallback);
          });
        } catch (error) {
          if (!isDbUnavailable(error)) {
            throw error;
          }
          dbUnavailable = true;
          console.warn(
            "[repo] Postgres unreachable; falling back to in-memory storage for this dev session."
          );
          return invoke(fallback);
        }
      };
    }
  }) as Repo;
}

const baseRepo: Repo = usePrismaRepo() ? prismaRepo : memoryRepo;

export const repo: Repo =
  usePrismaRepo() && process.env.NODE_ENV === "development"
    ? createResilientRepo(prismaRepo, memoryRepo)
    : baseRepo;

export function resetRepoFallbackStateForTests(): void {
  dbUnavailable = false;
}
