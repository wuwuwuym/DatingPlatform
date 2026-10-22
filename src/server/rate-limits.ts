import { RateLimiter } from "@/lib/rate-limit";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Process-local limiters. They protect the demo from accidental hammering and
 * brute-force attempts; a multi-instance deployment should move this to Redis.
 */
export const limiters = {
  register: new RateLimiter(6, 10 * MINUTE),
  login: new RateLimiter(10, 5 * MINUTE),
  verifyCode: new RateLimiter(8, 10 * MINUTE),
  message: new RateLimiter(30, MINUTE),
  checkin: new RateLimiter(30, MINUTE),
  report: new RateLimiter(10, 24 * HOUR),
  adminLogin: new RateLimiter(8, 10 * MINUTE),
  adminWrite: new RateLimiter(60, MINUTE),
};
