"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck } from "lucide-react";

export function CheckInButton({ memberId }: { memberId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleCheckIn() {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Check-in failed", description: data.error });
        return;
      }
      toast({ title: "Checked in!", description: "Member checked in successfully" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleCheckIn} disabled={loading}>
      <CalendarCheck className="h-4 w-4 mr-2" />
      {loading ? "Checking in..." : "Check In"}
    </Button>
  );
}
