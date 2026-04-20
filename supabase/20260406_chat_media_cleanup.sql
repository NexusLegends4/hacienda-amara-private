-- SQL Editor only.
-- Do NOT paste this into the Edge Function editor.
-- Schedules cleanup of chat messages and uploaded media older than 24 hours.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select
	cron.schedule(
		'cleanup-chat-media-every-15-minutes',
		'*/15 * * * *',
		$$
		select
			net.http_post(
				url := 'https://amobzzxmzepvznkgmiwh.supabase.co/functions/v1/cleanup-chat-media',
				headers := jsonb_build_object(
					'Content-type', 'application/json',
					'Authorization', 'Bearer <sb_publishable_kSqEqdr6lpdqz1f43hJ1rA_AB4J-oIa
>'
				),
				body := jsonb_build_object(
					'source', 'cron',
					'run_at', now()
				)
			) as request_id;
		$$
	);