"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PricingCard } from "./PricingCard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAllIndividualPlans,
  getAllOrganizationPlans,
  IndividualPlan,
  OrganizationPlan,
} from "@/config/plans";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface PricingTableProps {
  currentPlan?: IndividualPlan | OrganizationPlan;
  isOrganization?: boolean;
  showOrganizationPlans?: boolean;
}

export function PricingTable({
  currentPlan = "free",
  isOrganization = false,
  showOrganizationPlans = false,
}: PricingTableProps) {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"individual" | "organization">(
    showOrganizationPlans ? "organization" : "individual"
  );
  const [showConversionWarning, setShowConversionWarning] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const individualPlans = getAllIndividualPlans();
  const organizationPlans = getAllOrganizationPlans();

  // 組織プランの管理者が個人プランを選択しようとしているかどうか
  const isConvertingToIndividual = isOrganization && activeTab === "individual";

  const handleSelectPlan = async (planId: string) => {
    if (planId === "free") return;

    if (planId === "enterprise") {
      // Enterpriseはお問い合わせフォームへ
      router.push("/contact?plan=enterprise");
      return;
    }

    // 組織プランの管理者が個人プランを選択した場合、確認ダイアログを表示
    if (isConvertingToIndividual) {
      setPendingPlanId(planId);
      setShowConversionWarning(true);
      return;
    }

    await proceedWithPlanChange(planId);
  };

  const proceedWithPlanChange = async (planId: string) => {
    setIsLoading(planId);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          billingPeriod,
          isOrganization: activeTab === "organization",
        }),
      });

      const data = await response.json();

      if (data.url) {
        // 新規サブスクリプション → Stripeチェックアウトへリダイレクト
        window.location.href = data.url;
      } else if (data.success) {
        // 既存サブスクリプションのプラン変更成功
        router.push("/settings/billing?success=true");
        router.refresh();
      } else {
        console.error("Checkout failed:", data.error);
        alert(data.errorJa || "決済ページの作成に失敗しました");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("エラーが発生しました");
    } finally {
      setIsLoading(null);
    }
  };

  const handleConfirmConversion = async () => {
    setShowConversionWarning(false);
    if (pendingPlanId) {
      await proceedWithPlanChange(pendingPlanId);
      setPendingPlanId(null);
    }
  };

  const handleCancelConversion = () => {
    setShowConversionWarning(false);
    setPendingPlanId(null);
  };

  return (
    <div className="space-y-8">
      {/* タブ切り替え */}
      {showOrganizationPlans && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border p-1">
            <Button
              variant={activeTab === "individual" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("individual")}
            >
              個人プラン
            </Button>
            <Button
              variant={activeTab === "organization" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("organization")}
            >
              組織プラン
            </Button>
          </div>
        </div>
      )}

      {/* 組織→個人プラン変更時の警告 */}
      {isConvertingToIndividual && (
        <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-red-800 dark:text-red-200">個人プランへの変更に関する重要な警告</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>組織に所属するすべてのメンバーのアカウントが削除されます</strong></li>
              <li>メンバーの会話履歴・学習データ・プロジェクトがすべて失われます</li>
              <li>発行済みのアクセスキーはすべて無効になります</li>
              <li>この操作は取り消すことができません</li>
            </ul>
            <p className="mt-3 font-medium">
              組織を維持したまま利用を続ける場合は、「組織プラン」タブからプランを選択してください。
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* 支払い期間切り替え */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border p-1">
          <Button
            variant={billingPeriod === "monthly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setBillingPeriod("monthly")}
          >
            月払い
          </Button>
          <Button
            variant={billingPeriod === "yearly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setBillingPeriod("yearly")}
            className="relative"
          >
            年払い
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              お得
            </span>
          </Button>
        </div>
      </div>

      {/* プランカード */}
      <div
        className={cn(
          "grid gap-6",
          activeTab === "individual"
            ? "md:grid-cols-2 lg:grid-cols-4"
            : "md:grid-cols-2 lg:grid-cols-4"
        )}
      >
        {activeTab === "individual"
          ? individualPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={!isOrganization && currentPlan === plan.id}
                isPopular={plan.id === "pro"}
                billingPeriod={billingPeriod}
                onSelect={handleSelectPlan}
                isLoading={isLoading === plan.id}
              />
            ))
          : organizationPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isOrganization
                isCurrentPlan={isOrganization && currentPlan === plan.id}
                isPopular={plan.id === "business"}
                billingPeriod={billingPeriod}
                onSelect={handleSelectPlan}
                isLoading={isLoading === plan.id}
              />
            ))}
      </div>

      {/* 注意書き */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          すべてのプランで全モード（解説・生成・壁打ち）が利用可能です。
          <br />
          いつでもプランの変更・キャンセルが可能です。
        </p>
      </div>

      {/* 組織→個人プラン変更確認ダイアログ */}
      <Dialog open={showConversionWarning} onOpenChange={setShowConversionWarning}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              本当に個人プランに変更しますか？
            </DialogTitle>
            <DialogDescription className="text-left pt-4">
              <div className="space-y-4">
                <p className="font-semibold text-foreground">
                  この操作を実行すると、以下の変更が行われます：
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li className="text-red-600 font-medium">
                    組織に所属するすべてのメンバーのアカウントが完全に削除されます
                  </li>
                  <li>メンバーの会話履歴、学習データ、プロジェクトがすべて失われます</li>
                  <li>発行済みのアクセスキーはすべて無効になります</li>
                  <li>組織情報は削除され、復元できません</li>
                </ul>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>注意:</strong> この操作は取り消すことができません。
                    組織を維持したい場合は「キャンセル」を押して、組織プランを選択してください。
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCancelConversion}
              className="sm:flex-1"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmConversion}
              className="sm:flex-1"
            >
              メンバーを削除して個人プランに変更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
