"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Requester {
  id: string;
  displayName: string;
  email: string | null;
}

interface AllocationRequest {
  id: string;
  organizationId: string;
  requesterId: string;
  requestedPoints: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  allocationId: string | null;
  createdAt: string;
  requester: Requester | null;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_CONFIG = {
  pending: {
    label: "保留中",
    color: "bg-yellow-500/20 text-yellow-500",
    icon: "schedule",
  },
  approved: {
    label: "承認済み",
    color: "bg-green-500/20 text-green-500",
    icon: "check_circle",
  },
  rejected: {
    label: "拒否済み",
    color: "bg-red-500/20 text-red-500",
    icon: "cancel",
  },
} as const;

export default function RequestsPage() {
  const [requests, setRequests] = useState<AllocationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Approve dialog state
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveTarget, setApproveTarget] = useState<AllocationRequest | null>(
    null
  );
  const [adjustedPoints, setAdjustedPoints] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // Reject dialog state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AllocationRequest | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/credits/allocation/request");
      const data = await response.json();
      if (data.requests) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      toast.error("リクエストの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const openApproveDialog = (request: AllocationRequest) => {
    setApproveTarget(request);
    setAdjustedPoints(request.requestedPoints.toString());
    setShowApproveDialog(true);
  };

  const openRejectDialog = (request: AllocationRequest) => {
    setRejectTarget(request);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const handleApprove = async () => {
    if (!approveTarget) return;

    const points = parseFloat(adjustedPoints);
    if (isNaN(points) || points <= 0) {
      toast.error("有効なポイント数を入力してください");
      return;
    }

    setIsApproving(true);
    try {
      const response = await fetch("/api/billing/credits/allocation/request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: approveTarget.id,
          action: "approve",
          adjustedPoints: points,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(
          `${points} pt を承認しました（リクエスト: ${approveTarget.requestedPoints} pt）`
        );
        setShowApproveDialog(false);
        setApproveTarget(null);
        fetchRequests();
      } else {
        toast.error(data.error || "承認に失敗しました");
      }
    } catch (error) {
      console.error("Failed to approve request:", error);
      toast.error("承認に失敗しました");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;

    setIsRejecting(true);
    try {
      const response = await fetch("/api/billing/credits/allocation/request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rejectTarget.id,
          action: "reject",
          rejectionReason: rejectionReason.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("リクエストを拒否しました");
        setShowRejectDialog(false);
        setRejectTarget(null);
        fetchRequests();
      } else {
        toast.error(data.error || "拒否に失敗しました");
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      toast.error("拒否に失敗しました");
    } finally {
      setIsRejecting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(/[\s　]+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-20" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">inbox</span>
          ポイントリクエスト管理
        </h1>
        <p className="text-muted-foreground">
          メンバーからのポイント割り当てリクエストを管理
          {pendingCount > 0 && (
            <span className="ml-2 text-yellow-500 font-medium">
              （{pendingCount}件の保留中リクエスト）
            </span>
          )}
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { key: "all", label: "すべて", count: requests.length },
            { key: "pending", label: "保留中", count: pendingCount },
            {
              key: "approved",
              label: "承認済み",
              count: requests.filter((r) => r.status === "approved").length,
            },
            {
              key: "rejected",
              label: "拒否済み",
              count: requests.filter((r) => r.status === "rejected").length,
            },
          ] as const
        ).map((filter) => (
          <Button
            key={filter.key}
            variant={statusFilter === filter.key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(filter.key)}
          >
            {filter.label}
            {filter.count > 0 && (
              <span
                className={cn(
                  "ml-1.5 px-1.5 py-0.5 rounded-full text-xs",
                  statusFilter === filter.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {filter.count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2">
              inbox
            </span>
            <p className="text-muted-foreground">
              {statusFilter === "all"
                ? "リクエストはまだありません"
                : `${STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label || ""}のリクエストはありません`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const config = STATUS_CONFIG[request.status];
            const requesterName =
              request.requester?.displayName || "不明なユーザー";

            return (
              <Card key={request.id}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                      {getInitials(requesterName)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{requesterName}</p>
                          {request.requester?.email && (
                            <p className="text-xs text-muted-foreground">
                              {request.requester.email}
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                            config.color
                          )}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {config.icon}
                          </span>
                          {config.label}
                        </span>
                      </div>

                      {/* Request details */}
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <span className="material-symbols-outlined text-base">
                            toll
                          </span>
                          {request.requestedPoints} pt
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatDate(request.createdAt)}
                        </span>
                      </div>

                      {/* Reason */}
                      {request.reason && (
                        <p className="mt-1.5 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                          {request.reason}
                        </p>
                      )}

                      {/* Rejection reason */}
                      {request.status === "rejected" &&
                        request.rejectionReason && (
                          <p className="mt-1.5 text-sm text-red-400 bg-red-500/10 rounded-md px-3 py-2">
                            拒否理由: {request.rejectionReason}
                          </p>
                        )}

                      {/* Actions for pending requests */}
                      {request.status === "pending" && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => openApproveDialog(request)}
                          >
                            <span className="material-symbols-outlined text-base mr-1">
                              check
                            </span>
                            承認
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => openRejectDialog(request)}
                          >
                            <span className="material-symbols-outlined text-base mr-1">
                              close
                            </span>
                            拒否
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500">
                check_circle
              </span>
              リクエストを承認
            </DialogTitle>
            <DialogDescription>
              {approveTarget?.requester?.displayName || "メンバー"}
              のポイントリクエストを承認します。金額を調整することもできます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <span className="material-symbols-outlined text-muted-foreground">
                toll
              </span>
              <div>
                <p className="text-sm text-muted-foreground">
                  リクエスト金額
                </p>
                <p className="font-medium">
                  {approveTarget?.requestedPoints} pt
                </p>
              </div>
            </div>

            {approveTarget?.reason && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">理由</p>
                <p className="text-sm">{approveTarget.reason}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                承認するポイント数
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={adjustedPoints}
                  onChange={(e) => setAdjustedPoints(e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">pt</span>
              </div>
              {adjustedPoints &&
                parseFloat(adjustedPoints) !==
                  approveTarget?.requestedPoints && (
                  <p className="text-xs text-yellow-500">
                    リクエスト金額（{approveTarget?.requestedPoints} pt）
                    から調整されています
                  </p>
                )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
            >
              キャンセル
            </Button>
            <Button onClick={handleApprove} disabled={isApproving}>
              {isApproving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base mr-1">
                    progress_activity
                  </span>
                  処理中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base mr-1">
                    check
                  </span>
                  承認する
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">
                cancel
              </span>
              リクエストを拒否
            </DialogTitle>
            <DialogDescription>
              {rejectTarget?.requester?.displayName || "メンバー"}
              のポイントリクエスト（{rejectTarget?.requestedPoints}{" "}
              pt）を拒否します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {rejectTarget?.reason && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">
                  リクエスト理由
                </p>
                <p className="text-sm">{rejectTarget.reason}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                拒否理由（任意）
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full h-24 p-3 rounded-lg border border-border bg-muted/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="拒否の理由を入力..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base mr-1">
                    progress_activity
                  </span>
                  処理中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base mr-1">
                    close
                  </span>
                  拒否する
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
