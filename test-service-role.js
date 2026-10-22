// Test script to verify Supabase service role key and chat setup
// Run this in browser console on the chat page

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sbdohxwwvhajqwvwfpnk.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZG9oeHd3dmhjanF3dndmcG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYxMjk2OSwiZXhwIjoyMDkyMTg4OTY5fQ.Rxt4tO_eaqXu62g1lTcXjdGqOefol83LoFi3SHU69k0';

async function testServiceRole() {
  console.log('=== Testing Service Role Key ===');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  
  try {
    // Test 1: Check if we can query profiles table
    console.log('Test 1: Querying profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, firstname, lastname, role')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Profiles query failed:', profilesError);
      return;
    }
    console.log('✅ Profiles query succeeded:', profiles);
    
    // Test 2: Check if we can query chat_messages table
    console.log('Test 2: Querying chat_messages table...');
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(5);
    
    if (messagesError) {
      console.error('❌ Chat messages query failed:', messagesError);
      return;
    }
    console.log('✅ Chat messages query succeeded:', messages);
    
    // Test 3: Check if we can insert into chat_messages
    console.log('Test 3: Testing chat_messages insert...');
    const testMessage = {
      id: 'test-' + Date.now(),
      conversation_key: 'guest',
      sender_id: 'guest',
      sender_role: 'client',
      sender_name: 'Test User',
      content: 'Test message',
      created_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('chat_messages')
      .insert(testMessage)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Chat messages insert failed:', insertError);
      return;
    }
    console.log('✅ Chat messages insert succeeded:', insertData);
    
    // Clean up test message
    await supabase.from('chat_messages').delete().eq('id', testMessage.id);
    console.log('✅ Test message cleaned up');
    
    console.log('=== All Tests Passed ===');
    
  } catch (err) {
    console.error('=== Test Failed ===');
    console.error(err);
  }
}

// Run the test
testServiceRole();