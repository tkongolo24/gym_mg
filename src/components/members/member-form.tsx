"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  priceCents: number;
  durationDays: number;
  isActive: boolean;
}

interface MemberFormProps {
  initialData?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    planId?: string | null;
    planStartDate?: string | null;
    planEndDate?: string | null;
    notes?: string | null;
  };
}

export function MemberForm({ initialData }: MemberFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const isEdit = !!initialData?.id;

  const [form, setForm] = useState({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    dateOfBirth: initialData?.dateOfBirth
      ? new Date(initialData.dateOfBirth).toISOString().split("T")[0]
      : "",
    gender: initialData?.gender || "",
    planId: initialData?.planId || "",
    planStartDate: initialData?.planStartDate
      ? new Date(initialData.planStartDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    notes: initialData?.notes || "",
  });

  const [computedEndDate, setComputedEndDate] = useState<string | null>(
    initialData?.planEndDate
      ? new Date(initialData.planEndDate).toISOString().split("T")[0]
      : null
  );

  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then(setPlans);
  }, []);

  useEffect(() => {
    if (form.planId && form.planStartDate) {
      const plan = plans.find((p) => p.id === form.planId);
      if (plan) {
        const start = new Date(form.planStartDate);
        const end = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        setComputedEndDate(end.toISOString().split("T")[0]);
      }
    } else {
      setComputedEndDate(null);
    }
  }, [form.planId, form.planStartDate, plans]);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        planId: form.planId || null,
        planStartDate: form.planStartDate || null,
        notes: form.notes || null,
      };

      const url = isEdit ? `/api/members/${initialData!.id}` : "/api/members";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ variant: "destructive", title: "Error", description: data.error || "Something went wrong" });
        return;
      }

      toast({ variant: "success" as never, title: isEdit ? "Member updated" : "Member created" });
      router.push(`/members/${data.id}`);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={form.gender} onValueChange={(v) => setField("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Select value={form.planId} onValueChange={(v) => setField("planId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No plan</SelectItem>
                {plans.filter((p) => p.isActive).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — ${(p.priceCents / 100).toFixed(2)} / {p.durationDays}d
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.planId && form.planId !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="planStartDate">Plan Start Date</Label>
              <Input
                id="planStartDate"
                type="date"
                value={form.planStartDate}
                onChange={(e) => setField("planStartDate", e.target.value)}
              />
              {computedEndDate && (
                <p className="text-sm text-muted-foreground">
                  Plan ends: <strong>{formatDate(computedEndDate)}</strong>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Any notes about this member..."
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Update Member" : "Create Member"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
