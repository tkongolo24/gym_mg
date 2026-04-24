import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const members = await prisma.member.findMany({
      where: {
        status: { not: "INACTIVE" },
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { plan: { select: { name: true } } },
      take: 10,
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("GET /api/members/search:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
