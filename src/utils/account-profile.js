export const normalizeAccountRole = (role) =>
	["admin", "staff", "client"].includes(role) ? role : "client";

export const getAccountDisplayName = (profile) =>
	[profile?.firstname, profile?.lastname].filter(Boolean).join(" ").trim() ||
	profile?.email ||
	`Unnamed ${normalizeAccountRole(profile?.role)}`;
