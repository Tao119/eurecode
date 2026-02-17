import { NextRequest, NextResponse } from "next/server";
import { auth, isOrganizationOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/admin/members/:id/role - Update member's role (owner only)
const updateRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
        { status: 401 }
      );
    }

    // Only owners can change roles
    if (!isOrganizationOwner(session.user.userType)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "ロール変更は組織オーナーのみ可能です" } },
        { status: 403 }
      );
    }

    if (!session.user.organizationId) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "組織が見つかりません" } },
        { status: 404 }
      );
    }

    const { id: memberId } = await context.params;
    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "入力が無効です", details: parsed.error.issues } },
        { status: 400 }
      );
    }

    const { role } = parsed.data;

    // Cannot change own role
    if (memberId === session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "自分自身のロールは変更できません" } },
        { status: 403 }
      );
    }

    // Verify member belongs to organization and is not owner
    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: session.user.organizationId,
        userType: { in: ["member", "admin"] }, // Cannot change owner's role
      },
      select: { id: true, displayName: true, userType: true },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "メンバーが見つかりません" } },
        { status: 404 }
      );
    }

    // Update member's role
    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { userType: role },
      select: { id: true, displayName: true, userType: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        displayName: updated.displayName,
        role: updated.userType,
        message: role === "admin"
          ? `${updated.displayName}を管理者に昇格しました`
          : `${updated.displayName}を一般メンバーに変更しました`,
      },
    });
  } catch (error) {
    console.error("Update member role error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}

// GET /api/admin/members/:id/role - Get member's role info
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
        { status: 401 }
      );
    }

    // Only owners can view role management
    if (!isOrganizationOwner(session.user.userType)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "ロール情報の閲覧は組織オーナーのみ可能です" } },
        { status: 403 }
      );
    }

    if (!session.user.organizationId) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "組織が見つかりません" } },
        { status: 404 }
      );
    }

    const { id: memberId } = await context.params;

    // Get member info
    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: session.user.organizationId,
      },
      select: { id: true, displayName: true, email: true, userType: true },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "メンバーが見つかりません" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: member.id,
        displayName: member.displayName,
        email: member.email,
        role: member.userType,
        isOwner: member.userType === "owner",
        canChangeRole: member.userType !== "owner" && member.id !== session.user.id,
      },
    });
  } catch (error) {
    console.error("Get member role error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
