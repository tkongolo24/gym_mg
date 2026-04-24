import { MemberForm } from "@/components/members/member-form";

export default function NewMemberPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add Member</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new gym member</p>
      </div>
      <MemberForm />
    </div>
  );
}
