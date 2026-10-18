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

To store the optional contact number shown in Edit Profile, run
`supabase/20261012_profile_contact_number.sql` in the Supabase SQL Editor.

Chat messages and media are stored in Supabase so clients, guests, staff, and admins can revisit a conversation. Guest chats use Supabase anonymous sign-in; guests do not need to create a visible account. Enable **Anonymous Sign-Ins** in Supabase **Authentication → Sign In / Providers**. Chat videos are converted in the browser to full-resolution, high-quality H.264/AAC MP4 before upload so they play on common browsers. The first conversion loads the self-hosted FFmpeg WebAssembly core (about 31 MiB); source and license details are served from `/ffmpeg/SOURCE.txt`.

1. Run `supabase/20260406_chat_media.sql` and the existing chat message migrations, including `supabase/20261004_staff_chat_access.sql`.
2. Run `supabase/20261012_staff_admin_totp_mfa.sql` and `supabase/20261012_staff_email_otp_auth.sql` if they have not already been applied.
3. Run `supabase/20261013_secure_chat_media.sql`. It makes the `chat-media` bucket private and restricts access to the conversation owner and verified staff/admin users.
4. Keep the bucket name `chat-media`. On Supabase Free, the app accepts JPEG, PNG, WebP, and GIF images up to 10 MB and MP4/WebM videos up to 50 MiB. Run `supabase/20261017_chat_media_free_plan_limit.sql` to align the bucket limit. Supabase Free cannot upload files larger than 50 MB; upgrading to Pro or higher is required for larger videos.
5. Configure the existing scheduled cleanup job if you want to remove old chat media automatically.

If guest chat reports `Database error creating anonymous user`, run
`supabase/20261015_allow_anonymous_profile_email.sql` in the Supabase SQL Editor
after `supabase/20260415_auth_notifications.sql`. Anonymous Auth users have no
email, so their profile rows must allow a null email; the migration also keeps
signup notifications compatible with those rows.

To enforce chat moderation for every database insert, run
`supabase/20261015_chat_guardrails.sql` after the chat message, staff access,
and staff verification migrations. It installs the database guardrail trigger
and tightens chat insert policies. The shared browser/API rules live in
`src/utils/chat-moderation.js`; the AI endpoint validates the caller, reads
only that caller's chat context, and checks its complete response before returning it.
No new secrets or moderation tables are required. The chat API uses the
existing server-side Supabase service-role key, the Supabase anon-key
configuration, and server-side `GROQ_API_KEY` for AI replies. Keep all server
keys out of `VITE_` variables.

The cleanup job removes chat messages and uploaded media older than 24 hours. Uploads use signed URLs; video playback includes the browser's play/pause, timeline, and volume controls. If private storage or anonymous sign-in is not configured, the chat shows an error rather than claiming media was sent successfully.

## Staff and Admin Email or Authenticator Verification

After password or Google sign-in, staff and admins can choose either a six-digit code from an authenticator app or a one-time email code. Authenticator codes use Supabase TOTP. Email codes use Supabase Auth passwordless email sign-in; they do not require Brevo or custom OTP Edge Functions, but do require a verified account email and Supabase Auth email delivery to be configured. Email verification is less phishing-resistant than TOTP.

Password recovery uses the verified Supabase email-recovery session and does not ask for an authenticator code. Because Supabase's regular password-update endpoint requires AAL2 whenever MFA is enabled, the reset page calls `/api/reset-password`. That server endpoint accepts only a recent (30-minute) Supabase-verified email OTP/recovery session, validates it with Supabase Auth, and updates that same user's password through the server-side service-role client. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for the Vercel API; never expose the service-role key to the browser.

1. In Supabase **Authentication → Sign In / Providers**, enable email sign-in and configure email delivery. For reliable delivery to Gmail and other recipients, configure a verified SMTP sender under the Auth SMTP settings.
2. In **Authentication → Email Templates → Magic Link**, use your code-based template with `{{ .Token }}` so Supabase sends the branded verification email.
3. In Supabase **Authentication settings**, enable the **Authenticator App (TOTP)** factor if staff/admins should also be able to use authenticator apps.
4. Run `supabase/20261012_staff_admin_totp_mfa.sql` followed by `supabase/20261012_staff_email_otp_auth.sql` in the Supabase SQL Editor. The follow-up migration permits staff/admin RLS access for either AAL2 TOTP or a verified email OTP session; ordinary password-only AAL1 sessions remain blocked. The service-role Vercel endpoints accept the same two verified methods.
5. Deploy the updated frontend and API. At sign-in, staff/admins choose **Use authenticator app** or **Send a code to your account email**. Email code sign-in does not create new users.
6. After confirming both options work in production, remove any retired custom OTP Edge Functions and their Brevo secrets if they are no longer used.
6. After confirming both options work in production, remove any retired custom OTP Edge Functions and their Brevo secrets if they are no longer used.

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

Users who cannot access their email or authenticator app will need an administrator to help restore account access. Authenticator setup keys are secrets; users should not share or store them in public notes. Supabase's default email service may be restricted or rate-limited; use a configured SMTP provider if codes do not arrive reliably.

## Gmail Accounts and Philippine Phone Numbers

The system accepts account and guest contact email addresses ending in `@gmail.com` only. Philippine mobile numbers must use the international `+639XXXXXXXXX` format; local `09...` and other country codes are rejected for new or changed contact details. Existing records are not rewritten by the migration.

Run `supabase/20261018_gmail_philippine_phone_restrictions.sql` in the Supabase SQL Editor before deploying the matching frontend/API changes. The migration enforces the restrictions in Supabase Auth and on profile, guest reservation, and event registration changes, in addition to the form and API validation.

## PayMongo Booking Payments

The booking form creates a PayMongo-hosted checkout for 50% of the booking total plus the ₱2,000 refundable security deposit. The private reservation page also provides PayMongo checkout for the remaining balance, which is due at least one day before the stay. A successful PayMongo payment does not automatically approve the reservation; resort staff still confirm bookings.

1. In the PayMongo Dashboard, open **Settings → Developers** and copy the **Secret API key**. Use a test key (`sk_test_...`) while testing. After the checkout and webhook work in test mode, switch to your live secret key (`sk_live_...`).
2. Run `supabase/20261018_paymongo_booking_payments.sql`, then `supabase/20261018_paymongo_security_deposit_refunds.sql` in the Supabase SQL Editor.
3. In Vercel **Project → Settings → Environment Variables**, add these server-only variables:

   ```env
   PAYMONGO_SECRET_KEY=sk_test_your_secret_key
   PAYMONGO_WEBHOOK_SECRET=your_webhook_signing_secret
   APP_URL=https://your-production-domain
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   `APP_URL` should be your public site origin, without a trailing slash. Set test keys for Vercel Preview and live keys for Production. Never use `VITE_` for PayMongo or Supabase service-role secrets, and never share the secret keys in chat or source control.
4. In PayMongo **Settings → Webhooks**, register `https://your-production-domain/api/paymongo-webhook`, subscribe to `checkout_session.payment.paid`, and copy that webhook's signing secret into `PAYMONGO_WEBHOOK_SECRET`.
5. Enable the payment methods you want to accept in PayMongo, deploy the app, and test with PayMongo's test key and test payment methods before switching to live mode. The customer is redirected to PayMongo from booking and can retry from their private reservation notification page.

PayMongo's hosted checkout is created by `/api/paymongo-checkout`; only the signed webhook marks the payment as received. The API secret and webhook signing secret must remain server-side.
The Vercel API routes are not served by plain `vite`; use a Vercel Preview deployment or `vercel dev` to test the complete hosted checkout flow.

Reservation cancellation automatically submits a partial PayMongo refund for the security deposit only. The 50% down payment and any separately-paid balance are not refunded by this flow. If PayMongo cannot automatically accept the refund (for example, a legacy booking with no stored payment reference or a same-day Maya partial-refund restriction), the reservation is still cancelled and staff must review/refund it from the PayMongo Dashboard. Refunds are submitted on guest cancellation or staff/admin cancellation. For completed stays, MFA-verified staff/admin can submit the security-deposit refund from Manage Reservations after the check-out date and inspection. A refund can remain pending with PayMongo; the payment provider controls when funds appear in the customer's account. Typical PayMongo timelines are within 24 hours for GCash/Maya, real time for QR Ph payments under ₱50,000, and up to 30 days for cards. Maya partial refunds can only be submitted starting the day after payment. PayMongo transaction fees are not returned to the merchant. UBP Online Banking cannot be refunded through this API; contact PayMongo Support and arrange a manual transfer if that payment method is enabled later.

The refund API uses `PAYMONGO_SECRET_KEY` server-side and needs no separate credential. Run the refund migration before deploying the refund endpoints. The webhook stores the successful PayMongo payment ID required for partial refunds; payments made before that migration may require manual handling. Never test live refunds with real customer payments.

## Reservation Email Notifications

Reservation status emails are sent through Gmail SMTP. Enable 2-Step Verification on the sending Google account, then create a Google App Password for this application. Add these Vercel environment variables:

```env
GMAIL_USER=your-sending-gmail-address@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Keep `GMAIL_APP_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` server-side in Vercel; never use a Google account password or expose these values in frontend variables. The notification API accepts requests only from authenticated admin or staff users. Gmail has sending limits and is intended here for low-volume project notifications.

## Staff and Admin Account Creation

To let administrators create staff or admin accounts from `Manage Staff`, run `supabase/20260907_admin_account_creation.sql` after the staff access migration. Add these Vercel environment variables:

```env
SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service role key is server-only and must never be exposed as a `VITE_` variable.

## Booking Analytics and AI Forecast

Administrators can open **Booking Analytics** from the navigation menu. Staff cannot access the analytics page or its API. It compares the last 12 completed months of bookings, highlights the highest and lowest months, and forecasts the next 3 months using aggregated counts from up to 36 months of Supabase reservation history. It combines live reservations with imported schedule entries and groups by booking/check-in date. Pending, confirmed, and cancelled live reservations are included. Incomplete and future months are excluded from historical totals and AI training.

To import the provided date/package schedule, run `supabase/20261012_historical_bookings_import.sql` in the Supabase SQL Editor. It creates a restricted `historical_bookings` table and inserts 666 package/date entries (276 overnight, 202 day tour, 188 night tour). If a date lists multiple packages, each package is stored as one booking. The SQL is safe to run more than once and does not invent guest names, contact details, prices, or statuses. The provided schedule has no January 2026 entries; those dates will count as zero unless you add data for that month.

Configure these server-side Vercel environment variables for the `/api/booking-analytics` endpoint:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
```

In Vercel, open the project **Settings → Environment Variables**, add `GROQ_API_KEY` with your Groq API key, and select the environments where you deploy (Production, and Preview if applicable). Keep it server-side—do not use the `VITE_` prefix. Redeploy after saving environment variables so the serverless function receives the new value, then refresh Booking Analytics. If the key is missing or Groq is unavailable, historical analytics still load and the dashboard displays a historical trend estimate instead of an AI forecast.

The endpoint only accepts staff/admin access tokens verified with TOTP or email OTP. It sends monthly booking counts—not guest names or contact details—to Groq for a forecast. Predictions are estimates, not guarantees. Keep all three values server-side; never prefix the service role key or Groq key with `VITE_`.
