// Shared unread state for the support chat.
//
// The floating chat bubble and the chat window are separate pieces of UI, so
// they need a common place to remember how many messages have not been seen
// yet. The state is stored per identity (role + user id) in localStorage so it
// survives a page reload, and subscribers are notified on every change.

const STORAGE_KEY = "hacienda-amara-chat-unread-v1";
const EMPTY_STATE = { total: 0, conversations: {} };

const listeners = new Set();
let version = 0;
const snapshotCache = new Map();

const readStore = () => {
	if (typeof window === "undefined") return {};
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
};

const writeStore = (store) => {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch {
		// Storage can be unavailable in private browsing; the in-memory
		// listeners still work for the current session.
	}
};

export const getIdentityKey = (role, userId) => `${role || "guest"}:${userId || "anonymous"}`;

// Returns a stable object reference for the identity so it can be used with
// useSyncExternalStore without causing an infinite render loop.
export const getUnreadState = (identityKey) => {
	const cached = snapshotCache.get(identityKey);
	if (cached && cached.version === version) return cached.state;

	const store = readStore();
	const state = store[identityKey];
	const next = {
		total: Number(state?.total) || 0,
		conversations: state?.conversations && typeof state.conversations === "object" ? state.conversations : {},
	};
	snapshotCache.set(identityKey, { version, state: next });
	return next;
};

export const setUnreadState = (identityKey, updater) => {
	const store = readStore();
	const current = getUnreadState(identityKey);
	const next = typeof updater === "function" ? updater(current) : updater;
	const total = Number(next?.total) || 0;
	const conversations = {};
	for (const [key, value] of Object.entries(next?.conversations || {})) {
		const count = Number(value) || 0;
		if (count > 0) conversations[key] = count;
	}
	store[identityKey] = { total, conversations, updatedAt: Date.now() };
	writeStore(store);
	notify();
	return { total, conversations };
};

export const incrementUnread = (identityKey, conversationKey, amount = 1) =>
	setUnreadState(identityKey, (current) => {
		const conversations = { ...current.conversations };
		conversations[conversationKey] = (Number(conversations[conversationKey]) || 0) + amount;
		const total = Object.values(conversations).reduce((sum, count) => sum + (Number(count) || 0), 0);
		return { total, conversations };
	});

export const clearUnread = (identityKey, conversationKey) =>
	setUnreadState(identityKey, (current) => {
		if (!conversationKey) return { total: 0, conversations: {} };
		const conversations = { ...current.conversations };
		delete conversations[conversationKey];
		const total = Object.values(conversations).reduce((sum, count) => sum + (Number(count) || 0), 0);
		return { total, conversations };
	});

export const subscribeUnread = (callback) => {
	listeners.add(callback);
	return () => listeners.delete(callback);
};

const notify = () => {
	version += 1;
	for (const listener of listeners) {
		try {
			listener();
		} catch {
			// A broken subscriber must not break the others.
		}
	}
};

// Also refresh subscribers when the state changes in another tab.
if (typeof window !== "undefined") {
	window.addEventListener("storage", (event) => {
		if (event.key === STORAGE_KEY) notify();
	});
}

export const UNREAD_STORAGE_KEY = STORAGE_KEY;
export { EMPTY_STATE };
