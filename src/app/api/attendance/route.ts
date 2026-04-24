import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const checkInSchema = z.object({
  memberId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { memberId } = parsed.data;

    // Check if member exists
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if already checked in today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.attendance.findFirst({
      where: {
        memberId,
        checkedInAt: { gte: todayStart, lte: todayEnd },
        checkedOutAt: null,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already checked in today" }, { status: 409 });
    }

    const attendance = await prisma.attendance.create({
      data: { memberId },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    console.error("POST /api/attendance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
