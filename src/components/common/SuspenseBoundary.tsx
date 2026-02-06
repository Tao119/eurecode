"use client";

import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Default loading skeleton for content
 */
export function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  );
}

/**
 * Card-based loading skeleton
 */
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * List-based loading skeleton
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table-based loading skeleton
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2 animate-pulse">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Reusable Suspense boundary with customizable fallback
 */
export function SuspenseBoundary({ children, fallback }: SuspenseBoundaryProps) {
  return (
    <Suspense fallback={fallback ?? <ContentSkeleton />}>
      {children}
    </Suspense>
  );
}

/**
 * Suspense boundary for card grids
 */
export function CardsSuspense({
  children,
  count = 3
}: {
  children: ReactNode;
  count?: number
}) {
  return (
    <Suspense fallback={<CardSkeleton count={count} />}>
      {children}
    </Suspense>
  );
}

/**
 * Suspense boundary for lists
 */
export function ListSuspense({
  children,
  count = 5
}: {
  children: ReactNode;
  count?: number
}) {
  return (
    <Suspense fallback={<ListSkeleton count={count} />}>
      {children}
    </Suspense>
  );
}

/**
 * Suspense boundary for tables
 */
export function TableSuspense({
  children,
  rows = 5,
  cols = 4
}: {
  children: ReactNode;
  rows?: number;
  cols?: number
}) {
  return (
    <Suspense fallback={<TableSkeleton rows={rows} cols={cols} />}>
      {children}
    </Suspense>
  );
}
