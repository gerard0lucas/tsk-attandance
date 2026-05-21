# TSK Attendance

Branch-based student attendance with QR scanning. React + Vite + Supabase.

## Roles

- **Admin** — branches, managers, all students, reports
- **Manager** — scan QR, manage students, reports

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Providers → Email**: turn off “Confirm email” for internal use (or managers must confirm before login).
3. **SQL Editor**: run the full script in [`supabase/schema.sql`](supabase/schema.sql).
4. **Authentication → Users → Add user**: create your admin (email + password).
5. Copy the user **UUID** from the users table, then run:

```sql
insert into public.profiles (id, email, name, role)
values ('YOUR_USER_UUID', 'admin@tsk.org', 'System Administrator', 'admin');
```

6. Copy **Project URL** and **anon public** key from **Settings → API**.

### 3. Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Use the **Project URL** from **Settings → API** (e.g. `https://abcdefgh.supabase.co`). Do **not** add `/rest/v1` — the app adds that automatically.

### 4. Run locally

```bash
npm run dev
```

Sign in with the admin user you created.

## Deploy (Netlify)

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables: same `VITE_SUPABASE_*` keys
- SPA routing: `public/_redirects` is included (`/* /index.html 200`)

## Managers

Admins create managers in **Managers** with email + password. Passwords are hashed by Supabase Auth.

In **Authentication → Providers → Email**, turn off **Confirm email** so new managers are not sent verification emails.

If sign-up is rate-limited, add the user manually in **Authentication → Users** (enable **Auto Confirm User**), then set their profile role to `manager` in SQL.

## Storage

Student photos are stored in the `student-photos` bucket (public read). Created by `schema.sql`.

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Development server |
| `npm run build`| Production build   |
| `npm run lint` | ESLint             |
