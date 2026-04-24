import { PlansContent } from "./plans-content";

export default function PlansPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Membership Plans</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your gym membership plans</p>
      </div>
      <PlansContent />
    </div>
  );
}
