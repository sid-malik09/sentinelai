import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(60, "60 s"), // 60 requests per minute
    analytics: true,
    prefix: "sentinelai:ratelimit",
  });

  return ratelimit;
}

export async function checkRateLimit(
  identifier: string
): Promise<NextResponse | null> {
  const rl = getRatelimit();
  if (!rl) return null; // No rate limiting if Redis not configured

  const { success, limit, remaining, reset } = await rl.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
        },
      }
    );
  }

  return null;
}

// Stricter rate limiter for Claude API calls (cost control)
let claudeRatelimit: Ratelimit | null = null;

export function getClaudeRatelimit(): Ratelimit | null {
  if (claudeRatelimit) return claudeRatelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  claudeRatelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.tokenBucket(100, "1 h", 100), // 100 per hour
    prefix: "sentinelai:claude",
  });

  return claudeRatelimit;
}
