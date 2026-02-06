"use client";

import { useEffect, useCallback, useRef } from "react";

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
  /** Key combination (e.g., "ctrl+k", "cmd+shift+p") */
  key: string;
  /** Handler function */
  handler: KeyHandler;
  /** Only trigger when no input is focused */
  ignoreInputs?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Description for help display */
  description?: string;
}

interface ParsedShortcut {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.toLowerCase().split("+");
  const key = parts[parts.length - 1];

  return {
    key,
    ctrl: parts.includes("ctrl") || parts.includes("control"),
    alt: parts.includes("alt") || parts.includes("option"),
    shift: parts.includes("shift"),
    meta: parts.includes("cmd") || parts.includes("meta") || parts.includes("command"),
  };
}

function matchesShortcut(event: KeyboardEvent, parsed: ParsedShortcut): boolean {
  const eventKey = event.key.toLowerCase();
  const keyMatch =
    eventKey === parsed.key ||
    event.code.toLowerCase() === `key${parsed.key}` ||
    event.code.toLowerCase() === parsed.key;

  return (
    keyMatch &&
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift &&
    event.metaKey === parsed.meta
  );
}

function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    (element as HTMLElement).isContentEditable
  );
}

/**
 * Hook for registering keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: "ctrl+k", handler: () => openSearch(), description: "Open search" },
 *   { key: "escape", handler: () => closeModal(), ignoreInputs: false },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcutsRef.current) {
      const parsed = parseShortcut(shortcut.key);

      if (matchesShortcut(event, parsed)) {
        // Check if we should ignore when input is focused
        if (shortcut.ignoreInputs !== false && isInputElement(document.activeElement)) {
          continue;
        }

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }

        shortcut.handler(event);
        break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for a single keyboard shortcut
 */
export function useKeyboardShortcut(
  key: string,
  handler: KeyHandler,
  options: Omit<ShortcutConfig, "key" | "handler"> = {}
): void {
  useKeyboardShortcuts([{ key, handler, ...options }]);
}

/**
 * Get the display string for a shortcut (platform-aware)
 */
export function getShortcutDisplay(shortcut: string): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

  return shortcut
    .split("+")
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "ctrl" || lower === "control") return isMac ? "⌃" : "Ctrl";
      if (lower === "alt" || lower === "option") return isMac ? "⌥" : "Alt";
      if (lower === "shift") return isMac ? "⇧" : "Shift";
      if (lower === "cmd" || lower === "meta" || lower === "command") return isMac ? "⌘" : "Win";
      if (lower === "enter") return "↵";
      if (lower === "escape") return "Esc";
      if (lower === "backspace") return "⌫";
      if (lower === "delete") return "Del";
      if (lower === "arrowup") return "↑";
      if (lower === "arrowdown") return "↓";
      if (lower === "arrowleft") return "←";
      if (lower === "arrowright") return "→";
      return part.toUpperCase();
    })
    .join(isMac ? "" : "+");
}

// Common shortcuts registry for help display
export const commonShortcuts = {
  search: { key: "ctrl+k", description: "検索を開く" },
  newChat: { key: "ctrl+n", description: "新しいチャットを開始" },
  closeModal: { key: "escape", description: "モーダルを閉じる" },
  submit: { key: "ctrl+enter", description: "送信" },
  help: { key: "ctrl+/", description: "ショートカット一覧" },
} as const;
