import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const attendance = await prisma.attendance.update({
      where: { id },
      data: { checkedOutAt: new Date() },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(attendance);
  } catch (error) {
    console.error("PATCH /api/attendance/[id]/checkout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
