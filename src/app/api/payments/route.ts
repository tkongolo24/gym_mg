import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const createPaymentSchema = z.object({
  memberId: z.string().min(1),
  amountCents: z.number().int().min(1),
  method: z.enum(["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"]).default("CASH"),
  notes: z.string().optional(),
  paidAt: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const method = searchParams.get("method");
    const memberId = searchParams.get("memberId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 50;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.paidAt = {};
      if (from) (where.paidAt as Record<string, unknown>).gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        (where.paidAt as Record<string, unknown>).lte = toDate;
      }
    }
    if (method && method !== "ALL") where.method = method;
    if (memberId) where.memberId = memberId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          member: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { paidAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
    ]);

    const totalAmount = await prisma.payment.aggregate({
      where,
      _sum: { amountCents: true },
    });

    return NextResponse.json({
      payments,
      total,
      totalAmountCents: totalAmount._sum.amountCents || 0,
    });
  } catch (error) {
    console.error("GET /api/payments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { paidAt, ...rest } = parsed.data;

    const payment = await prisma.payment.create({
      data: {
        ...rest,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("POST /api/payments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
