import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const updateMemberSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  planId: z.string().optional().nullable(),
  planStartDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "EXPIRED", "INACTIVE"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        plan: true,
        payments: {
          orderBy: { paidAt: "desc" },
          take: 50,
        },
        attendances: {
          orderBy: { checkedInAt: "desc" },
          take: 50,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const now = new Date();
    const effectiveStatus =
      member.status === "INACTIVE"
        ? "INACTIVE"
        : member.planEndDate && member.planEndDate < now
        ? "EXPIRED"
        : member.status;

    return NextResponse.json({ ...member, effectiveStatus });
  } catch (error) {
    console.error("GET /api/members/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { planId, planStartDate, dateOfBirth, ...rest } = parsed.data;

    let planEndDate: Date | null | undefined;
    if (planId && planStartDate) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (plan) {
        const start = new Date(planStartDate);
        planEndDate = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
      }
    } else if (planId === null) {
      planEndDate = null;
    }

    const member = await prisma.member.update({
      where: { id },
      data: {
        ...rest,
        dateOfBirth: dateOfBirth === null ? null : dateOfBirth ? new Date(dateOfBirth) : undefined,
        planId: planId === undefined ? undefined : planId,
        planStartDate: planStartDate === null ? null : planStartDate ? new Date(planStartDate) : undefined,
        planEndDate,
      },
      include: { plan: true },
    });

    return NextResponse.json(member);
  } catch (error: unknown) {
    console.error("PATCH /api/members/[id]:", error);
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    await prisma.member.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/members/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
