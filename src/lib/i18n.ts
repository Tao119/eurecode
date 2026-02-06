/**
 * Simple i18n foundation for multi-language support
 * Can be upgraded to next-intl or react-i18next for full features
 */

export type Locale = "ja" | "en";

const DEFAULT_LOCALE: Locale = "ja";

// Type-safe translation keys
type TranslationKey = keyof typeof translations.ja;

const translations = {
  ja: {
    // Common
    "common.loading": "読み込み中...",
    "common.error": "エラーが発生しました",
    "common.retry": "再試行",
    "common.cancel": "キャンセル",
    "common.save": "保存",
    "common.delete": "削除",
    "common.edit": "編集",
    "common.close": "閉じる",
    "common.confirm": "確認",
    "common.search": "検索",
    "common.back": "戻る",
    "common.next": "次へ",
    "common.previous": "前へ",
    "common.submit": "送信",
    "common.copy": "コピー",
    "common.copied": "コピーしました",

    // Navigation
    "nav.home": "ホーム",
    "nav.chat": "チャット",
    "nav.history": "履歴",
    "nav.projects": "プロジェクト",
    "nav.learnings": "学び",
    "nav.settings": "設定",
    "nav.admin": "管理",
    "nav.logout": "ログアウト",

    // Chat
    "chat.placeholder": "メッセージを入力...",
    "chat.send": "送信",
    "chat.thinking": "考え中...",
    "chat.newChat": "新しいチャット",
    "chat.exportMarkdown": "Markdownでエクスポート",
    "chat.saveLearning": "学びとして保存",

    // Auth
    "auth.login": "ログイン",
    "auth.register": "新規登録",
    "auth.email": "メールアドレス",
    "auth.password": "パスワード",
    "auth.forgotPassword": "パスワードを忘れた方",

    // Errors
    "error.notFound": "ページが見つかりません",
    "error.unauthorized": "認証が必要です",
    "error.rateLimit": "リクエスト制限を超えました",
    "error.serverError": "サーバーエラーが発生しました",
    "error.networkError": "ネットワークエラーが発生しました",

    // Success messages
    "success.saved": "保存しました",
    "success.deleted": "削除しました",
    "success.copied": "コピーしました",
    "success.sent": "送信しました",

    // Billing
    "billing.credits": "クレジット",
    "billing.remaining": "残り",
    "billing.upgrade": "プランをアップグレード",
    "billing.outOfCredits": "クレジットがありません",
  },
  en: {
    // Common
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.retry": "Retry",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.close": "Close",
    "common.confirm": "Confirm",
    "common.search": "Search",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.submit": "Submit",
    "common.copy": "Copy",
    "common.copied": "Copied",

    // Navigation
    "nav.home": "Home",
    "nav.chat": "Chat",
    "nav.history": "History",
    "nav.projects": "Projects",
    "nav.learnings": "Learnings",
    "nav.settings": "Settings",
    "nav.admin": "Admin",
    "nav.logout": "Logout",

    // Chat
    "chat.placeholder": "Type a message...",
    "chat.send": "Send",
    "chat.thinking": "Thinking...",
    "chat.newChat": "New Chat",
    "chat.exportMarkdown": "Export as Markdown",
    "chat.saveLearning": "Save as Learning",

    // Auth
    "auth.login": "Login",
    "auth.register": "Sign Up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.forgotPassword": "Forgot Password?",

    // Errors
    "error.notFound": "Page not found",
    "error.unauthorized": "Authentication required",
    "error.rateLimit": "Rate limit exceeded",
    "error.serverError": "Server error occurred",
    "error.networkError": "Network error occurred",

    // Success messages
    "success.saved": "Saved",
    "success.deleted": "Deleted",
    "success.copied": "Copied",
    "success.sent": "Sent",

    // Billing
    "billing.credits": "Credits",
    "billing.remaining": "Remaining",
    "billing.upgrade": "Upgrade Plan",
    "billing.outOfCredits": "Out of credits",
  },
} as const;

let currentLocale: Locale = DEFAULT_LOCALE;

/**
 * Get the current locale
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Set the current locale
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
  }
}

/**
 * Initialize locale from browser/storage
 */
export function initLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored = localStorage.getItem("locale") as Locale | null;
  if (stored && (stored === "ja" || stored === "en")) {
    currentLocale = stored;
    return stored;
  }

  // Detect from browser
  const browserLang = navigator.language.split("-")[0];
  const detected = browserLang === "ja" ? "ja" : "en";
  setLocale(detected);
  return detected;
}

/**
 * Translate a key to the current locale
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const translation = translations[currentLocale][key] ?? translations.ja[key] ?? key;

  if (!params) return translation;

  // Simple parameter replacement: {{param}}
  return Object.entries(params).reduce<string>(
    (text, [param, value]) => text.replace(new RegExp(`\\{\\{${param}\\}\\}`, "g"), String(value)),
    translation
  );
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): { code: Locale; name: string }[] {
  return [
    { code: "ja", name: "日本語" },
    { code: "en", name: "English" },
  ];
}

// Export translations type for type safety
export type { TranslationKey };
