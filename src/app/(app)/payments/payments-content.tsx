"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableFooter as TableFooterComp,
  TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Payment {
  id: string;
  paidAt: string;
  amountCents: number;
  method: string;
  notes: string | null;
  member: { id: string; firstName: string; lastName: string };
}

const METHODS = ["ALL", "CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"];
const METHOD_LABELS: Record<string, string> = {
  ALL: "All Methods",
  CASH: "Cash",
  CARD: "Card",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
};

const methodVariant: Record<string, "default" | "secondary" | "outline"> = {
  CASH: "secondary",
  CARD: "default",
  MOBILE_MONEY: "outline",
  BANK_TRANSFER: "outline",
  OTHER: "outline",
};

export function PaymentsContent() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (method !== "ALL") params.set("method", method);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/payments?${params}`);
      const data = await res.json();
      setPayments(data.payments || []);
      setTotalAmount(data.totalAmountCents || 0);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [method, from, to]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = memberSearch
    ? payments.filter((p) =>
        `${p.member.firstName} ${p.member.lastName}`
          .toLowerCase()
          .includes(memberSearch.toLowerCase())
      )
    : payments;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => (
                <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Member</Label>
          <Input
            placeholder="Filter by member..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="w-48"
          />
        </div>
        {(from || to || method !== "ALL" || memberSearch) && (
          <Button variant="ghost" size="sm" onClick={() => {
            setFrom(""); setTo(""); setMethod("ALL"); setMemberSearch("");
          }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No payments found
                </TableCell>
              </TableRow>
            ) : filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{formatDate(p.paidAt)}</TableCell>
                <TableCell>
                  <Link href={`/members/${p.member.id}`} className="hover:underline font-medium">
                    {p.member.firstName} {p.member.lastName}
                  </Link>
                </TableCell>
                <TableCell className="font-semibold">{formatCurrency(p.amountCents)}</TableCell>
                <TableCell>
                  <Badge variant={methodVariant[p.method] || "outline"}>
                    {p.method.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.notes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooterComp>
            <TableRow>
              <TableCell colSpan={2} className="font-semibold">
                Total ({total} payments)
              </TableCell>
              <TableCell className="font-bold text-lg">
                {formatCurrency(totalAmount)}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooterComp>
        </Table>
      </div>
    </div>
  );
}
