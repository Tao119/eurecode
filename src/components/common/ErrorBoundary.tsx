"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { captureReactError } from "@/lib/error-monitor";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
  showDetails?: boolean;
  level?: "page" | "section" | "component";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * React Error Boundary Component
 *
 * Usage:
 * - Page level: <ErrorBoundary level="page">...</ErrorBoundary>
 * - Section level: <ErrorBoundary level="section">...</ErrorBoundary>
 * - Component level: <ErrorBoundary level="component">...</ErrorBoundary>
 *
 * Features:
 * - Catches JavaScript errors in child components
 * - Logs errors to monitoring system
 * - Provides user-friendly fallback UI
 * - Supports retry/reset functionality
 * - Auto-reset on key changes (resetKeys prop)
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to error monitoring
    captureReactError(error, { componentStack: errorInfo.componentStack ?? undefined });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const keysChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (keysChanged) {
        this.resetError();
      }
    }
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback based on level
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.resetError}
          showDetails={this.props.showDetails}
          level={this.props.level || "section"}
        />
      );
    }

    return this.props.children;
  }
}

// Fallback UI Component
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onReset: () => void;
  showDetails?: boolean;
  level: "page" | "section" | "component";
}

function ErrorFallback({ error, onReset, showDetails, level }: ErrorFallbackProps) {
  const isPage = level === "page";
  const isComponent = level === "component";

  // Compact component-level fallback
  if (isComponent) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
        <span className="material-symbols-outlined text-lg">error</span>
        <span>読み込みエラー</span>
        <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto h-7 text-xs">
          再試行
        </Button>
      </div>
    );
  }

  // Section or Page level fallback
  return (
    <Card className={isPage ? "w-full max-w-md mx-auto mt-20" : "w-full"}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-destructive">
              error_outline
            </span>
          </div>
        </div>
        <CardTitle className="text-xl">
          {isPage ? "ページの表示に問題が発生しました" : "コンテンツの読み込みに失敗しました"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          予期しないエラーが発生しました。
          {isPage ? "ページを再読み込みするか、" : "再試行するか、"}
          問題が続く場合はサポートにお問い合わせください。
        </p>

        {showDetails && error && (
          <div className="p-3 bg-muted rounded-lg text-left">
            <p className="text-xs font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button onClick={onReset} className="w-full">
          <span className="material-symbols-outlined text-lg mr-2">refresh</span>
          再試行
        </Button>
        {isPage && (
          <Button variant="outline" onClick={() => window.location.href = "/home"} className="w-full">
            <span className="material-symbols-outlined text-lg mr-2">home</span>
            ホームに戻る
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryProps, "children">
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
