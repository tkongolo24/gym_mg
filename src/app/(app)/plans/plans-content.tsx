"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  priceCents: number;
  durationDays: number;
  isActive: boolean;
  _count: { members: number };
}

function PlanFormDialog({
  plan,
  onSave,
}: {
  plan?: Plan;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(plan?.name || "");
  const [price, setPrice] = useState(plan ? (plan.priceCents / 100).toFixed(2) : "");
  const [days, setDays] = useState(plan?.durationDays.toString() || "30");
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!priceCents || priceCents <= 0) {
      toast({ variant: "destructive", title: "Invalid price" });
      return;
    }
    setLoading(true);
    try {
      const url = plan ? `/api/plans/${plan.id}` : "/api/plans";
      const method = plan ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          priceCents,
          durationDays: parseInt(days),
          isActive,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast({ variant: "destructive", title: "Error", description: d.error });
        return;
      }
      toast({ title: plan ? "Plan updated" : "Plan created" });
      setOpen(false);
      onSave();
    } catch {
      toast({ variant: "destructive", title: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {plan ? (
          <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="h-4 w-4 mr-2" />Add Plan</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit Plan" : "Add Plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Monthly" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (USD) *</Label>
              <Input
                type="number" step="0.01" min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="40.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (days) *</Label>
              <Input
                type="number" min="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isActive">Active (available for new members)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Plan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PlansContent() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PlanFormDialog onSave={fetchPlans} />
      </div>

      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No plans yet. Add your first plan.
                </TableCell>
              </TableRow>
            ) : plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>{formatCurrency(plan.priceCents)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {plan.durationDays === 1 ? "1 day" :
                   plan.durationDays === 30 ? "Monthly" :
                   plan.durationDays === 90 ? "Quarterly" :
                   plan.durationDays === 365 ? "Annual" :
                   `${plan.durationDays} days`}
                </TableCell>
                <TableCell>
                  <Badge variant={plan.isActive ? "success" : "muted"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{plan._count.members}</TableCell>
                <TableCell className="text-right">
                  <PlanFormDialog plan={plan} onSave={fetchPlans} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={async () => {
                      await fetch(`/api/plans/${plan.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isActive: !plan.isActive }),
                      });
                      fetchPlans();
                    }}
                  >
                    {plan.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
