import { PrismaClient, Gender, MemberStatus, PaymentMethod } from "@prisma/client";

const prisma = new PrismaClient();

const NAMES = [
  { firstName: "James", lastName: "Okafor", email: "james.okafor@example.com", gender: Gender.MALE },
  { firstName: "Amara", lastName: "Diallo", email: "amara.diallo@example.com", gender: Gender.FEMALE },
  { firstName: "Kwame", lastName: "Mensah", email: "kwame.mensah@example.com", gender: Gender.MALE },
  { firstName: "Fatima", lastName: "Al-Hassan", email: "fatima.alhassan@example.com", gender: Gender.FEMALE },
  { firstName: "David", lastName: "Nkrumah", email: "david.nkrumah@example.com", gender: Gender.MALE },
  { firstName: "Zara", lastName: "Mwangi", email: "zara.mwangi@example.com", gender: Gender.FEMALE },
  { firstName: "Emmanuel", lastName: "Asante", email: "emmanuel.asante@example.com", gender: Gender.MALE },
  { firstName: "Yemi", lastName: "Adeyemi", email: "yemi.adeyemi@example.com", gender: Gender.FEMALE },
  { firstName: "Ibrahim", lastName: "Traore", email: "ibrahim.traore@example.com", gender: Gender.MALE },
  { firstName: "Nadia", lastName: "Benali", email: "nadia.benali@example.com", gender: Gender.FEMALE },
  { firstName: "Kofi", lastName: "Boateng", email: "kofi.boateng@example.com", gender: Gender.MALE },
  { firstName: "Adaeze", lastName: "Obi", email: "adaeze.obi@example.com", gender: Gender.FEMALE },
  { firstName: "Marcus", lastName: "Thompson", email: "marcus.thompson@example.com", gender: Gender.MALE },
  { firstName: "Sofia", lastName: "Andrade", email: "sofia.andrade@example.com", gender: Gender.FEMALE },
  { firstName: "Ahmed", lastName: "Khalid", email: "ahmed.khalid@example.com", gender: Gender.MALE },
  { firstName: "Priya", lastName: "Nair", email: "priya.nair@example.com", gender: Gender.FEMALE },
  { firstName: "Carlos", lastName: "Mendoza", email: "carlos.mendoza@example.com", gender: Gender.MALE },
  { firstName: "Aisha", lastName: "Kamara", email: "aisha.kamara@example.com", gender: Gender.FEMALE },
  { firstName: "Felix", lastName: "Owusu", email: "felix.owusu@example.com", gender: Gender.MALE },
  { firstName: "Lina", lastName: "Petrov", email: "lina.petrov@example.com", gender: Gender.FEMALE },
];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.member.deleteMany();
  await prisma.membershipPlan.deleteMany();

  // Plans
  const plans = await Promise.all([
    prisma.membershipPlan.create({
      data: { name: "Day Pass", priceCents: 500, durationDays: 1 },
    }),
    prisma.membershipPlan.create({
      data: { name: "Monthly", priceCents: 4000, durationDays: 30 },
    }),
    prisma.membershipPlan.create({
      data: { name: "Quarterly", priceCents: 10000, durationDays: 90 },
    }),
    prisma.membershipPlan.create({
      data: { name: "Annual", priceCents: 35000, durationDays: 365 },
    }),
  ]);

  const [dayPass, monthly, quarterly, annual] = plans;
  console.log("✅ Plans created");

  const members: { id: string }[] = [];

  // 12 active members with varied start dates (last 6 months)
  const activeMemberConfigs = [
    { nameIdx: 0, plan: annual, startDaysAgo: 180 },
    { nameIdx: 1, plan: monthly, startDaysAgo: 25 },
    { nameIdx: 2, plan: quarterly, startDaysAgo: 60 },
    { nameIdx: 3, plan: annual, startDaysAgo: 90 },
    { nameIdx: 4, plan: monthly, startDaysAgo: 15 },
    { nameIdx: 5, plan: quarterly, startDaysAgo: 45 },
    { nameIdx: 6, plan: monthly, startDaysAgo: 10 },
    { nameIdx: 7, plan: annual, startDaysAgo: 150 },
    { nameIdx: 8, plan: quarterly, startDaysAgo: 30 },
    { nameIdx: 9, plan: monthly, startDaysAgo: 5 },
    { nameIdx: 10, plan: annual, startDaysAgo: 200 },
    { nameIdx: 11, plan: monthly, startDaysAgo: 20 },
  ];

  for (const config of activeMemberConfigs) {
    const n = NAMES[config.nameIdx];
    const start = daysAgo(config.startDaysAgo);
    const end = new Date(start.getTime() + config.plan.durationDays * 24 * 60 * 60 * 1000);
    const m = await prisma.member.create({
      data: {
        ...n,
        status: MemberStatus.ACTIVE,
        planId: config.plan.id,
        planStartDate: start,
        planEndDate: end,
        joinedAt: start,
        phone: `+1555${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      },
    });
    members.push(m);
  }

  // 4 members expiring in the next 7 days
  const expiringConfigs = [
    { nameIdx: 12, plan: monthly, expiresInDays: 2 },
    { nameIdx: 13, plan: monthly, expiresInDays: 4 },
    { nameIdx: 14, plan: quarterly, expiresInDays: 6 },
    { nameIdx: 15, plan: monthly, expiresInDays: 1 },
  ];

  for (const config of expiringConfigs) {
    const n = NAMES[config.nameIdx];
    const end = daysFromNow(config.expiresInDays);
    const start = new Date(end.getTime() - config.plan.durationDays * 24 * 60 * 60 * 1000);
    const m = await prisma.member.create({
      data: {
        ...n,
        status: MemberStatus.ACTIVE,
        planId: config.plan.id,
        planStartDate: start,
        planEndDate: end,
        joinedAt: start,
        phone: `+1555${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      },
    });
    members.push(m);
  }

  // 3 expired members
  const expiredConfigs = [
    { nameIdx: 16, plan: monthly, endedDaysAgo: 15 },
    { nameIdx: 17, plan: quarterly, endedDaysAgo: 45 },
    { nameIdx: 18, plan: monthly, endedDaysAgo: 5 },
  ];

  for (const config of expiredConfigs) {
    const n = NAMES[config.nameIdx];
    const end = daysAgo(config.endedDaysAgo);
    const start = new Date(end.getTime() - config.plan.durationDays * 24 * 60 * 60 * 1000);
    const m = await prisma.member.create({
      data: {
        ...n,
        status: MemberStatus.EXPIRED,
        planId: config.plan.id,
        planStartDate: start,
        planEndDate: end,
        joinedAt: start,
      },
    });
    members.push(m);
  }

  // 1 inactive member
  const inactiveN = NAMES[19];
  const inactiveStart = daysAgo(120);
  const inactiveEnd = new Date(inactiveStart.getTime() + monthly.durationDays * 24 * 60 * 60 * 1000);
  const inactiveMember = await prisma.member.create({
    data: {
      ...inactiveN,
      status: MemberStatus.INACTIVE,
      planId: monthly.id,
      planStartDate: inactiveStart,
      planEndDate: inactiveEnd,
      joinedAt: inactiveStart,
    },
  });
  members.push(inactiveMember);

  console.log(`✅ ${members.length} members created`);

  // Payments: active and expiring members get 1-4 payments
  const activeMemberIds = members.slice(0, 16).map((m) => m.id);
  const paymentMethods: PaymentMethod[] = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.MOBILE_MONEY];

  let totalPayments = 0;
  for (let i = 0; i < activeMemberIds.length; i++) {
    const memberId = activeMemberIds[i];
    const numPayments = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numPayments; j++) {
      const daysAgoAmt = Math.floor(Math.random() * 60);
      const plan = j < 12 ? activeMemberConfigs[i < 12 ? i : 0].plan : monthly;
      await prisma.payment.create({
        data: {
          memberId,
          amountCents: plan.priceCents,
          method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          paidAt: daysAgo(daysAgoAmt),
          notes: j === 0 ? "Initial payment" : null,
        },
      });
      totalPayments++;
    }
  }

  // Extra payments this month for good revenue numbers
  for (let i = 0; i < 8; i++) {
    const memberId = activeMemberIds[Math.floor(Math.random() * activeMemberIds.length)];
    await prisma.payment.create({
      data: {
        memberId,
        amountCents: monthly.priceCents,
        method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        paidAt: daysAgo(Math.floor(Math.random() * 20)),
      },
    });
    totalPayments++;
  }

  console.log(`✅ ${totalPayments} payments created`);

  // Attendance: last 14 days, 3-15 check-ins per day
  const activeForAttendance = members.slice(0, 16);
  let totalAttendance = 0;

  for (let day = 0; day < 14; day++) {
    const numCheckIns = Math.floor(Math.random() * 13) + 3;
    const shuffled = [...activeForAttendance].sort(() => Math.random() - 0.5);
    const dayMembers = shuffled.slice(0, Math.min(numCheckIns, shuffled.length));

    for (const member of dayMembers) {
      const checkInDate = daysAgo(13 - day);
      checkInDate.setHours(6 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), 0, 0);
      const checkOutDate = new Date(checkInDate.getTime() + (30 + Math.floor(Math.random() * 90)) * 60 * 1000);

      await prisma.attendance.create({
        data: {
          memberId: member.id,
          checkedInAt: checkInDate,
          checkedOutAt: day < 13 ? checkOutDate : null, // today's entries may not be checked out
        },
      });
      totalAttendance++;
    }
  }

  console.log(`✅ ${totalAttendance} attendance records created`);
  console.log("\n🎉 Seed complete!");
  console.log(`   Plans:      ${plans.length}`);
  console.log(`   Members:    ${members.length}`);
  console.log(`   Payments:   ${totalPayments}`);
  console.log(`   Attendance: ${totalAttendance}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
