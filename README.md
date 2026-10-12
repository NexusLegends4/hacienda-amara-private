# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Supabase Chat Media Setup

To make chat photos and videos visible on different devices, the app uploads them to Supabase Storage.

1. Open `supabase/20260406_chat_media.sql` and run it in the Supabase SQL editor.
2. In the Supabase dashboard, open `Edge Functions` and deploy a new function named `cleanup-chat-media`.
3. Paste the TypeScript from `supabase/functions/cleanup-chat-media/index.ts` into the function editor, then deploy it.
4. Open `supabase/20260406_chat_media_cleanup.sql`, replace `<YOUR_SUPABASE_ANON_KEY>` with your public anon key, and run it in the Supabase SQL editor.
5. If you want a different bucket name, set `VITE_SUPABASE_CHAT_MEDIA_BUCKET` in your `.env` file.

Example:

```env
VITE_SUPABASE_CHAT_MEDIA_BUCKET=chat-media
```

If the bucket is missing or not writable yet, photo/video sending will fail instead of posting a private-only preview, so the chat stays honest about what other devices can see.

The cleanup job removes chat messages and uploaded media older than 24 hours, so the chat does not keep photos and videos forever.

## Staff and Admin Authenticator MFA

Staff and admin accounts use Supabase Auth's built-in TOTP MFA instead of email OTPs. Users can enroll with Google Authenticator, Microsoft Authenticator, or another compatible authenticator app; no Brevo API key or custom OTP Edge Function is needed.

1. In Supabase **Authentication settings**, enable the **Authenticator App (TOTP)** factor and make sure MFA verification is enabled.
2. Deploy the updated frontend, then run `supabase/20261012_staff_admin_totp_mfa.sql` in the Supabase SQL Editor. This migration requires AAL2 for staff/admin access to RLS-protected public tables while still allowing a user to read their own profile during enrollment. The service-role Vercel endpoints for staff account creation and reservation notifications also require an AAL2 access token.
3. On their next sign-in, staff and admins scan the displayed QR code with their authenticator app and enter the generated code. Later sign-ins ask for a fresh code.
4. After the updated frontend is live, delete the old `create-login-otp` and `verify-login-otp` Edge Functions in Supabase and remove the old Brevo function secrets. Keep the historical `20261007_login_otps_table.sql` migration; after both old functions are deleted, the unused `login_otps` table can be dropped separately if desired.

Before treating MFA as enforced for all database access, run this audit in the Supabase SQL Editor and review any returned tables. The migration does not enable RLS on other tables because doing so without their intended access policies can break the app:

```sql
select n.nspname as schema_name, c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity
order by c.relname;
```

Users who lose access to their authenticator app will need an administrator to remove/reset their MFA factor in Supabase Auth before they can enroll again. The setup key is a secret; users should not share or store it in public notes.

## Guest Reservation Email Notifications

Run `supabase/20260907_guest_reservation_notifications.sql` in the Supabase SQL Editor. For guests without an account to receive accepted or rejected reservation emails through Mailtrap, add these Vercel environment variables:

```env
MAILTRAP_API_TOKEN=your_mailtrap_api_token
MAILTRAP_FROM_EMAIL=your-verified-sender@example.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The `MAILTRAP_API_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY` must remain server-side. The notification API accepts requests only from authenticated admin or staff users. `MAILTRAP_FROM_EMAIL` must be an approved sender in the Mailtrap sending domain.

## Staff and Admin Account Creation

To let administrators create staff or admin accounts from `Manage Staff`, run `supabase/20260907_admin_account_creation.sql` after the staff access migration. Add these Vercel environment variables:

```env
SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service role key is server-only and must never be exposed as a `VITE_` variable.

## Booking Analytics and AI Forecast

Staff and administrators can open **Booking Analytics** from the navigation menu. It compares the last 12 completed months of bookings, highlights the highest and lowest months, and forecasts the next 3 months using aggregated counts from up to 36 months of Supabase reservation history. It combines live reservations with imported schedule entries and groups by booking/check-in date. Pending, confirmed, and cancelled live reservations are included. Incomplete and future months are excluded from historical totals and AI training.

To import the provided date/package schedule, run `supabase/20261012_historical_bookings_import.sql` in the Supabase SQL Editor. It creates a restricted `historical_bookings` table and inserts 666 package/date entries (276 overnight, 202 day tour, 188 night tour). If a date lists multiple packages, each package is stored as one booking. The SQL is safe to run more than once and does not invent guest names, contact details, prices, or statuses. The provided schedule has no January 2026 entries; those dates will count as zero unless you add data for that month.

Configure these server-side Vercel environment variables for the `/api/booking-analytics` endpoint:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
```

In Vercel, open the project **Settings → Environment Variables**, add `GROQ_API_KEY` with your Groq API key, and select the environments where you deploy (Production, and Preview if applicable). Keep it server-side—do not use the `VITE_` prefix. Redeploy after saving environment variables so the serverless function receives the new value, then refresh Booking Analytics. If the key is missing or Groq is unavailable, historical analytics still load and the dashboard shows a forecast-specific message.

The endpoint only accepts staff/admin access tokens with AAL2 MFA completed. It sends monthly booking counts—not guest names or contact details—to Groq for a forecast. Predictions are estimates, not guarantees. Keep all three values server-side; never prefix the service role key or Groq key with `VITE_`.
