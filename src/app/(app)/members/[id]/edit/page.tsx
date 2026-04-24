import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MemberForm } from "@/components/members/member-form";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) notFound();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Member</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {member.firstName} {member.lastName}
        </p>
      </div>
      <MemberForm
        initialData={{
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone,
          dateOfBirth: member.dateOfBirth?.toISOString() || null,
          gender: member.gender,
          planId: member.planId,
          planStartDate: member.planStartDate?.toISOString() || null,
          planEndDate: member.planEndDate?.toISOString() || null,
          notes: member.notes,
        }}
      />
    </div>
  );
}
