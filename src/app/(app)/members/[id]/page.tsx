import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatCurrency, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { LogPaymentDialog } from "@/components/members/log-payment-dialog";
import { CheckInButton } from "@/components/members/check-in-button";

async function getMember(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      plan: true,
      payments: { orderBy: { paidAt: "desc" }, take: 50 },
      attendances: { orderBy: { checkedInAt: "desc" }, take: 50 },
    },
  });
  return member;
}

type MemberStatus = "ACTIVE" | "EXPIRED" | "INACTIVE";
const statusVariant: Record<MemberStatus, "success" | "danger" | "muted"> = {
  ACTIVE: "success",
  EXPIRED: "danger",
  INACTIVE: "muted",
};

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMember(id);
  if (!member) notFound();

  const now = new Date();
  const effectiveStatus: MemberStatus =
    member.status === "INACTIVE"
      ? "INACTIVE"
      : member.planEndDate && member.planEndDate < now
      ? "EXPIRED"
      : (member.status as MemberStatus);

  // Check if already checked in today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  const checkedInToday = member.attendances.some(
    (a) => a.checkedInAt >= todayStart && a.checkedInAt <= todayEnd
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {getInitials(member.firstName, member.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {member.firstName} {member.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusVariant[effectiveStatus]}>{effectiveStatus}</Badge>
              {member.plan && (
                <span className="text-sm text-muted-foreground">{member.plan.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!checkedInToday && effectiveStatus === "ACTIVE" && (
            <CheckInButton memberId={member.id} />
          )}
          <LogPaymentDialog memberId={member.id} memberName={`${member.firstName} ${member.lastName}`} />
          <Link href={`/members/${member.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments ({member.payments.length})</TabsTrigger>
          <TabsTrigger value="attendance">Attendance ({member.attendances.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Contact Info</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{member.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{member.phone || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">DOB</span>
                  <span>{member.dateOfBirth ? formatDate(member.dateOfBirth) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender</span>
                  <span>{member.gender || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{formatDate(member.joinedAt)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Membership</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span>{member.plan?.name || "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span>{member.plan ? formatCurrency(member.plan.priceCents) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date</span>
                  <span>{member.planStartDate ? formatDate(member.planStartDate) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date</span>
                  <span>{member.planEndDate ? formatDate(member.planEndDate) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={statusVariant[effectiveStatus]}>{effectiveStatus}</Badge>
                </div>
              </CardContent>
            </Card>
            {member.notes && (
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-sm font-semibold">Notes</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{member.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No payments recorded</TableCell>
                    </TableRow>
                  ) : member.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{formatDate(p.paidAt)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.amountCents)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.method.replace("_", " ")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.attendances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No attendance recorded</TableCell>
                    </TableRow>
                  ) : member.attendances.map((a) => {
                    const duration = a.checkedOutAt
                      ? Math.round((a.checkedOutAt.getTime() - a.checkedInAt.getTime()) / 60000)
                      : null;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">{formatDateTime(a.checkedInAt)}</TableCell>
                        <TableCell className="text-sm">{a.checkedOutAt ? formatDateTime(a.checkedOutAt) : <Badge variant="success">Active</Badge>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {duration !== null ? `${duration}m` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
