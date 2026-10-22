# Chat System Fixes for All Users

## Summary of Changes

This document summarizes the changes made to ensure the chat system works for all user types: guests (anonymous), clients, staff, and admins.

## Issues Fixed

### 1. Guest Conversation Key Mismatch
**Problem**: The frontend generated random conversation keys for guests (e.g., `customer-xxxxx`), but the database policies only allowed the conversation key `'guest'` for anonymous users.

**Solution**: Updated `getCustomerConversationKey()` in `src/pages/Chat.jsx` to always return `'guest'` for anonymous users, matching the database policies.

### 2. Database Policies
**Problem**: The existing RLS policies didn't properly handle all user types, especially guests.

**Solution**: Created a new migration file `supabase/20261021_fix_chat_policies_for_all_users.sql` that:
- Updates `chat_messages` table policies for SELECT, INSERT, UPDATE, DELETE
- Adds proper storage policies for `chat-media` bucket
- Ensures admins/staff can access all conversations
- Ensures clients can only access their own conversations
- Ensures guests can only access the 'guest' conversation

### 3. API Endpoint Updates
**Problem**: The `/api/chat-message.js` endpoint rejected guest messages because it expected `conversationKey === user.id`.

**Solution**: Updated the validation logic to accept `'guest'` as a valid conversation key for anonymous users.

### 4. AI Chat API Updates
**Problem**: The `/api/ai-chat.js` endpoint didn't handle guest users properly for conversation key lookups and rate limiting.

**Solution**: 
- Added `isGuest` flag detection
- Used `'guest'` as conversation key for anonymous users
- Updated rate limiting to use `'guest'` as identifier for anonymous users

## Files Modified

### Frontend Changes
1. `src/pages/Chat.jsx` - Updated `getCustomerConversationKey()` to return `'guest'` for anonymous users

### Backend API Changes
1. `api/chat-message.js` - Updated validation to accept `'guest'` conversation key
2. `api/ai-chat.js` - Added proper guest user handling for conversation keys and rate limiting

### Database Migration
1. `supabase/20261021_fix_chat_policies_for_all_users.sql` - Comprehensive policy updates for chat_messages and chat-media storage

## User Type Support

### Guests (Anonymous Users)
- Use Supabase anonymous authentication
- Conversation key: `'guest'`
- Can send/receive messages
- Get bot/AI responses
- Chat history stored in localStorage and synced to database

### Clients (Authenticated Users)
- Use their user ID as conversation key
- Can send/receive messages
- Get bot/AI responses
- Full chat history persistence

### Staff
- Can view all client conversations
- Can reply to client messages
- Require verified sign-in (AAL2)
- See real-time typing indicators

### Admins
- Same permissions as staff
- Can manage all conversations
- Can delete any messages
- See admin availability status

## Testing

All existing tests pass (105 tests in 15 test files).

## Deployment Notes

1. Run the new migration `20261021_fix_chat_policies_for_all_users.sql` in Supabase SQL editor
2. Ensure Supabase Anonymous Sign-Ins are enabled: Authentication → Sign In / Providers → Anonymous Sign-Ins
3. Deploy the updated frontend and API endpoints
4. Test with all user types: guest, client, staff, admin

## Verification Checklist

- [ ] Guests can start chat without signing in
- [ ] Guests receive bot responses
- [ ] Guests can see their chat history on page refresh
- [ ] Clients can chat and see history
- [ ] Staff can see all conversations
- [ ] Staff can reply to clients
- [ ] Admins have full access
- [ ] Real-time updates work for all types
- [ ] AI responses work for guests and clients
- [ ] Rate limiting works correctly
- [ ] Media attachments work (for bot responses)