import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/api-auth";

// PUT /api/users/[id] - Update a user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { email, name, password } = body;

    // Check if email is already used by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "このメールアドレスは既に使用されています" },
          { status: 400 }
        );
      }
    }

    const updateData: { email?: string; name?: string; password?: string } = {};
    if (email) updateData.email = email;
    if (name !== undefined) updateData.name = name || null;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "ユーザーの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;

    // Don't allow deleting the last user
    const userCount = await prisma.user.count();
    if (userCount <= 1) {
      return NextResponse.json(
        { error: "最後のユーザーは削除できません" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "ユーザーを削除しました" });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "ユーザーの削除に失敗しました" },
      { status: 500 }
    );
  }
}
