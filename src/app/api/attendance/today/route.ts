import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET() {
  try {
    await requireAuth();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        checkedInAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { checkedInAt: "desc" },
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error("GET /api/attendance/today:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
