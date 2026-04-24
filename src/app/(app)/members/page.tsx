import { Suspense } from "react";
import { MembersContent } from "./members-content";

export default function MembersPage() {
  return (
    <div className="p-6 space-y-6">
      <Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg" />}>
        <MembersContent />
      </Suspense>
    </div>
  );
}
