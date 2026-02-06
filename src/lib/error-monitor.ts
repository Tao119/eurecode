/**
 * Error monitoring utility for tracking and reporting application errors
 * Integrates with console and can be extended for external services (Sentry, etc.)
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorReport {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  url?: string;
  userAgent?: string;
}

type ErrorSeverity = "error" | "warning" | "info";

// Store for recent errors (for debugging)
const recentErrors: ErrorReport[] = [];
const MAX_STORED_ERRORS = 50;

/**
 * Capture and log an error with context
 */
export function captureError(
  error: Error | string,
  context: ErrorContext = {},
  severity: ErrorSeverity = "error"
): void {
  const errorObj = typeof error === "string" ? new Error(error) : error;

  const report: ErrorReport = {
    message: errorObj.message,
    stack: errorObj.stack,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  // Store in memory for debugging
  recentErrors.unshift(report);
  if (recentErrors.length > MAX_STORED_ERRORS) {
    recentErrors.pop();
  }

  // Log based on severity
  const logPrefix = `[${severity.toUpperCase()}]`;
  const contextStr = Object.keys(context).length > 0
    ? ` | Context: ${JSON.stringify(context)}`
    : "";

  switch (severity) {
    case "error":
      console.error(`${logPrefix} ${errorObj.message}${contextStr}`, errorObj);
      break;
    case "warning":
      console.warn(`${logPrefix} ${errorObj.message}${contextStr}`);
      break;
    case "info":
      console.info(`${logPrefix} ${errorObj.message}${contextStr}`);
      break;
  }

  // TODO: Send to external service in production
  // if (process.env.NODE_ENV === 'production') {
  //   sendToSentry(report);
  // }
}

/**
 * Capture a warning (non-fatal issue)
 */
export function captureWarning(message: string, context: ErrorContext = {}): void {
  captureError(message, context, "warning");
}

/**
 * Capture an info message for debugging
 */
export function captureInfo(message: string, context: ErrorContext = {}): void {
  captureError(message, context, "info");
}

/**
 * Get recent errors for debugging
 */
export function getRecentErrors(): ErrorReport[] {
  return [...recentErrors];
}

/**
 * Clear stored errors
 */
export function clearErrors(): void {
  recentErrors.length = 0;
}

/**
 * Wrap an async function with error capturing
 */
export function withErrorCapture<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = {}
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  };
}

/**
 * React Error Boundary helper - call from componentDidCatch or error.tsx
 */
export function captureReactError(
  error: Error,
  errorInfo?: { componentStack?: string }
): void {
  captureError(error, {
    component: "ErrorBoundary",
    metadata: { componentStack: errorInfo?.componentStack },
  });
}

/**
 * Setup global error handlers (call once in app initialization)
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    captureError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { action: "unhandledrejection" }
    );
  });

  // Global error handler
  window.addEventListener("error", (event) => {
    captureError(event.error || new Error(event.message), {
      action: "globalError",
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}
