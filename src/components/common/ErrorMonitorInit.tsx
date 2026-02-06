"use client";

import { useEffect } from "react";
import { setupGlobalErrorHandlers } from "@/lib/error-monitor";

/**
 * Initialize global error monitoring on mount
 * Place this component once in the root layout
 */
export function ErrorMonitorInit() {
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return null;
}
