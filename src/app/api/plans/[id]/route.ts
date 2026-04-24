import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  priceCents: z.number().int().min(0).optional(),
  durationDays: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = updatePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("PATCH /api/plans/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
