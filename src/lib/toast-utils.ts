import { toast } from "sonner";

type ToastType = "success" | "error" | "info" | "warning" | "loading";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Show a success toast
 */
export function showSuccess(message: string, options?: ToastOptions) {
  return toast.success(message, {
    description: options?.description,
    duration: options?.duration ?? 3000,
    action: options?.action,
  });
}

/**
 * Show an error toast
 */
export function showError(message: string, options?: ToastOptions) {
  return toast.error(message, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: options?.action,
  });
}

/**
 * Show an info toast
 */
export function showInfo(message: string, options?: ToastOptions) {
  return toast.info(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
  });
}

/**
 * Show a warning toast
 */
export function showWarning(message: string, options?: ToastOptions) {
  return toast.warning(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
  });
}

/**
 * Show a loading toast (returns dismiss function)
 */
export function showLoading(message: string): string | number {
  return toast.loading(message);
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismiss();
}

/**
 * Execute an async operation with loading/success/error toasts
 */
export async function withToast<T>(
  operation: () => Promise<T>,
  options: {
    loading: string;
    success: string | ((result: T) => string);
    error: string | ((error: Error) => string);
  }
): Promise<T> {
  const toastId = toast.loading(options.loading);

  try {
    const result = await operation();
    const successMessage =
      typeof options.success === "function"
        ? options.success(result)
        : options.success;
    toast.success(successMessage, { id: toastId });
    return result;
  } catch (error) {
    const errorMessage =
      typeof options.error === "function"
        ? options.error(error instanceof Error ? error : new Error(String(error)))
        : options.error;
    toast.error(errorMessage, { id: toastId });
    throw error;
  }
}

/**
 * Execute an async operation with a promise toast
 * Returns the original promise result
 */
export async function promiseToast<T>(
  promise: Promise<T>,
  options: {
    loading: string;
    success: string | ((result: T) => string);
    error: string | ((error: Error) => string);
  }
): Promise<T> {
  toast.promise(promise, {
    loading: options.loading,
    success: (data: T) =>
      typeof options.success === "function" ? options.success(data) : options.success,
    error: (err: Error) =>
      typeof options.error === "function" ? options.error(err) : options.error,
  });
  return promise;
}

/**
 * Common toast presets for typical operations
 */
export const toastPresets = {
  save: () =>
    withToast(
      async () => {},
      {
        loading: "保存中...",
        success: "保存しました",
        error: "保存に失敗しました",
      }
    ),

  delete: () =>
    withToast(
      async () => {},
      {
        loading: "削除中...",
        success: "削除しました",
        error: "削除に失敗しました",
      }
    ),

  copy: (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("コピーしました");
  },

  networkError: (onRetry?: () => void) =>
    showError("ネットワークエラーが発生しました", {
      description: "インターネット接続を確認してください",
      duration: 8000,
      action: onRetry
        ? {
            label: "再試行",
            onClick: onRetry,
          }
        : undefined,
    }),

  sessionExpired: () =>
    showWarning("セッションが切れました", {
      description: "再度ログインしてください",
      action: {
        label: "ログイン",
        onClick: () => (window.location.href = "/login"),
      },
    }),

  chatError: (onRetry?: () => void) =>
    showError("メッセージの送信に失敗しました", {
      description: "もう一度お試しください",
      duration: 8000,
      action: onRetry
        ? {
            label: "再送信",
            onClick: onRetry,
          }
        : undefined,
    }),

  rateLimited: () =>
    showWarning("リクエスト制限に達しました", {
      description: "しばらく待ってからお試しください",
      duration: 10000,
    }),

  outOfCredits: () =>
    showError("クレジットが不足しています", {
      description: "プランをアップグレードするか、クレジットを購入してください",
      duration: 10000,
      action: {
        label: "購入",
        onClick: () => (window.location.href = "/settings/billing"),
      },
    }),
};

/**
 * Create a reusable toast function for async operations
 */
export function createAsyncToast<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    loading: string;
    success: string | ((result: TResult) => string);
    error: string | ((error: Error) => string);
  }
) {
  return async (...args: TArgs): Promise<TResult> => {
    return withToast(() => fn(...args), options);
  };
}
