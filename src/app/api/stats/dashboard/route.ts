import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET() {
  try {
    await requireAuth();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      activeMembers,
      lastMonthActive,
      monthPayments,
      lastMonthPayments,
      todayAttendance,
      expiringMembers,
    ] = await Promise.all([
      // Active members now
      prisma.member.count({
        where: {
          status: "ACTIVE",
          planEndDate: { gte: now },
        },
      }),
      // Active members last month end
      prisma.member.count({
        where: {
          status: "ACTIVE",
          createdAt: { lte: lastMonthEnd },
        },
      }),
      // Revenue this month
      prisma.payment.aggregate({
        where: { paidAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amountCents: true },
      }),
      // Revenue last month
      prisma.payment.aggregate({
        where: { paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amountCents: true },
      }),
      // Check-ins today
      prisma.attendance.count({
        where: { checkedInAt: { gte: todayStart, lte: todayEnd } },
      }),
      // Expiring in 7 days
      prisma.member.count({
        where: {
          status: "ACTIVE",
          planEndDate: { gte: now, lte: sevenDaysFromNow },
        },
      }),
    ]);

    // Daily check-ins for last 14 days
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const checkInsByDay = await prisma.attendance.groupBy({
      by: ["checkedInAt"],
      where: { checkedInAt: { gte: fourteenDaysAgo } },
      _count: { id: true },
    });

    // Bucket by day
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = 0;
    }
    checkInsByDay.forEach((row) => {
      const key = new Date(row.checkedInAt).toISOString().split("T")[0];
      if (key in dailyMap) dailyMap[key] += row._count.id;
    });

    const dailyCheckIns = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        checkIns: count,
      }));

    // Revenue by plan this month
    const revenueByPlan = await prisma.payment.groupBy({
      by: ["memberId"],
      where: { paidAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amountCents: true },
    });

    // Get plan names for those members
    const memberIds = revenueByPlan.map((r) => r.memberId);
    const membersWithPlans = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      include: { plan: { select: { name: true } } },
    });

    const planRevenueMap: Record<string, number> = {};
    membersWithPlans.forEach((m) => {
      const planName = m.plan?.name || "No Plan";
      const rev = revenueByPlan.find((r) => r.memberId === m.id)?._sum?.amountCents || 0;
      planRevenueMap[planName] = (planRevenueMap[planName] || 0) + rev;
    });

    const revenueByPlanData = Object.entries(planRevenueMap).map(([plan, amountCents]) => ({
      plan,
      revenue: Math.round(amountCents / 100),
    }));

    // Recent 5 members
    const recentMembers = await prisma.member.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { plan: { select: { name: true } } },
    });

    // Next 5 expiring
    const expiringSoon = await prisma.member.findMany({
      where: {
        status: "ACTIVE",
        planEndDate: { gte: now, lte: sevenDaysFromNow },
      },
      orderBy: { planEndDate: "asc" },
      take: 5,
      include: { plan: { select: { name: true } } },
    });

    return NextResponse.json({
      kpis: {
        activeMembers,
        activeMembersDelta: activeMembers - lastMonthActive,
        revenueThisMonthCents: monthPayments._sum.amountCents || 0,
        revenueLastMonthCents: lastMonthPayments._sum.amountCents || 0,
        checkInsToday: todayAttendance,
        expiringThisWeek: expiringMembers,
      },
      charts: {
        dailyCheckIns,
        revenueByPlan: revenueByPlanData,
      },
      recentMembers,
      expiringSoon,
    });
  } catch (error) {
    console.error("GET /api/stats/dashboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
