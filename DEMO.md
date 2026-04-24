# GymOS — Demo Guide

## Live URL
> _To be filled in after Vercel deployment_

## Admin Credentials
| Field    | Value              |
|----------|--------------------|
| Email    | `admin@gymos.dev`  |
| Password | `demo1234`         |

---

## 5-Step Demo Walkthrough

### Step 1: Log In
1. Open the live URL
2. Enter `admin@gymos.dev` / `demo1234`
3. You'll land on the **Dashboard** — 4 KPI cards should show non-zero values:
   - Active Members (~12)
   - Revenue This Month (~$400+)
   - Check-ins Today
   - Expiring This Week (4 members)
4. Both charts show live data (line chart = 14-day check-ins, bar = revenue by plan)

### Step 2: Browse Members
1. Click **Members** in the sidebar
2. Use the search bar to filter by name (try "James" or "Amara")
3. Click status chips — **Expired** shows 3 members, **Active** shows 16
4. Click **View** on any member to see their profile, payments, and attendance tabs

### Step 3: Add a New Member
1. Click **Add Member** (top right of Members page)
2. Fill in name, email, and select the **Monthly** plan
3. Note the plan end date auto-computes (today + 30 days)
4. Click **Create Member**
5. You're redirected to their detail page — they appear in the members list

### Step 4: Log a Payment
1. On any member's detail page, click **Log Payment**
2. Enter amount (e.g., `40.00`), select method (Cash)
3. Click **Log Payment**
4. Switch to the **Payments** tab — the new entry appears
5. Go to **Payments** in the sidebar — total is updated

### Step 5: Check In a Member
1. Click **Attendance** in the sidebar
2. In the check-in panel, type a member's name (e.g., "Kofi")
3. Select them from the results
4. Click **Check In**
5. They appear in "Today's Check-ins" below
6. Return to **Dashboard** — "Check-ins Today" counter is updated

---

## Deployment Instructions

### Prerequisites
- [Neon](https://neon.tech) account (free tier) — for the PostgreSQL database
- [Vercel](https://vercel.com) account (free tier) — for hosting

### Step 1: Create Neon Database
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project → choose a region close to your users
3. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

### Step 2: Run Migrations
```bash
# In /home/user/gym_mg, set your real DATABASE_URL
DATABASE_URL="your-neon-connection-string" npx prisma migrate dev --name init

# Then seed the database
DATABASE_URL="your-neon-connection-string" pnpm db:seed
```

### Step 3: Deploy to Vercel
1. Push the branch to GitHub (if not already done)
2. Go to [vercel.com/new](https://vercel.com/new) → Import from GitHub → select `gym_mg`
3. Set the following **Environment Variables** in Vercel:

| Variable          | Value                                    |
|-------------------|------------------------------------------|
| `DATABASE_URL`    | Your Neon connection string              |
| `ADMIN_EMAIL`     | `admin@gymos.dev`                        |
| `ADMIN_PASSWORD`  | `demo1234`                               |
| `SESSION_SECRET`  | Any 32+ character random string          |

4. Deploy → Vercel will auto-run `prisma generate` and `next build`

### Step 4: Smoke Test the Live URL
- [ ] Login works with credentials
- [ ] Dashboard shows non-zero KPI cards
- [ ] Both charts render with data
- [ ] Add a member end-to-end
- [ ] Log a payment → see it on Payments page
- [ ] Check in a member → see Today's check-ins update

---

## Known Limitations

| Limitation | Details |
|------------|---------|
| **Timezone** | All date boundaries (e.g., "today's check-ins") use **UTC**. A check-in at 11pm your local time may count toward tomorrow's stats if you're UTC-1 or earlier. |
| **Status sync** | Member EXPIRED status is computed on-read from `planEndDate`. There is no background cron — if you filter by "Active" it checks `planEndDate >= now()` dynamically. |
| **No email alerts** | Expiring members are shown in the dashboard but no automated email is sent. |
| **Single admin** | Only one admin account (`admin@gymos.dev`). No multi-user support. |
| **No file uploads** | Member photos use initials/avatars. No image storage. |
| **Day pass duration** | A Day Pass expires exactly 24 hours after `planStartDate`, not at end-of-calendar-day. |

---

## Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Neon |
| ORM | Prisma 5 |
| UI | Radix UI + Tailwind CSS v4 |
| Auth | iron-session (cookie-based) |
| Charts | Recharts |
| Deploy | Vercel |
