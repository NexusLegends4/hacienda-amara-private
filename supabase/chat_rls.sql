-- Chat Messages RLS (Row Level Security) for Privacy
-- Run this in Supabase SQL Editor

-- Enable RLS on chat_messages table
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can see their own messages (by conversation_key matching their profile)
CREATE POLICY "Users can view own conversations" ON chat_messages
  FOR SELECT USING (
    auth.uid()::text = sender_id 
    OR conversation_key = ('customer-' || auth.uid())::text
    OR auth.jwt() ->> 'role' IN ('admin', 'staff')
  );

-- Policy 2: Users can insert their own messages
CREATE POLICY "Users can insert own messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid()::text = sender_id 
    OR auth.jwt() ->> 'role' IN ('admin', 'staff')
  );

-- Policy 3: Admins/Staff can view all messages
CREATE POLICY "Admins can view all" ON chat_messages
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'staff')
  );

-- Policy 4: Admins/Staff can insert messages (for bot replies, etc.)
CREATE POLICY "Admins can insert all" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'staff')
  );

-- Also enable RLS on profiles if not already
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: users can see their own, admins see all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR auth.jwt() ->> 'role' IN ('admin', 'staff'));

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);