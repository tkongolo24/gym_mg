import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const createPlanSchema = z.object({
  name: z.string().min(1),
  priceCents: z.number().int().min(0),
  durationDays: z.number().int().min(1),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    await requireAuth();
    const plans = await prisma.membershipPlan.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { members: true } },
      },
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET /api/plans:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const parsed = createPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const plan = await prisma.membershipPlan.create({
      data: parsed.data,
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("POST /api/plans:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
