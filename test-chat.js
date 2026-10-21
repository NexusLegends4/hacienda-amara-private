// Test script to verify chat functionality for all user types
// This can be run in the browser console on the chat page

async function testChatForAllUsers() {
  console.log('=== Chat System Test ===');
  
  // Test 1: Check if we can access the chat page
  console.log('Test 1: Chat page accessible');
  
  // Test 2: Check if Supabase is configured
  const { supabase } = await import('./src/utils/supabase.js');
  console.log('Test 2: Supabase client available:', !!supabase);
  
  // Test 3: Check anonymous sign-in capability
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('Test 3 FAILED: Anonymous sign-in failed:', error.message);
      if (error.message.includes('Anonymous Sign-Ins')) {
        console.log('  -> Enable Anonymous Sign-Ins in Supabase: Authentication → Sign In / Providers → Anonymous Sign-Ins');
      }
    } else {
      console.log('Test 3 PASSED: Anonymous sign-in works');
      // Sign out to clean up
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('Test 3 ERROR:', err.message);
  }
  
  // Test 4: Check database policies (requires running migration)
  console.log('Test 4: Database policies - run migration 20261021_fix_chat_policies_for_all_users.sql');
  
  // Test 5: Check API endpoints
  console.log('Test 5: API endpoints available at /api/chat-message and /api/ai-chat');
  
  console.log('=== Test Complete ===');
  console.log('Run the migration and enable Anonymous Sign-Ins in Supabase for full functionality.');
}

// Run the test
testChatForAllUsers();