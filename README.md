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

## Guest Reservation Email Notifications

Run `supabase/20260907_guest_reservation_notifications.sql` in the Supabase SQL Editor. For guests without an account to receive accepted or rejected reservation emails through Mailtrap, add these Vercel environment variables:

```env
MAILTRAP_API_TOKEN=your_mailtrap_api_token
MAILTRAP_FROM_EMAIL=your-verified-sender@example.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The `MAILTRAP_API_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY` must remain server-side. The notification API accepts requests only from authenticated admin or staff users. `MAILTRAP_FROM_EMAIL` must be an approved sender in the Mailtrap sending domain.
