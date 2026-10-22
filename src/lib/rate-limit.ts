export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

/**
 * In-memory sliding window. Good enough for a single-instance MVP demo; swap for
 * Redis/Upstash before horizontal scaling.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    for (const [key, stamps] of this.hits) {
      const fresh = stamps.filter((stamp) => stamp > cutoff);
      if (fresh.length === 0) this.hits.delete(key);
      else this.hits.set(key, fresh);
    }
  }

  hit(key: string, now: number = Date.now()): RateLimitResult {
    if (this.hits.size > 5_000) this.prune(now);

    const cutoff = now - this.windowMs;
    const stamps = (this.hits.get(key) ?? []).filter((stamp) => stamp > cutoff);

    if (stamps.length >= this.max) {
      const oldest = stamps[0] ?? now;
      this.hits.set(key, stamps);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)),
        remaining: 0,
      };
    }

    stamps.push(now);
    this.hits.set(key, stamps);
    return { allowed: true, retryAfterSeconds: 0, remaining: this.max - stamps.length };
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  resetAll(): void {
    this.hits.clear();
  }
}
