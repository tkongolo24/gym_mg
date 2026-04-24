import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, CalendarCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCharts } from "./dashboard-charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function getDashboardData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    activeMembers,
    lastMonthActive,
    monthPaymentsAgg,
    lastMonthPaymentsAgg,
    todayAttendanceCount,
    expiringCount,
    recentMembers,
    expiringSoon,
    checkInsRaw,
  ] = await Promise.all([
    prisma.member.count({ where: { status: "ACTIVE", planEndDate: { gte: now } } }),
    prisma.member.count({ where: { status: "ACTIVE", createdAt: { lte: lastMonthEnd } } }),
    prisma.payment.aggregate({ where: { paidAt: { gte: monthStart, lte: monthEnd } }, _sum: { amountCents: true } }),
    prisma.payment.aggregate({ where: { paidAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { amountCents: true } }),
    prisma.attendance.count({ where: { checkedInAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.member.count({ where: { status: "ACTIVE", planEndDate: { gte: now, lte: sevenDaysFromNow } } }),
    prisma.member.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { plan: { select: { name: true } } },
    }),
    prisma.member.findMany({
      where: { status: "ACTIVE", planEndDate: { gte: now, lte: sevenDaysFromNow } },
      orderBy: { planEndDate: "asc" },
      take: 5,
      include: { plan: { select: { name: true } } },
    }),
    prisma.attendance.findMany({
      where: { checkedInAt: { gte: fourteenDaysAgo } },
      select: { checkedInAt: true },
    }),
  ]);

  // Daily check-ins for last 14 days
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    dailyMap[key] = 0;
  }
  checkInsRaw.forEach((row) => {
    const key = new Date(row.checkedInAt).toISOString().split("T")[0];
    if (key in dailyMap) dailyMap[key]++;
  });

  const dailyCheckIns = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      checkIns: count,
    }));

  // Revenue by plan this month
  const paymentsThisMonth = await prisma.payment.findMany({
    where: { paidAt: { gte: monthStart, lte: monthEnd } },
    include: { member: { include: { plan: { select: { name: true } } } } },
  });

  const planRevenueMap: Record<string, number> = {};
  paymentsThisMonth.forEach((p) => {
    const planName = p.member.plan?.name || "No Plan";
    planRevenueMap[planName] = (planRevenueMap[planName] || 0) + p.amountCents;
  });

  const revenueByPlan = Object.entries(planRevenueMap).map(([plan, amountCents]) => ({
    plan,
    revenue: Math.round(amountCents / 100),
  }));

  return {
    kpis: {
      activeMembers,
      activeMembersDelta: activeMembers - lastMonthActive,
      revenueThisMonthCents: monthPaymentsAgg._sum.amountCents || 0,
      revenueLastMonthCents: lastMonthPaymentsAgg._sum.amountCents || 0,
      checkInsToday: todayAttendanceCount,
      expiringThisWeek: expiringCount,
    },
    charts: { dailyCheckIns, revenueByPlan },
    recentMembers,
    expiringSoon,
  };
}

export async function DashboardContent() {
  const data = await getDashboardData();
  const { kpis, charts, recentMembers, expiringSoon } = data;

  const revDelta = kpis.revenueThisMonthCents - kpis.revenueLastMonthCents;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.activeMembersDelta >= 0 ? "+" : ""}{kpis.activeMembersDelta} vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.revenueThisMonthCents)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {revDelta >= 0 ? "+" : ""}{formatCurrency(Math.abs(revDelta))} vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins Today</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.checkInsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">UTC date boundary</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring This Week</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.expiringThisWeek}</div>
            <Link href="/members?status=EXPIRING" className="text-xs text-primary hover:underline mt-1 block">
              View members →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts dailyCheckIns={charts.dailyCheckIns} revenueByPlan={charts.revenueByPlan} />

      {/* Bottom tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Members</CardTitle>
            <Link href="/members">
              <Button variant="ghost" size="sm" className="text-xs">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link href={`/members/${m.id}`} className="font-medium hover:underline">
                        {m.firstName} {m.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.plan?.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(m.joinedAt)}
                    </TableCell>
                  </TableRow>
                ))}
                {recentMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No members yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Expiring Soon</CardTitle>
            <Link href="/members">
              <Button variant="ghost" size="sm" className="text-xs">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringSoon.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link href={`/members/${m.id}`} className="font-medium hover:underline">
                        {m.firstName} {m.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.plan?.name || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="warning">{m.planEndDate ? formatDate(m.planEndDate) : "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/members/${m.id}/edit`}>
                        <Button variant="outline" size="sm" className="text-xs">Renew</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {expiringSoon.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No members expiring this week</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
