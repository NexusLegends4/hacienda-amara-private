-- Stress test performance indexes
-- Run in Supabase SQL Editor

-- Reservations table
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON public.reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_room_type ON public.reservations(room_type);
CREATE INDEX IF NOT EXISTS idx_reservations_profile ON public.reservations(profile_id);

-- Notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_profile_read ON public.notifications(profile_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_key);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.reviews(created_at DESC);

-- Auth notifications
CREATE INDEX IF NOT EXISTS idx_auth_notifications_created ON public.auth_notifications(created_at DESC);