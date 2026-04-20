export const recordAuthNotification = async (
	supabase,
	{ eventType, profileId, name = "", email = "" },
) => {
	if (!supabase || !profileId || !eventType) return;

	const { error } = await supabase.from("auth_notifications").insert({
		event_type: eventType,
		actor_profile_id: profileId,
		actor_name: name,
		actor_email: email,
	});

	if (error) {
		console.warn(`Unable to save ${eventType} notification:`, error.message || error);
	}
};
