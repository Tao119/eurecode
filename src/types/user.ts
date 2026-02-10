import type { UserType, IndividualPlan, OrganizationPlan } from "@/generated/prisma/client";

/**
 * Subscription plan type (union of individual and organization plans)
 * Note: This is for session/runtime use. Database uses separate enums.
 */
export type SubscriptionPlan = IndividualPlan | OrganizationPlan;

/**
 * 開発レベル - AIの用語難しさやクイズ難易度を制御
 */
export type DevelopmentLevel =
  | "beginner"     // 入門: プログラミング初心者、基本概念から学習
  | "elementary"   // 初級: 基本構文は理解、実践経験が少ない
  | "intermediate" // 中級: 実務経験あり、一般的なパターンを理解
  | "advanced"     // 上級: 複雑な設計も可能、ベストプラクティスを理解
  | "expert";      // エキスパート: 高度な最適化、アーキテクチャ設計が可能

/**
 * レベルごとの設定値
 */
export interface DevelopmentLevelConfig {
  level: DevelopmentLevel;
  labelJa: string;
  description: string;
  termComplexity: "simple" | "standard" | "technical";
  quizDifficulty: 1 | 2 | 3 | 4 | 5;
}

/**
 * レベル設定のマスターデータ
 */
export const DEVELOPMENT_LEVELS: Record<DevelopmentLevel, DevelopmentLevelConfig> = {
  beginner: {
    level: "beginner",
    labelJa: "入門",
    description: "プログラミングを始めたばかり。変数やループなど基本概念から学習中",
    termComplexity: "simple",
    quizDifficulty: 1,
  },
  elementary: {
    level: "elementary",
    labelJa: "初級",
    description: "基本的な構文は理解している。実践経験を積みたい段階",
    termComplexity: "simple",
    quizDifficulty: 2,
  },
  intermediate: {
    level: "intermediate",
    labelJa: "中級",
    description: "実務経験あり。一般的なパターンやライブラリを使いこなせる",
    termComplexity: "standard",
    quizDifficulty: 3,
  },
  advanced: {
    level: "advanced",
    labelJa: "上級",
    description: "複雑なシステム設計が可能。ベストプラクティスを実践できる",
    termComplexity: "technical",
    quizDifficulty: 4,
  },
  expert: {
    level: "expert",
    labelJa: "エキスパート",
    description: "高度な最適化、アーキテクチャ設計、技術的リーダーシップが可能",
    termComplexity: "technical",
    quizDifficulty: 5,
  },
};

export interface UserSettings {
  quizEnabled: boolean;
  explanationDetail: "simple" | "standard" | "detailed";
  unlockMethod: "quiz" | "explanation" | "skip";
  hintSpeed: "immediate" | "30sec" | "none";
  estimationTraining: boolean;
  unlockSkipAllowed: boolean; // Allow skipping unlock in generation mode (individual users only)
  developmentLevel: DevelopmentLevel; // 開発レベル - AIの用語難しさやクイズ難易度を制御
}

export interface OrganizationSettings {
  allowedModes: ("explanation" | "generation" | "brainstorm")[];
  allowedTechStacks: string[];
  unlockSkipAllowed: boolean;
  reflectionRequired: boolean;
  defaultDailyTokenLimit: number;
}

export interface AccessKeySettings {
  allowedModes: ("explanation" | "generation" | "brainstorm")[];
  allowedTechStacks: string[];
  unlockSkipAllowed: boolean;
}

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string;
  userType: UserType;
  organizationId: string | null;
  plan: SubscriptionPlan;
  dailyTokenLimit: number;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  quizEnabled: true,
  explanationDetail: "standard",
  unlockMethod: "quiz",
  hintSpeed: "30sec",
  estimationTraining: true,
  unlockSkipAllowed: false,
  developmentLevel: "intermediate", // デフォルトは中級
};

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  allowedModes: ["explanation", "generation", "brainstorm"],
  allowedTechStacks: [],
  unlockSkipAllowed: false,
  reflectionRequired: false,
  defaultDailyTokenLimit: 1000,
};
