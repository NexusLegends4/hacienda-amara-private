import { recordAuthNotification } from "./authNotifications.js";

export async function recordAuthNotification(supabaseClient, payload) {
  return recordAuthNotification(supabaseClient, {
    eventType: payload.eventType,
    profileId: payload.profileId,
    name: payload.name,
    email: payload.email,
  });
}