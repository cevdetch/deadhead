import type { CompiledRules } from "../core/engine.ts";

export type CompiledCache = {
  getOrCreate(key: string, create: () => CompiledRules): CompiledRules;
};

/** Process-lifetime subsets, with least-recently-used eviction. */
export function createCompiledCache(limit = 128): CompiledCache {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("compiled cache limit must be a positive safe integer");
  const entries = new Map<string, CompiledRules>();
  return {
    getOrCreate(key, create) {
      const cached = entries.get(key);
      if (cached !== undefined) {
        entries.delete(key);
        entries.set(key, cached);
        return cached;
      }
      const value = create();
      entries.set(key, value);
      if (entries.size > limit) entries.delete(entries.keys().next().value!);
      return value;
    },
  };
}
