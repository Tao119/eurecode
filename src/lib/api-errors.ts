/**
 * Centralized API Error Handling Utilities
 * Inspired by: Stripe's error codes, Vercel's API design
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { API_ERROR_CODES, type ApiResponse, type ApiError } from "@/types/api";

// Extended error codes with Japanese messages
export const ERROR_MESSAGES: Record<string, { ja: string; en: string }> = {
  // Authentication
  INVALID_CREDENTIALS: {
    ja: "メールアドレスまたはパスワードが正しくありません",
    en: "Invalid email or password",
  },
  USER_EXISTS: {
    ja: "このメールアドレスは既に登録されています",
    en: "This email is already registered",
  },
  EMAIL_NOT_VERIFIED: {
    ja: "メールアドレスの確認が完了していません",
    en: "Email not verified",
  },
  INVALID_KEY: {
    ja: "無効なアクセスキーです",
    en: "Invalid access key",
  },
  KEY_EXPIRED: {
    ja: "このアクセスキーは有効期限が切れています",
    en: "This access key has expired",
  },
  KEY_ALREADY_USED: {
    ja: "このアクセスキーは既に使用されています",
    en: "This access key has already been used",
  },
  SESSION_EXPIRED: {
    ja: "セッションが切れました。再度ログインしてください",
    en: "Session expired. Please log in again",
  },
  ACCOUNT_DISABLED: {
    ja: "このアカウントは無効化されています",
    en: "This account has been disabled",
  },

  // Authorization
  UNAUTHORIZED: {
    ja: "ログインが必要です",
    en: "Authentication required",
  },
  FORBIDDEN: {
    ja: "この操作を行う権限がありません",
    en: "You don't have permission for this action",
  },
  INSUFFICIENT_PERMISSIONS: {
    ja: "この機能にアクセスする権限がありません",
    en: "Insufficient permissions for this feature",
  },

  // Credits/Tokens
  TOKEN_LIMIT_EXCEEDED: {
    ja: "本日のクレジット上限に達しました",
    en: "Daily credit limit exceeded",
  },
  INSUFFICIENT_TOKENS: {
    ja: "クレジットが不足しています",
    en: "Insufficient credits",
  },
  OUT_OF_CREDITS: {
    ja: "クレジットがなくなりました。追加購入またはプランのアップグレードをご検討ください",
    en: "Out of credits. Consider purchasing more or upgrading your plan",
  },

  // Validation
  VALIDATION_ERROR: {
    ja: "入力内容に問題があります",
    en: "Validation error",
  },
  INVALID_INPUT: {
    ja: "入力が無効です",
    en: "Invalid input",
  },
  MISSING_REQUIRED_FIELD: {
    ja: "必須項目が入力されていません",
    en: "Required field is missing",
  },
  INVALID_FORMAT: {
    ja: "形式が正しくありません",
    en: "Invalid format",
  },

  // Rate Limiting
  RATE_LIMITED: {
    ja: "リクエスト制限に達しました。しばらく待ってからお試しください",
    en: "Rate limit exceeded. Please try again later",
  },
  TOO_MANY_REQUESTS: {
    ja: "リクエストが多すぎます。少し待ってから再度お試しください",
    en: "Too many requests. Please wait before trying again",
  },

  // Server Errors
  INTERNAL_ERROR: {
    ja: "サーバーエラーが発生しました。しばらく経ってから再度お試しください",
    en: "Internal server error. Please try again later",
  },
  SERVICE_UNAVAILABLE: {
    ja: "サービスが一時的に利用できません",
    en: "Service temporarily unavailable",
  },
  DATABASE_ERROR: {
    ja: "データベースエラーが発生しました",
    en: "Database error occurred",
  },
  EXTERNAL_SERVICE_ERROR: {
    ja: "外部サービスへの接続に失敗しました",
    en: "Failed to connect to external service",
  },

  // Network
  NETWORK_ERROR: {
    ja: "ネットワークエラーが発生しました。インターネット接続を確認してください",
    en: "Network error. Please check your internet connection",
  },
  TIMEOUT: {
    ja: "リクエストがタイムアウトしました。再度お試しください",
    en: "Request timed out. Please try again",
  },

  // Resource
  NOT_FOUND: {
    ja: "指定されたリソースが見つかりません",
    en: "Resource not found",
  },
  ALREADY_EXISTS: {
    ja: "既に存在します",
    en: "Already exists",
  },
  CONFLICT: {
    ja: "データの競合が発生しました。ページを更新してください",
    en: "Data conflict. Please refresh the page",
  },

  // Chat/AI
  AI_ERROR: {
    ja: "AI処理中にエラーが発生しました",
    en: "Error during AI processing",
  },
  CHAT_ERROR: {
    ja: "メッセージの送信に失敗しました",
    en: "Failed to send message",
  },
  STREAM_ERROR: {
    ja: "ストリーミング中にエラーが発生しました",
    en: "Error during streaming",
  },

  // Default
  UNKNOWN_ERROR: {
    ja: "予期しないエラーが発生しました",
    en: "An unexpected error occurred",
  },
};

/**
 * Get error message by code
 */
export function getErrorMessage(code: string, locale: "ja" | "en" = "ja"): string {
  const messages = ERROR_MESSAGES[code];
  if (!messages) {
    return locale === "ja" ? "エラーが発生しました" : "An error occurred";
  }
  return messages[locale];
}

/**
 * Create a standardized API error
 */
export function createApiError(
  code: string,
  customMessage?: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    code,
    message: customMessage || getErrorMessage(code),
    details,
  };
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  code: string,
  status: number,
  customMessage?: string,
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: createApiError(code, customMessage, details),
    },
    { status }
  );
}

/**
 * Common error response helpers
 */
export const apiErrors = {
  unauthorized: (message?: string) =>
    errorResponse(API_ERROR_CODES.UNAUTHORIZED, 401, message),

  forbidden: (message?: string) =>
    errorResponse(API_ERROR_CODES.FORBIDDEN, 403, message),

  notFound: (resource: string) =>
    errorResponse("NOT_FOUND", 404, `${resource}が見つかりません`),

  validation: (details?: Record<string, unknown>) =>
    errorResponse(API_ERROR_CODES.VALIDATION_ERROR, 400, undefined, details),

  conflict: (message?: string) =>
    errorResponse("CONFLICT", 409, message),

  rateLimited: (retryAfter?: number) => {
    const response = errorResponse("RATE_LIMITED", 429);
    if (retryAfter) {
      response.headers.set("Retry-After", String(retryAfter));
    }
    return response;
  },

  internal: (message?: string) =>
    errorResponse(API_ERROR_CODES.INTERNAL_ERROR, 500, message),

  serviceUnavailable: (message?: string) =>
    errorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, 503, message),
};

/**
 * Parse Zod errors into user-friendly messages
 */
export function formatZodErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  });

  return errors;
}

/**
 * Handle Zod validation errors in API routes
 */
export function handleZodError(error: ZodError): NextResponse<ApiResponse<never>> {
  return errorResponse(
    API_ERROR_CODES.VALIDATION_ERROR,
    400,
    "入力内容に問題があります",
    { fields: formatZodErrors(error) }
  );
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Wrap async API handlers with error handling
 */
export function withApiErrorHandling<T>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler().catch((error) => {
    console.error("[API Error]", error);

    if (error instanceof ZodError) {
      return handleZodError(error);
    }

    if (isApiError(error)) {
      return errorResponse(error.code, 500, error.message);
    }

    return apiErrors.internal(
      process.env.NODE_ENV === "development" ? error.message : undefined
    );
  });
}
