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

    // クレジット残高取得（割り当て確認後に決定）
    // - 組織メンバー/管理者で割り当てがある場合: creditBalanceは参照しない
    // - 管理者で割り当てがない場合(adminUsesOrgPool): 組織のcreditBalanceを使用
    // - 個人ユーザー: 個人のcreditBalanceを使用
    // 注: creditBalanceの取得は後で行う（割り当て確認後）
    let creditBalance: typeof user.creditBalance | null = null;

    // 今月の使用量を計算
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 組織ユーザー（メンバーまたは管理者）の場合は割り当てを確認
    // - 割り当てがある場合: 割り当てを使用
    // - メンバーで割り当てがない場合: アクセスキーから自動作成、なければ0
    // - 管理者で割り当てがない場合: 組織のcreditBalanceを使用（allocatedPointsはundefined）
    let allocatedPoints: number | undefined;
    let allocatedUsed = 0;
    let adminUsesOrgPool = false;  // 管理者が組織プールを使用するかどうか

    if ((usesAllocationSystem || isOrganizationAdmin) && user.organizationId) {
      // まず割り当てを確認（メンバーも管理者も）
      const allocation = await prisma.creditAllocation.findFirst({
        where: {
          organizationId: user.organizationId,
          userId: userId,
          periodStart: { lte: now },
          periodEnd: { gte: now },
        },
      });

      if (allocation) {
        // 割り当てがある場合は使用
        allocatedPoints = allocation.allocatedPoints;
        allocatedUsed = allocation.usedPoints;
      } else if (usesAllocationSystem) {
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
      } else {
        // 管理者で割り当てがない場合: 組織のcreditBalanceを使用
        adminUsesOrgPool = true;
      }
    }

    // 割り当て確認後にcreditBalanceを決定
    if (adminUsesOrgPool && user.organization?.creditBalance) {
      // 管理者で割り当てがない場合: 組織のcreditBalanceを使用
      creditBalance = user.organization.creditBalance;
    } else if (!usesAllocationSystem && !isOrganizationAdmin) {
      // 個人ユーザー: 個人のcreditBalanceを使用
      creditBalance = user.creditBalance || null;
    }
    // メンバーまたは割り当てがある管理者: creditBalanceはnullのまま（割り当てを使用）

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
