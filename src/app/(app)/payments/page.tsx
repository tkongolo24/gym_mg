import { PaymentsContent } from "./payments-content";

export default function PaymentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">All payment transactions</p>
      </div>
      <PaymentsContent />
    </div>
  );
}
