import type { Context, Next } from 'hono';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const GENERAL_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 60,            // 60 requests per minute
};

const AUTH_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute
  max: 5,               // 5 requests per minute
};

// Store to track IP request logs: IP -> { general: number[], auth: number[] }
const ipCache = new Map<string, { general: number[]; auth: number[] }>();

// Clean up expired cache entries periodically to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, logs] of ipCache.entries()) {
    logs.general = logs.general.filter(t => now - t < GENERAL_LIMIT.windowMs);
    logs.auth = logs.auth.filter(t => now - t < AUTH_LIMIT.windowMs);
    if (logs.general.length === 0 && logs.auth.length === 0) {
      ipCache.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref(); // unref so it doesn't block process exit in tests

export async function rateLimiter(c: Context, next: Next) {
  // Get client IP
  const forwardedFor = c.req.header('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0] ? forwardedFor.split(',')[0]!.trim() : 'unknown-ip';

  const path = c.req.path;
  const isAuthRoute = path.startsWith('/api/auth/login') ||
                      path.startsWith('/api/auth/register') ||
                      path.startsWith('/api/auth/forgot-password') ||
                      path.startsWith('/api/auth/reset-password') ||
                      path.startsWith('/api/auth/change-password');

  const now = Date.now();
  let ipLogs = ipCache.get(ip);
  if (!ipLogs) {
    ipLogs = { general: [], auth: [] };
    ipCache.set(ip, ipLogs);
  }

  if (isAuthRoute) {
    // Clean expired logs
    ipLogs.auth = ipLogs.auth.filter(t => now - t < AUTH_LIMIT.windowMs);
    if (ipLogs.auth.length >= AUTH_LIMIT.max) {
      const oldestLog = ipLogs.auth[0] || now; // Fallback to now to avoid negative time if logs are empty
      const timeRemainingSeconds = Math.max(1, Math.ceil((AUTH_LIMIT.windowMs - (now - oldestLog)) / 1000));
      c.header('Retry-After', String(timeRemainingSeconds));
      return c.json({
        error: 'Too Many Requests',
        message: `Too many requests on auth endpoints. Please try again in ${timeRemainingSeconds} seconds.`,
        retryAfter: timeRemainingSeconds
      }, 429);
    }
    ipLogs.auth.push(now);
  } else {
    // Clean expired logs
    ipLogs.general = ipLogs.general.filter(t => now - t < GENERAL_LIMIT.windowMs);
    if (ipLogs.general.length >= GENERAL_LIMIT.max) {
      const oldestLog = ipLogs.general[0] || now; // Fallback to now to avoid negative time if logs are empty
      const timeRemainingSeconds = Math.max(1, Math.ceil((GENERAL_LIMIT.windowMs - (now - oldestLog)) / 1000));
      c.header('Retry-After', String(timeRemainingSeconds));
      return c.json({
        error: 'Too Many Requests',
        message: `Too many requests. Please try again in ${timeRemainingSeconds} seconds.`,
        retryAfter: timeRemainingSeconds
      }, 429);
    }
    ipLogs.general.push(now);
  }

  await next();
}
