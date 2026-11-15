# CareConnect – Elderly Care & Medication Management Platform

**CareConnect** is an accessible, senior-friendly healthcare web application built with **React 19, Vite, JavaScript, Tailwind CSS v4, and Supabase**. It empowers older adults to manage daily medications and doctor appointments independently while keeping authorized family members and professional caretakers connected in real time.

---

## Key Features

### 1. Senior-First Accessible Healthcare UI
- High-contrast **White, Teal, and Medical Blue** color palette designed for aging eyes.
- Extra-large typography (`18px+` body text) and touch targets (`52px–60px` height) for users with reduced dexterity.
- Full responsiveness across Desktop, Tablet, and Mobile devices, including a one-tap **Emergency SOS Modal**.

### 2. Protected Authentication & Per-User Isolation
- **Strict Registration & Sign-In**: Enforces strong passwords (`8+` characters, letters + numbers), salted **SHA-256** cryptographic hashing (and **Supabase Auth JWT** integration when cloud-connected).
- **Brute-Force Lockout Protection**: Automatically locks login attempts for 30 seconds after 5 consecutive failed password attempts.
- **Route Guards & Per-User Data Isolation**: `<DashboardApp />` requires an active verified `sessionToken`, and each registered account maintains its own isolated medical profile and data namespace.

### 3. Medication Management & Duplicate-Proof Dose Tracking
- Full CRUD for daily prescriptions (Name, Dosage, Purpose, Scheduled Time, Daily Period, Frequency, Prescribing Doctor, Remaining Pill Supply, and Instructions).
- Tracks **5 distinct dose states** separately:
  - `Upcoming` (Scheduled later today)
  - `Pending` (Within reminder lead window; reminder dispatched)
  - `Unconfirmed (Overdue)` (Past grace period with no confirmation; family check-in alert dispatched)
  - `Taken` (Explicitly confirmed by user; decrements pill supply & records timestamp)
  - `Missed` (Explicitly logged as missed by user)
- **Duplicate Dose Log Prevention**: Uses a deterministic `dose_idempotency_key` (`<medication_id>:<YYYY-MM-DD>`) so marking a medicine on the same day never creates duplicate log rows or double-decrements pill counts.

### 4. Role-Based Access Control (RBAC), Single-Use Invites & Supabase RLS
- **3 Server-Enforced Roles**:
  - `patient`: Full data owner (CRUD on profile, medications, appointments, invite generation, and instant access revocation).
  - `caretaker`: Can view records, log doses, and add/update medications and appointments; **cannot** delete medications or invite/revoke users.
  - `family_member`: Read access + ability to log doses (`Taken` / `Missed`) when assisting the patient; **cannot** add/delete medications or manage access.
- **Cryptographically Random, Single-Use, Expiring Invitations**:
  - Generated via `crypto.getRandomValues()` (`CC-XXXX-XXXX-XXXX`) and stored only as a **SHA-256 hash** (`code_hash`).
  - Verified on the backend (`redeem_care_invitation` RPC) checking SHA-256 hash match, single-use status (`used_at IS NULL`), expiration timestamp (`expires_at > now()`), revocation state, and email binding.
- **Immediate Revocation & Immutable Audit Log**: Revoking a caregiver immediately blocks database queries via `public.has_patient_access()` and logs the event in `security_audit_logs`.

### 5. Smart Notification Engine (Supabase Edge Functions + Cron + Resend)
- Configurable **IANA Timezone**, **Reminder Lead Time** (`10–60 mins`), **Family Grace Period** (`15–60 mins`), and **Appointment Advance Notice** (`2–48 hours`).
- **Duplicate-Email Prevention**: Enforces a `UNIQUE (idempotency_key)` constraint on `notification_dispatches`.
- **Honest Delivery Status**: Connects to `supabase.functions.invoke('smart-notifications')`. Clearly distinguishes between live emails delivered via **Resend (`SENT VIA RESEND`)** and local dry-run simulations (`SIMULATED (NO RESEND KEY)`) when external API secrets are not yet configured.
- **Strict Medical Safety Rule**: Sending a reminder or overdue alert **never automatically marks a dose as `Missed`**, and every notification includes the mandatory safety disclaimer: *"Never change or double a medicine dose to make up for a late or unconfirmed dose."*

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite 6, JavaScript (ES2024+), Tailwind CSS v4, Lucide React Icons |
| **Database & Auth** | Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS), PL/pgSQL RPCs |
| **Serverless & Jobs** | Supabase Edge Functions (Deno TypeScript), Supabase Cron (`pg_cron` + `pg_net`) |
| **Transactional Email** | Resend REST API (`https://api.resend.com/emails`) with HTML escaping |
| **Automated Testing** | Node.js Built-In Test Runner (`node --test`) |

---

## Project Structure

```text
heckthone_1/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
├── public/
│   └── _redirects
├── supabase/
│   ├── functions/
│   │   └── smart-notifications/
│   │       └── index.ts                      # Deno Edge Function (Resend + JWT/Cron Auth + HTML escaping)
│   └── migrations/
│       ├── 001_careconnect_schema.sql        # Core tables, constraints, and baseline RLS
│       ├── 002_secure_access_and_rls.sql     # Shared access grants, SHA-256 invite RPCs, RBAC RLS
│       └── 003_smart_notifications_and_cron.sql # Notification prefs, idempotency table, pg_cron schedule
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── lib/
│   │   └── supabaseClient.js                 # Safe Supabase client initialization
│   ├── services/
│   │   ├── authService.js                    # Salted SHA-256 & Supabase Auth + brute-force protection
│   │   ├── careConnectService.js             # Database CRUD & shared patient context resolution
│   │   ├── accessControlService.js           # Cryptographic single-use invite generation & verification
│   │   └── smartNotificationService.js       # Timezone formatting & medical safety constants
│   ├── components/
│   │   ├── common/                           # Button.jsx, SectionHeading.jsx, ErrorBoundary.jsx
│   │   ├── layout/                           # Navbar.jsx, Footer.jsx
│   │   ├── home/                             # Hero.jsx, Features.jsx, HowItWorks.jsx
│   │   └── dashboard/                        # DashboardLayout, OverviewTab, MedicationsTab,
│   │                                         # AppointmentsTab, FamilyCaregiversTab,
│   │                                         # AdherenceReportsTab, PatientProfileTab, NotificationsTab
│   └── pages/
│       ├── HomePage.jsx
│       ├── AuthPage.jsx
│       └── DashboardApp.jsx
└── tests/
    └── careconnect.test.mjs                  # Automated verification suite
```

---

## Quick Start & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Tests
```bash
npm test
```

### 3. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

## Supabase Cloud & Resend Email Setup (Optional for Cloud Mode)

1. **Copy Environment Variables**:
   Copy `.env.example` to `.env` and fill in your **Supabase Project URL** and **Publishable (`anon`) Key** from **Supabase Dashboard -> Project Settings -> API**:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
   ```
   *(Security Rule: NEVER place your `service_role` or `secret` key in `.env` or frontend code!)*

2. **Run Database Migrations**:
   In the **Supabase SQL Editor**, run the 3 migration scripts in order:
   1. `supabase/migrations/001_careconnect_schema.sql`
   2. `supabase/migrations/002_secure_access_and_rls.sql`
   3. `supabase/migrations/003_smart_notifications_and_cron.sql`

3. **Deploy the Smart Notifications Edge Function**:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_resend_api_key
   supabase secrets set CRON_SECRET=your_random_cron_secret
   supabase secrets set NOTIFICATION_FROM_EMAIL="CareConnect Alerts <alerts@yourdomain.com>"
   supabase functions deploy smart-notifications
   ```

---

## Hackathon Demo Walkthrough
1. **Landing Page (`http://localhost:5173/`)**: Show the senior-accessible design, responsive mobile drawer, and interactive Hero medication preview card.
2. **Authentication & Security (`AuthPage`)**:
   - Attempt signing in with an unregistered email (`stranger@test.com`) to demonstrate credential verification and brute-force lockout counting.
   - Switch to **Register New Account**, create a real account (e.g., `ramesh@example.com` with an 8+ char alphanumeric password), and sign in.
3. **Medications & Adherence (`Medications` & `Adherence Reports` tabs)**:
   - Add a new prescription, mark doses as **Taken** or **Missed**, and show how duplicate dose logs are prevented for the same medication on the same day.
4. **Role-Based Access & Invitations (`Family & Caretakers` tab)**:
   - Generate a cryptographically random single-use invite code (`CC-XXXX-XXXX-XXXX`), verify it in the backend verification box, and then click verify a second time to show `CODE_ALREADY_USED` replay protection.
   - Switch the active server role to `family_member` and attempt to delete a medication or revoke a grant to watch RLS block the request and record a `CRITICAL` entry in the **Immutable Security Audit Log**.
5. **Smart Notification Engine (`Notifications` tab)**:
   - Change the patient's IANA timezone, trigger a Medication Reminder (status changes to `Pending`, never `Missed`) and an Unconfirmed Caregiver Alert (status changes to `Unconfirmed / Overdue`), and click twice to demonstrate `idempotency_key` duplicate-email prevention.

