"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";

const adminNavItems = [
  {
    href: "/admin",
    label: "ダッシュボード",
    icon: "dashboard",
  },
  {
    href: "/admin/keys",
    label: "アクセスキー",
    icon: "key",
  },
  {
    href: "/admin/members",
    label: "メンバー",
    icon: "group",
  },
  {
    href: "/admin/requests",
    label: "リクエスト",
    icon: "inbox",
  },
  {
    href: "/admin/settings",
    label: "設定",
    icon: "settings",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin");
    } else if (status === "authenticated" && session?.user.userType !== "admin") {
      router.push("/home");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    async function fetchPendingCount() {
      try {
        const response = await fetch("/api/billing/credits/allocation/request");
        const data = await response.json();
        if (data.requests) {
          const count = data.requests.filter(
            (r: { status: string }) => r.status === "pending"
          ).length;
          setPendingRequestCount(count);
        }
      } catch {
        // Silently ignore
      }
    }
    fetchPendingCount();
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user.userType !== "admin") {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      {/* Sidebar - Desktop only */}
      <aside className="w-64 border-r border-border bg-card/50 hidden md:block shrink-0">
        <nav className="p-4 space-y-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            const showBadge =
              item.href === "/admin/requests" && pendingRequestCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span className="material-symbols-outlined text-xl">
                  {item.icon}
                </span>
                {item.label}
                {showBadge && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {pendingRequestCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav - Mobile only */}
      <div className="md:hidden border-b border-border bg-card/50 shrink-0">
        <nav className="flex overflow-x-auto p-2 gap-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            const showBadge =
              item.href === "/admin/requests" && pendingRequestCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span className="material-symbols-outlined text-lg">
                  {item.icon}
                </span>
                {item.label}
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[1rem] text-center leading-none">
                    {pendingRequestCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
    </div>
  );
}
