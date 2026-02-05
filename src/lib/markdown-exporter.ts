import type { Message, BrainstormModeState, BrainstormPhase } from "@/types/chat";
import { PHASE_INFO } from "@/hooks/useBrainstormMode";

interface ExportOptions {
  title?: string;
  includeTimestamps?: boolean;
}

/**
 * ブレインストーミング会話をMarkdown形式でエクスポート
 */
export function exportBrainstormToMarkdown(
  messages: Message[],
  brainstormState: BrainstormModeState,
  options: ExportOptions = {}
): string {
  const {
    title = "ブレインストーミング記録",
    includeTimestamps = true,
  } = options;

  const sections: string[] = [];

  // ヘッダー
  sections.push(`# ${title}\n`);
  sections.push(
    `生成日時: ${new Date().toLocaleString("ja-JP")}  `
  );
  sections.push(
    `モード: ${brainstormState.subMode === "planning" ? "企画書モード" : "壁打ちモード"}\n`
  );

  if (brainstormState.isCompleted && brainstormState.completedAt) {
    sections.push(
      `> 完了済み (${new Date(brainstormState.completedAt).toLocaleString("ja-JP")})\n`
    );
  }

  sections.push("---\n");

  // モード別に生成
  if (brainstormState.subMode === "planning") {
    sections.push(generatePlanningSummary(brainstormState));
    sections.push("\n---\n");
    sections.push(generatePhaseTranscript(messages));
  } else {
    sections.push(generateCasualTranscript(messages, includeTimestamps));
  }

  return sections.join("\n");
}

/**
 * 企画書モード: 構造化サマリー
 */
function generatePlanningSummary(state: BrainstormModeState): string {
  const parts: string[] = [];
  parts.push("## 企画サマリー\n");

  if (state.ideaSummary) {
    parts.push("### アイデア");
    parts.push(`\n${state.ideaSummary}\n`);
  }

  if (state.persona) {
    parts.push("### ターゲットユーザー");
    parts.push(`\n${state.persona}\n`);
  }

  if (state.competitors.length > 0) {
    parts.push("### 競合・市場\n");
    for (const comp of state.competitors) {
      parts.push(`- ${comp}`);
    }
    parts.push("");
  }

  if (state.techStack.length > 0) {
    parts.push("### 技術スタック\n");
    for (const tech of state.techStack) {
      parts.push(`- ${tech}`);
    }
    parts.push("");
  }

  if (state.mvpFeatures.length > 0) {
    parts.push("### MVP機能\n");
    for (const feature of state.mvpFeatures) {
      parts.push(`- ${feature}`);
    }
    parts.push("");
  }

  if (state.planSteps.length > 0) {
    parts.push("### 実装タスク\n");
    for (const [index, step] of state.planSteps.entries()) {
      const status = step.completed ? "[x]" : "[ ]";
      const time = step.estimatedTime ? ` (${step.estimatedTime})` : "";
      parts.push(`- ${status} **${index + 1}. ${step.title}**${time}`);
      if (step.description) {
        parts.push(`  ${step.description}`);
      }
    }
    parts.push("");
  }

  if (state.insights.length > 0) {
    parts.push("### 気づき・メモ\n");
    for (const insight of state.insights) {
      parts.push(`- ${insight}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * 企画書モード: フェーズ別会話記録
 */
function generatePhaseTranscript(messages: Message[]): string {
  const parts: string[] = [];
  parts.push("## フェーズ別会話記録\n");

  const phaseGroups = groupMessagesByPhase(messages);

  for (const [phase, msgs] of Object.entries(phaseGroups)) {
    if (msgs.length === 0) continue;
    const phaseInfo = PHASE_INFO[phase as BrainstormPhase];
    if (!phaseInfo) continue;

    parts.push(`### ${phaseInfo.title}\n`);

    for (const msg of msgs) {
      const role = msg.role === "user" ? "**You**" : "**AI**";
      const timestamp = formatTimestamp(msg.timestamp);
      parts.push(`${role} (${timestamp})\n`);
      parts.push(`${msg.content}\n`);
    }
  }

  return parts.join("\n");
}

/**
 * カジュアルモード: 時系列トランスクリプト
 */
function generateCasualTranscript(
  messages: Message[],
  includeTimestamps: boolean
): string {
  const parts: string[] = [];
  parts.push("## 会話記録\n");

  for (const msg of messages) {
    const role = msg.role === "user" ? "**You**" : "**AI**";
    const timestamp = includeTimestamps ? ` (${formatTimestamp(msg.timestamp)})` : "";
    parts.push(`${role}${timestamp}\n`);
    parts.push(`${msg.content}\n`);
    parts.push("---\n");
  }

  return parts.join("\n");
}

/**
 * メッセージをフェーズごとにグループ化
 */
function groupMessagesByPhase(messages: Message[]): Record<string, Message[]> {
  const groups: Record<string, Message[]> = {};
  let currentPhase: BrainstormPhase = "verbalization";

  for (const msg of messages) {
    if (msg.metadata?.brainstormPhase) {
      currentPhase = msg.metadata.brainstormPhase;
    }

    if (!groups[currentPhase]) {
      groups[currentPhase] = [];
    }
    groups[currentPhase].push(msg);
  }

  return groups;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Markdownファイルをブラウザでダウンロード
 */
export function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
