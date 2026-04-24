"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, getInitials } from "@/lib/utils";
import { Search, UserCheck } from "lucide-react";

interface MemberResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  plan: { name: string } | null;
}

interface AttendanceRecord {
  id: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  member: { id: string; firstName: string; lastName: string };
}

export function AttendanceContent() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [memberIdInput, setMemberIdInput] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);

  const fetchToday = useCallback(async () => {
    setLoadingToday(true);
    try {
      const res = await fetch("/api/attendance/today");
      const data = await res.json();
      setTodayAttendance(Array.isArray(data) ? data : []);
    } finally {
      setLoadingToday(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      const res = await fetch(`/api/members/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function handleCheckIn(memberId: string) {
    setCheckingIn(true);
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
      toast({ title: "Checked in!", description: `${selectedMember?.firstName || ""} checked in` });
      setSelectedMember(null);
      setSearchQuery("");
      setMemberIdInput("");
      setSearchResults([]);
      fetchToday();
    } catch {
      toast({ variant: "destructive", title: "Network error" });
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut(attendanceId: string) {
    const res = await fetch(`/api/attendance/${attendanceId}/checkout`, { method: "PATCH" });
    if (res.ok) {
      toast({ title: "Checked out" });
      fetchToday();
    }
  }

  async function handleSearchById() {
    if (!memberIdInput.trim()) return;
    const res = await fetch(`/api/members/${memberIdInput.trim()}`);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Member not found" });
      return;
    }
    const data = await res.json();
    setSelectedMember(data);
  }

  return (
    <div className="space-y-6">
      {/* Check-in panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check-In Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="search">
            <TabsList>
              <TabsTrigger value="search">Search by Name</TabsTrigger>
              <TabsTrigger value="id">By Member ID</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedMember(null);
                  }}
                  className="pl-9"
                />
              </div>
              {searchResults.length > 0 && !selectedMember && (
                <div className="border rounded-lg divide-y bg-white shadow-sm">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left transition-colors"
                      onClick={() => { setSelectedMember(m); setSearchResults([]); }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(m.firstName, m.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-muted-foreground">{m.email} · {m.plan?.name || "No plan"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="id" className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste member ID..."
                  value={memberIdInput}
                  onChange={(e) => setMemberIdInput(e.target.value)}
                />
                <Button variant="outline" onClick={handleSearchById}>Find</Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Selected member card */}
          {selectedMember && (
            <div className="mt-4 p-4 border rounded-lg bg-blue-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-base bg-primary text-white">
                    {getInitials(selectedMember.firstName, selectedMember.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedMember.firstName} {selectedMember.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  <p className="text-xs text-muted-foreground">{selectedMember.plan?.name || "No plan"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleCheckIn(selectedMember.id)}
                  disabled={checkingIn}
                  size="lg"
                >
                  <UserCheck className="h-5 w-5 mr-2" />
                  {checkingIn ? "Checking in..." : "Check In"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedMember(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's check-ins */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Today&apos;s Check-ins ({todayAttendance.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchToday}>Refresh</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingToday ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(4)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : todayAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No check-ins today yet
                  </TableCell>
                </TableRow>
              ) : todayAttendance.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.member.firstName} {a.member.lastName}
                  </TableCell>
                  <TableCell className="text-sm">{formatDateTime(a.checkedInAt)}</TableCell>
                  <TableCell>
                    {a.checkedOutAt ? (
                      <Badge variant="muted">Checked out</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!a.checkedOutAt && (
                      <Button variant="outline" size="sm" onClick={() => handleCheckOut(a.id)}>
                        Check Out
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
