import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  planId: z.string().optional(),
  planStartDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    const now = new Date();

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status && status !== "ALL") {
      if (status === "ACTIVE") {
        where.status = "ACTIVE";
        where.planEndDate = { gte: now };
      } else if (status === "EXPIRED") {
        where.OR = [
          { status: "EXPIRED" },
          { status: "ACTIVE", planEndDate: { lt: now } },
        ];
      } else {
        where.status = status;
      }
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        include: { plan: { select: { name: true, priceCents: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.member.count({ where }),
    ]);

    // Compute effective status
    const enriched = members.map((m) => ({
      ...m,
      effectiveStatus:
        m.status === "INACTIVE"
          ? "INACTIVE"
          : m.planEndDate && m.planEndDate < now
          ? "EXPIRED"
          : m.status,
    }));

    return NextResponse.json({ members: enriched, total, page, pageSize });
  } catch (error) {
    console.error("GET /api/members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const parsed = createMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { planId, planStartDate, dateOfBirth, ...rest } = parsed.data;

    let planEndDate: Date | undefined;
    if (planId && planStartDate) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (plan) {
        const start = new Date(planStartDate);
        planEndDate = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
      }
    }

    const member = await prisma.member.create({
      data: {
        ...rest,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        planId: planId || null,
        planStartDate: planStartDate ? new Date(planStartDate) : null,
        planEndDate: planEndDate || null,
      },
      include: { plan: true },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/members:", error);
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
