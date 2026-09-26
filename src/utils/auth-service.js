/**
 * Records an authentication event in the auth_notifications table.
 */
export async function recordAuthNotification(supabaseClient, payload) {
  const { error } = await supabaseClient.from('auth_notifications').insert({
    event_type: payload.eventType,
    actor_profile_id: payload.profileId,
    actor_name: payload.name,
    actor_email: payload.email,
  });

  if (error) console.error('Error recording notification:', error.message);
  return { error };
}