import React, { useContext, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { supabase } from "../utils/supabase";
import { useNavigate } from "react-router-dom";
import { FaPalette, FaBell, FaShieldAlt, FaSlidersH } from "react-icons/fa";
import { FiLock, FiRefreshCw } from "react-icons/fi";

const DEFAULT_THEME = "light";

const getEffectiveTheme = (theme) => {
	if (theme !== "system") {
		return theme;
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const Settings = () => {
	const { session, profile, setProfile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [theme, setTheme] = useState(
		localStorage.getItem("theme") || DEFAULT_THEME,
	);
	const [emailNotifications, setEmailNotifications] = useState(
		localStorage.getItem("emailNotifications") === "true",
	);
	const [profileVisibility, setProfileVisibility] = useState(
		localStorage.getItem("profileVisibility") || "public",
	);
	const [compactMode, setCompactMode] = useState(
		localStorage.getItem("compactMode") === "true",
	);
	const [role, setRole] = useState(profile?.role || "staff");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	useEffect(() => {
		if (profile?.role) {
			setRole(profile.role);
		}
	}, [profile]);

	useEffect(() => {
		// Guard the settings page so only signed-in users can open it.
		if (!session) {
			navigate("/log-in");
		}
	}, [session, navigate]);

	useEffect(() => {
		const effectiveTheme = getEffectiveTheme(theme);
		document.documentElement.setAttribute("data-theme", effectiveTheme);
		document.documentElement.style.colorScheme = effectiveTheme;
	}, [theme]);

	const handleSavePreferences = async (event) => {
		// Persist the preference toggles locally and keep the theme in sync.
		event.preventDefault();
		localStorage.setItem("theme", theme);
		localStorage.setItem("emailNotifications", String(emailNotifications));
		localStorage.setItem("profileVisibility", profileVisibility);
		localStorage.setItem("compactMode", String(compactMode));

		if (!session?.user?.id) {
			alert("No active session found.");
			return;
		}

		// Only admins can change their own role here.
		if (profile?.role === "admin" && role !== profile.role) {
			const { data, error } = await supabase
				.from("profiles")
				.update({ role })
				.eq("id", session.user.id)
				.select()
				.single();

			if (error) {
				alert(error.message || error);
				return;
			}

			if (data) {
				setProfile(data);
			}
		}

		alert("Settings saved.");
	};

	const handleResetPreferences = () => {
		setTheme(DEFAULT_THEME);
		localStorage.setItem("theme", DEFAULT_THEME);
		setEmailNotifications(true);
		setProfileVisibility("public");
		setCompactMode(false);
		setRole(profile?.role || "staff");
		localStorage.setItem("emailNotifications", "true");
		localStorage.setItem("profileVisibility", "public");
		localStorage.setItem("compactMode", "false");
		const effectiveTheme = getEffectiveTheme(DEFAULT_THEME);
		document.documentElement.setAttribute("data-theme", effectiveTheme);
		document.documentElement.style.colorScheme = effectiveTheme;
	};

	const handlePasswordChange = async (event) => {
		// Update the auth password after validating both password fields.
		event.preventDefault();

		if (!newPassword || newPassword.length < 8) {
			alert("New password must be at least 8 characters.");
			return;
		}

		if (newPassword !== confirmPassword) {
			alert("New password and confirm password do not match.");
			return;
		}

		const { error } = await supabase.auth.updateUser({
			password: newPassword,
		});

		if (error) {
			alert(error.message || error);
			return;
		}

		setNewPassword("");
		setConfirmPassword("");
		alert("Password updated.");
	};

	return (
		<MainLayout>
			{/* Settings page is split into preferences and security panels. */}
			<div className="min-h-screen bg-base-200 px-4 py-12">
				<div className="mx-auto max-w-7xl space-y-12">
					<div>
						<button
							type="button"
							onClick={() => navigate(-1)}
							className="btn btn-black rounded-full"
						>
							Back
						</button>
					</div>

					<div className="rounded-3xl border border-base-300 bg-base-100 p-12 shadow-sm md:p-14">
						<div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.35em] text-base-content/60">
									Account Settings
								</p>
								<h1 className="mt-4 text-3xl font-semibold leading-tight text-base-content md:text-4xl">
									{profile?.firstname} {profile?.lastname}
								</h1>
								<p className="mt-4 max-w-xl leading-relaxed text-base-content/70">
									Fine-tune the essentials for your account, privacy, and
									security.
								</p>
							</div>
							<div className="grid gap-3 text-sm text-base-content/70 md:text-right">
								<div className="inline-flex items-center gap-2 rounded-full bg-base-200 px-4 py-2">
									<FaSlidersH className="text-base-content/60" />
									<span>4 saved preferences</span>
								</div>
								<div className="inline-flex items-center gap-2 rounded-full bg-base-200 px-4 py-2">
									<FiLock className="text-base-content/60" />
									<span>Password controls enabled</span>
								</div>
							</div>
						</div>
					</div>

					<div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
						<form
							onSubmit={handleSavePreferences}
							className="rounded-3xl border border-base-300 bg-base-100 p-12 shadow-sm"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
									<FaPalette />
								</div>
								<div>
									<h2 className="text-xl font-semibold">Preferences</h2>
									<p className="text-sm text-base-content/60">
										Personalize how the app looks and behaves.
									</p>
								</div>
							</div>

							<div className="mt-12 space-y-6">
								<label className="flex items-center justify-between rounded-2xl border border-base-300 px-5 py-5 transition hover:border-base-400">
									<div>
										<span className="block font-medium text-base-content">
											Theme
										</span>
										<span className="text-sm text-base-content/60">
											Switch between light and dark appearance.
										</span>
									</div>
									<select
										className="select select-bordered select-sm w-36"
										value={theme}
										onChange={(event) => setTheme(event.target.value)}
									>
										<option value="system">System</option>
										<option value="light">Light</option>
										<option value="dark">Dark</option>
									</select>
								</label>

								<label className="flex items-center justify-between rounded-2xl border border-base-300 px-5 py-5 transition hover:border-base-400">
									<div className="pr-4">
										<div className="flex items-center gap-2">
											<FaBell className="text-base-content/60" />
											<span className="block font-medium text-base-content">
												Email notifications
											</span>
										</div>
										<span className="mt-1 block text-sm text-base-content/60">
											Get helpful updates about your account and events.
										</span>
									</div>
									<input
										type="checkbox"
										className="toggle toggle-primary"
										checked={emailNotifications}
										onChange={(event) =>
											setEmailNotifications(event.target.checked)
										}
									/>
								</label>

								<label className="flex items-center justify-between rounded-2xl border border-base-300 px-5 py-5 transition hover:border-base-400">
									<div className="pr-4">
										<div className="flex items-center gap-2">
											<FaShieldAlt className="text-base-content/60" />
											<span className="block font-medium text-base-content">
												Profile visibility
											</span>
										</div>
										<span className="mt-1 block text-sm text-base-content/60">
											Choose who can see your profile details.
										</span>
									</div>
									<select
										className="select select-bordered select-sm w-36"
										value={profileVisibility}
										onChange={(event) =>
											setProfileVisibility(event.target.value)
										}
									>
										<option value="public">Public</option>
										<option value="private">Private</option>
									</select>
								</label>

								<label className="flex items-center justify-between rounded-2xl border border-base-300 px-5 py-5 transition hover:border-base-400">
									<div className="pr-4">
										<div className="flex items-center gap-2">
											<FiRefreshCw className="text-base-content/60" />
											<span className="block font-medium text-base-content">
												Compact mode
											</span>
										</div>
										<span className="mt-1 block text-sm text-base-content/60">
											Use a denser layout on smaller screens.
										</span>
									</div>
										<input
										type="checkbox"
										className="toggle toggle-primary"
										checked={compactMode}
										onChange={(event) => setCompactMode(event.target.checked)}
									/>
								</label>

								{profile?.role === "admin" ? (
									<label className="flex items-center justify-between rounded-2xl border border-base-300 px-5 py-5 transition hover:border-base-400">
										<div className="pr-4">
											<div className="flex items-center gap-2">
												<FaShieldAlt className="text-base-content/60" />
												<span className="block font-medium text-base-content">
													Account role
												</span>
											</div>
											<span className="mt-1 block text-sm text-base-content/60">
												Change your role in the system.
											</span>
										</div>
										<select
											className="select select-bordered select-sm w-36"
											value={role}
											onChange={(event) => setRole(event.target.value)}
										>
											<option value="client">Client</option>
											<option value="admin">Admin</option>
										</select>
									</label>
								) : (
									<div className="rounded-2xl border border-base-300 bg-base-50 px-5 py-5">
										<div className="flex items-center gap-2">
											<FaShieldAlt className="text-base-content/60" />
											<span className="block font-medium text-base-content">
												Account role
											</span>
										</div>
										<span className="mt-2 block text-sm text-base-content/60">
											Your role is managed separately by administrators.
										</span>
										<p className="mt-2 text-sm font-semibold text-base-content">
											{profile?.role === "admin" ? "Administrator" : "Client"}
										</p>
									</div>
								)}
							</div>

							<div className="mt-18 border-t border-base-200 pt-8">
								<div className="flex flex-wrap gap-5">
									<button
										type="submit"
										className="btn btn-black rounded-full px-6"
									>
										Save changes
									</button>
									<button
										type="button"
										onClick={handleResetPreferences}
										className="btn btn-black rounded-full px-6"
									>
										Reset defaults
									</button>
								</div>
							</div>
						</form>

						<form
							onSubmit={handlePasswordChange}
							className="rounded-3xl border border-base-300 bg-base-100 p-12 shadow-sm"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/15 text-secondary">
									<FiLock />
								</div>
								<div>
									<h2 className="text-xl font-semibold">Security</h2>
									<p className="text-sm text-base-content/60">
										Update your password and keep your account protected.
									</p>
								</div>
							</div>

							<div className="mt-14 ml-4 space-y-12 md:ml-8">
								<label className="form-control max-w-2xl">
									<div className="label">
										<span className="label-text">New password</span>
									</div>
									<input
										type="password"
										className="input input-ghost border-0 border-b border-base-300 rounded-none px-0 pr-3 focus:outline-none focus:border-primary"
										value={newPassword}
										onChange={(event) => setNewPassword(event.target.value)}
										placeholder="Enter new password"
									/>
								</label>

								<label className="form-control max-w-2xl">
									<div className="label">
										<span className="label-text">Confirm new password</span>
									</div>
									<input
										type="password"
										className="input input-ghost border-0 border-b border-base-300 rounded-none px-0 pr-3 focus:outline-none focus:border-primary"
										value={confirmPassword}
										onChange={(event) => setConfirmPassword(event.target.value)}
										placeholder="Confirm new password"
									/>
								</label>

								<div className="rounded-2xl bg-base-200 p-6 text-sm leading-relaxed text-base-content/70">
									Use at least 8 characters and a mix of letters and numbers.
								</div>

								<button
									type="submit"
									className="btn btn-black rounded-full px-6"
								>
									Update password
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default Settings;
