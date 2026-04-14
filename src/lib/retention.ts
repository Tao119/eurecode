/**
 * Conversation history retention configuration
 *
 * Conversations are NEVER deleted from the database.
 * Retention controls only what is VISIBLE to users based on their plan.
 *
 * Per-plan visibility:
 * - free:    7 days
 * - starter: 30 days
 * - pro:     Unlimited
 * - max:     Unlimited
 */

export const RETENTION_CONFIG = {
  defaultDays: 7,

  byPlan: {
    free: 7,
    starter: 30,
    pro: -1,   // -1 = unlimited
    max: -1,   // -1 = unlimited
    // Organization plans
    business: -1,
    enterprise: -1,
  },
} as const;

type PlanKey = keyof typeof RETENTION_CONFIG.byPlan;

/**
 * Get retention days for a user based on their plan.
 * Returns -1 for unlimited retention.
 */
export function getRetentionDays(plan?: string | null): number {
  if (plan && plan in RETENTION_CONFIG.byPlan) {
    return RETENTION_CONFIG.byPlan[plan as PlanKey];
  }
  return RETENTION_CONFIG.defaultDays;
}

/**
 * Get the cutoff date for conversation visibility.
 * Conversations older than this date are hidden (not deleted) from the user.
 * Returns new Date(0) for unlimited retention plans.
 */
export function getRetentionCutoffDate(plan?: string | null): Date {
  const days = getRetentionDays(plan);
  if (days < 0) {
    return new Date(0); // Unlimited - show all conversations
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}
