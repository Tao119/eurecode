/**
 * Credit Balance API
 *
 * 現在のクレジット残高と使用状況を取得
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  INDIVIDUAL_PLANS,
  ORGANIZATION_PLANS,
  IndividualPlan,
  OrganizationPlan,
  MODEL_CONSUMPTION_RATE,
  isLowBalance,
  getOutOfCreditsActions,
} from "@/config/plans";
import {
  checkCanStartConversation,
  PlanContext,
} from "@/lib/plan-restrictions";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userType = session.user.userType;
    const isOrganizationMember = userType === "member";
    const isOrganizationAdmin = userType === "admin";
    // メンバーのみ割り当て制を使用（管理者は組織のcreditBalanceを直接使用）
    const usesAllocationSystem = userType === "member";

    // ユーザー情報とサブスクリプション取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        creditBalance: true,
        organization: {
          include: {
            subscription: true,
            creditBalance: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // プラン情報を取得
    let plan: IndividualPlan | OrganizationPlan = "free";
    let isOrganization = false;
    let monthlyPoints = 0;

    if ((usesAllocationSystem || isOrganizationAdmin) && user.organizationId && user.organization) {
      // 組織メンバーまたは管理者
      isOrganization = true;
      plan = user.organization.plan;
      monthlyPoints =
        ORGANIZATION_PLANS[plan as OrganizationPlan].features
          .monthlyConversationPoints;
    } else if (user.subscription?.individualPlan) {
      // 個人ユーザー
      plan = user.subscription.individualPlan;
      monthlyPoints =
        INDIVIDUAL_PLANS[plan as IndividualPlan].features
          .monthlyConversationPoints;
    } else {
      // Freeプラン
      plan = "free";
      monthlyPoints = INDIVIDUAL_PLANS.free.features.monthlyConversationPoints;
    }

    // クレジット残高取得
    // - 組織メンバー: 割り当て制を使用（creditBalanceは参照しない）
    // - 組織管理者: 組織のcreditBalanceを直接使用
    // - 個人ユーザー: 個人のcreditBalanceを使用
    const creditBalance = usesAllocationSystem
      ? null  // メンバーは割り当て制のためcreditBalanceは不要
      : isOrganizationAdmin && user.organization?.creditBalance
        ? user.organization.creditBalance  // 管理者は組織のcreditBalanceを使用
        : user.creditBalance || null;  // 個人ユーザー

    // 今月の使用量を計算
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 組織メンバーの場合のみ割り当てを取得（管理者は組織のcreditBalanceを直接使用）
    // 割り当てがない場合はデフォルト0（組織のプールではなく個別割り当て制）
    let allocatedPoints: number | undefined;
    let allocatedUsed = 0;

    if (usesAllocationSystem && user.organizationId) {
      const allocation = await prisma.creditAllocation.findFirst({
        where: {
          organizationId: user.organizationId,
          userId: userId,
          periodStart: { lte: now },
          periodEnd: { gte: now },
        },
      });

      if (allocation) {
        allocatedPoints = allocation.allocatedPoints;
        allocatedUsed = allocation.usedPoints;
      } else {
        // メンバーの場合：割り当てがなければアクセスキーのdailyTokenLimitから自動作成
        const accessKey = await prisma.accessKey.findFirst({
          where: { userId: userId },
        });

        if (accessKey?.dailyTokenLimit) {
          const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

          const newAllocation = await prisma.creditAllocation.create({
            data: {
              organizationId: user.organizationId!,
              userId: userId,
              allocatedPoints: accessKey.dailyTokenLimit,
              usedPoints: 0,
              periodStart,
              periodEnd,
              note: `アクセスキー ${accessKey.keyCode} による自動割り当て`,
            },
          });

          allocatedPoints = newAllocation.allocatedPoints;
          allocatedUsed = 0;
        } else {
          allocatedPoints = 0;
        }
      }
    }
    // 管理者の場合は allocatedPoints を undefined のままにする（creditBalanceを使用）

    // 残りポイント計算
    const planPointsRemaining = creditBalance
      ? Math.max(0, monthlyPoints - creditBalance.monthlyUsed)
      : monthlyPoints;

    const purchasedPointsRemaining = creditBalance
      ? Math.max(0, creditBalance.balance - creditBalance.purchasedUsed)
      : 0;

    const allocatedPointsRemaining =
      allocatedPoints !== undefined
        ? Math.max(0, allocatedPoints - allocatedUsed)
        : undefined;

    // プランコンテキスト作成
    const context: PlanContext = {
      plan,
      isOrganization,
      planPointsRemaining,
      purchasedPointsRemaining,
      allocatedPointsRemaining,
      // メンバーは購入不可（管理者は組織として購入可能）
      canPurchaseCredits: !usesAllocationSystem,
    };

    // 会話可能性チェック
    const conversationCheck = checkCanStartConversation(context);

    // 各モデルでの残り回数計算
    const modelRemainingConversations = {
      sonnet: Math.floor(
        (allocatedPointsRemaining ?? planPointsRemaining + purchasedPointsRemaining) /
          MODEL_CONSUMPTION_RATE.sonnet
      ),
      opus: Math.floor(
        (allocatedPointsRemaining ?? planPointsRemaining + purchasedPointsRemaining) /
          MODEL_CONSUMPTION_RATE.opus
      ),
    };

    return NextResponse.json({
      plan,
      isOrganization,
      isOrganizationMember,

      // ポイント情報
      points: {
        // プラン付与分
        monthly: {
          total: monthlyPoints,
          used: creditBalance?.monthlyUsed ?? 0,
          remaining: planPointsRemaining,
        },
        // 購入分
        purchased: {
          balance: creditBalance?.balance ?? 0,
          used: creditBalance?.purchasedUsed ?? 0,
          remaining: purchasedPointsRemaining,
        },
        // 組織メンバーの場合の割り当て分
        allocated: allocatedPoints !== undefined
          ? {
              total: allocatedPoints,
              used: allocatedUsed,
              remaining: allocatedPointsRemaining,
            }
          : null,
        // 総残高
        totalRemaining: conversationCheck.totalPointsRemaining,
      },

      // 残り会話回数（モデル別）
      remainingConversations: modelRemainingConversations,

      // 利用可能なモデル
      availableModels: conversationCheck.availableModels,

      // 会話可能か
      canStartConversation: conversationCheck.allowed,

      // 警告・アクション
      lowBalanceWarning: conversationCheck.lowBalanceWarning,
      outOfCreditsActions: conversationCheck.outOfCreditsActions,

      // 期間情報
      period: {
        start: creditBalance?.periodStart ?? monthStart,
        end: creditBalance?.periodEnd ?? monthEnd,
      },
    });
  } catch (error) {
    console.error("Credit balance error:", error);
    return NextResponse.json(
      { error: "Failed to get credit balance" },
      { status: 500 }
    );
  }
}
