import { NextRequest, NextResponse } from "next/server";

/**
 * Conversation cleanup endpoint (DISABLED).
 *
 * Conversations are no longer deleted from the database.
 * Retention is enforced at the API layer based on user plan (display-only).
 * This endpoint is kept to avoid Vercel cron errors but performs no deletion.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Conversation cleanup is disabled. Retention is enforced at the display layer based on user plan.",
    deletedCount: 0,
  });
}
