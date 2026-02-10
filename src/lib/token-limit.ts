import { prisma } from "./prisma";
import type { SubscriptionPlan } from "@/types/user";

// Token limits by subscription plan (daily tokens)
// These are generous limits for learning/save operations
const PLAN_TOKEN_LIMITS: Record<SubscriptionPlan, number> = {
  // Individual plans
  free: 50000,      // 約12,500文字/日
  starter: 200000,  // 約50,000文字/日
  pro: 500000,      // 約125,000文字/日
  max: 1000000,     // 約250,000文字/日
  // Organization plans
  business: 500000,
  enterprise: 999999999,
};

export interface TokenLimitCheck {
  allowed: boolean;
  currentUsage: number;
  dailyLimit: number;
  remaining: number;
}

/**
 * Check if user has enough tokens remaining for an operation
 * @param userId - The user ID to check
 * @param requiredTokens - Number of tokens required for the operation
 * @returns TokenLimitCheck object with usage details
 */
export async function checkTokenLimit(
  userId: string,
  requiredTokens: number = 0
): Promise<TokenLimitCheck> {
  // Get user with subscription and accessKey info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userType: true,
      accessKey: {
        select: { dailyTokenLimit: true },
      },
      subscription: {
        select: { individualPlan: true },
      },
      organization: {
        select: {
          subscription: {
            select: { organizationPlan: true },
          },
        },
      },
    },
  });

  // Determine daily limit based on user type
  let dailyLimit: number;

  if (user?.userType === "member" && user.accessKey?.dailyTokenLimit) {
    // Organization member: use accessKey limit (converted to daily token limit)
    // accessKey.dailyTokenLimit is conversation points, multiply for token estimate
    dailyLimit = user.accessKey.dailyTokenLimit * 1000;
  } else if (user?.userType === "individual" && user.subscription?.individualPlan) {
    // Individual user: use subscription plan limit
    const plan = user.subscription.individualPlan as SubscriptionPlan;
    dailyLimit = PLAN_TOKEN_LIMITS[plan] || PLAN_TOKEN_LIMITS.free;
  } else if (user?.userType === "admin" && user.organization?.subscription?.organizationPlan) {
    // Organization admin: use organization plan limit
    const plan = user.organization.subscription.organizationPlan as SubscriptionPlan;
    dailyLimit = PLAN_TOKEN_LIMITS[plan] || PLAN_TOKEN_LIMITS.business;
  } else {
    // Fallback to default
    dailyLimit = Number(process.env.DEFAULT_DAILY_TOKEN_LIMIT) || 50000;
  }

  // Get today's usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tokenUsage = await prisma.tokenUsage.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });

  const currentUsage = tokenUsage?.tokensUsed || 0;
  const remaining = Math.max(0, dailyLimit - currentUsage);
  const allowed = remaining >= requiredTokens;

  return {
    allowed,
    currentUsage,
    dailyLimit,
    remaining,
  };
}

/**
 * Estimate tokens from content length (1 token ≈ 4 characters)
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

/**
 * Update token usage for a user
 */
export async function updateTokenUsage(
  userId: string,
  tokens: number,
  category: string = "learning"
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.tokenUsage.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    create: {
      userId,
      date: today,
      tokensUsed: tokens,
      breakdown: { [category]: tokens },
    },
    update: {
      tokensUsed: { increment: tokens },
    },
  });

  // Update the breakdown separately to handle JSON update
  const existingUsage = await prisma.tokenUsage.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  if (existingUsage) {
    const breakdown = (existingUsage.breakdown as Record<string, number>) || {};
    breakdown[category] = (breakdown[category] || 0) + tokens;
    await prisma.tokenUsage.update({
      where: { userId_date: { userId, date: today } },
      data: { breakdown },
    });
  }
}

/**
 * Estimate total tokens for all messages in a conversation
 */
export function estimateConversationTokens(
  messages: Array<{ content: string }>,
  systemPrompt: string
): number {
  const messageTokens = messages.reduce(
    (sum, m) => sum + estimateTokens(m.content),
    0
  );
  const systemTokens = estimateTokens(systemPrompt);
  return messageTokens + systemTokens;
}

/** Reserved tokens for Claude response */
export const RESPONSE_TOKEN_RESERVE = 4096;

// Error code for token limit exceeded
export const TOKEN_LIMIT_EXCEEDED_CODE = "TOKEN_LIMIT_EXCEEDED";
