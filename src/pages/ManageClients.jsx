import React, { useCallback, useContext, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import {
	FiSearch,
	FiUsers,
	FiShield,
	FiSave,
	FiRefreshCw,
	FiTrash2,
	FiRotateCcw,
} from "react-icons/fi";
import DOMPurify from "dompurify";

const getInitials = (name) => {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getDisplayName = (profile) =>
	[profile?.firstname, profile?.lastname].filter(Boolean).join(" ").trim() ||
	profile?.email ||
	"Unnamed client";

const ManageClients = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [profiles, setProfiles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [roleFilter, setRoleFilter] = useState("client");
	const [statusFilter, setStatusFilter] = useState("active");
	const [selectedProfileId, setSelectedProfileId] = useState("");
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [status, setStatus] = useState("");
	const [form, setForm] = useState({
		firstname: "",
		lastname: "",
		email: "",
		role: "client",
	});

	useEffect(() => {
		if (!session) {
			navigate("/log-in");
			return;
		}

		if (profile && profile.role !== "admin") {
			navigate("/");
		}
	}, [session, profile, navigate]);

	const refreshProfiles = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from("profiles")
			.select("id, firstname, lastname, email, avatar_url, role, deleted_at, created_at")
			.order("created_at", { ascending: false });

		if (error) {
			setLoading(false);
			alert(error.message || error);
			return;
		}

		const nextProfiles = (data || []).slice().sort((left, right) => {
			const leftName = getDisplayName(left).toLowerCase();
			const rightName = getDisplayName(right).toLowerCase();

			return leftName.localeCompare(rightName);
		});

		setProfiles(nextProfiles);
		setLoading(false);

		if (nextProfiles.length > 0) {
			setSelectedProfileId((current) => current || nextProfiles[0].id);
		}
	}, []);

	useEffect(() => {
		if (profile?.role !== "admin") return;
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void refreshProfiles();

		// Real-time listener para sa anumang pagbabago sa profiles table
		const channel = supabase
			.channel("manage-clients-realtime")
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "profiles" },
				(payload) => {
					updateProfileCache(payload.new);
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [profile?.role, refreshProfiles]);

	const selectedProfile =
		profiles.find((entry) => entry.id === selectedProfileId) || null;
	const selectedIsDeleted = Boolean(selectedProfile?.deleted_at);
	const canDeleteSelected = Boolean(
		selectedProfile && selectedProfile.role !== "admin",
	);

	const selectProfile = (entry) => {
		setSelectedProfileId(entry.id);
		setStatus("");
		setForm({
			firstname: entry.firstname || "",
			lastname: entry.lastname || "",
			email: entry.email || "",
			role: entry.role || "client",
		});
	};

	const filteredProfiles = profiles.filter((entry) => {
		const matchesSearch =
			`${entry.firstname || ""} ${entry.lastname || ""} ${entry.email || ""}`
				.toLowerCase()
				.includes(searchTerm.toLowerCase().trim());
		const matchesRole = roleFilter === "all" ? true : entry.role === roleFilter;
		const matchesStatus =
			statusFilter === "all"
				? true
				: statusFilter === "deleted"
					? Boolean(entry.deleted_at)
					: !entry.deleted_at;

		return matchesSearch && matchesRole && matchesStatus;
	});

	const updateProfileCache = (updatedProfile) => {
		setProfiles((current) =>
			current
				.map((entry) =>
					entry.id === updatedProfile.id
						? {
								...entry,
								...updatedProfile,
						  }
						: entry,
				)
				.slice()
				.sort((left, right) =>
					getDisplayName(left)
						.toLowerCase()
						.localeCompare(getDisplayName(right).toLowerCase()),
				),
		);
	};

	const handleSave = async (event) => {
		event.preventDefault();

		if (!selectedProfile) return;

		setSaving(true);
		setStatus("");

		const { data, error } = await supabase
			.from("profiles")
			.update({
				firstname: DOMPurify.sanitize(form.firstname.trim()),
				lastname: DOMPurify.sanitize(form.lastname.trim()),
				email: DOMPurify.sanitize(form.email.trim()),
				role: form.role,
			})
			.eq("id", selectedProfile.id)
			.select()
			.single();

		if (error) {
			setSaving(false);
			alert(error.message || error);
			return;
		}

		setStatus(
			`${getDisplayName(data)} updated successfully. ${
				data.role === "admin" ? "This account is now an administrator." : "This account remains a client."
			}`,
		);
		setForm({
			firstname: data.firstname || "",
			lastname: data.lastname || "",
			email: data.email || "",
			role: data.role || "client",
		});
		setProfiles((current) =>
			current
				.map((entry) =>
					entry.id === data.id
						? {
								...entry,
								...data,
						  }
						: entry,
				)
				.slice()
				.sort((left, right) =>
					getDisplayName(left).toLowerCase().localeCompare(getDisplayName(right).toLowerCase()),
				),
		);
		setSaving(false);
	};

	const handleReset = () => {
		if (!selectedProfile) return;

		setForm({
			firstname: selectedProfile.firstname || "",
			lastname: selectedProfile.lastname || "",
			email: selectedProfile.email || "",
			role: selectedProfile.role || "client",
		});
		setStatus("");
	};

	const handleDeleteToggle = async () => {
		if (!selectedProfile || selectedProfile.role === "admin") return;

		const isCurrentlyDeleted = Boolean(selectedProfile.deleted_at);
		const action = isCurrentlyDeleted ? "restore" : "delete";
		const confirmMessage = isCurrentlyDeleted
			? `Restore ${getDisplayName(selectedProfile)}?`
			: `Delete ${getDisplayName(selectedProfile)}? This will hide the account from active use, but it can still be restored.`;

		if (!window.confirm(confirmMessage)) return;

		setDeleting(true);
		setStatus("");

		const { data, error } = await supabase
			.from("profiles")
			.update({
				deleted_at: isCurrentlyDeleted ? null : new Date().toISOString(),
			})
			.eq("id", selectedProfile.id)
			.select("id, firstname, lastname, email, avatar_url, role, deleted_at, created_at")
			.single();

		if (error) {
			setDeleting(false);
			alert(error.message || error);
			return;
		}

		updateProfileCache(data);
		setSelectedProfileId(data.id);
		setForm({
			firstname: data.firstname || "",
			lastname: data.lastname || "",
			email: data.email || "",
			role: data.role || "client",
		});
		setStatus(
			`${getDisplayName(data)} ${action}d successfully. ${
				action === "delete" ? "You can restore it from the deleted list." : "The account is active again."
			}`,
		);
		setStatusFilter(isCurrentlyDeleted ? "active" : "deleted");
		setDeleting(false);
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,_#fffaf0_0%,_#fff4e3_45%,_#f9ead3_100%)] px-4 py-8 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-2xl backdrop-blur md:p-8">
						<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
							<div className="max-w-3xl">
								<p className="text-sm font-medium uppercase tracking-[0.3em] text-base-content/50">
									Client Accounts
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-5xl">
									Manage client profiles and promote accounts
								</h1>
								<p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/70 md:text-base">
									Open a client account, update their details, and change their
									role to admin when they are ready to manage the system.
								</p>
							</div>
							<div className="flex flex-wrap gap-3">
								<div className="inline-flex items-center gap-2 rounded-full bg-base-200 px-4 py-2 text-sm font-medium text-base-content/70">
									<FiUsers />
									<span>{profiles.filter((entry) => entry.role === "client").length} clients</span>
								</div>
								<div className="inline-flex items-center gap-2 rounded-full bg-base-200 px-4 py-2 text-sm font-medium text-base-content/70">
									<FiShield />
									<span>{profiles.filter((entry) => entry.role === "admin").length} admins</span>
								</div>
								<button
									type="button"
									onClick={refreshProfiles}
									className="btn btn-outline rounded-full"
								>
									<FiRefreshCw />
									Refresh
								</button>
								<button onClick={() => navigate(-1)} className="btn btn-black rounded-full">
									Back
								</button>
							</div>
						</div>
					</div>

					<div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
						<div className="rounded-[2rem] border border-black/5 bg-white/85 p-5 shadow-xl backdrop-blur sm:p-6">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<h2 className="text-xl font-bold text-base-content">Accounts</h2>
									<p className="text-sm text-base-content/60">
										Search and pick the account you want to edit.
									</p>
								</div>
								<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
									<select
										className="select select-bordered select-sm w-full sm:w-36"
										value={roleFilter}
										onChange={(event) => setRoleFilter(event.target.value)}
									>
										<option value="client">Clients</option>
										<option value="admin">Admins</option>
										<option value="all">All Roles</option>
									</select>
									<select
										className="select select-bordered select-sm w-full sm:w-40"
										value={statusFilter}
										onChange={(event) => setStatusFilter(event.target.value)}
									>
										<option value="active">Active</option>
										<option value="deleted">Deleted</option>
										<option value="all">All Status</option>
									</select>
								</div>
							</div>

							<label className="mt-5 flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
								<FiSearch className="text-base-content/55" />
								<input
									type="text"
									value={searchTerm}
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="Search by name or email"
									className="w-full bg-transparent outline-none placeholder:text-base-content/35"
								/>
							</label>

							<div className="mt-5 space-y-3">
								{loading && (
									<div className="rounded-2xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60">
										Loading client accounts...
									</div>
								)}

								{!loading && filteredProfiles.length === 0 && (
									<div className="rounded-2xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60">
										No accounts match your filters.
									</div>
								)}

								{filteredProfiles.map((entry) => {
									const isSelected = entry.id === selectedProfileId;
									const avatarAlt = getDisplayName(entry);

									return (
										<button
											key={entry.id}
											type="button"
											onClick={() => selectProfile(entry)}
											className={[
												"flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition",
												isSelected
													? "border-black bg-black text-white shadow-lg"
													: "border-base-300 bg-base-100 hover:border-base-content/25 hover:bg-base-200",
											].join(" ")}
										>
											<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-sm font-bold text-slate-800">
												{entry.avatar_url ? (
													<img
														src={entry.avatar_url}
														alt={avatarAlt}
														className="h-full w-full object-cover"
													/>
												) : (
													getInitials(avatarAlt)
												)}
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-center justify-between gap-3">
													<p className="truncate font-semibold">
														{avatarAlt}
													</p>
													<span
														className={[
															"badge badge-sm border-0",
															entry.role === "admin"
																? "bg-emerald-500 text-white"
																: "bg-amber-400 text-slate-900",
														].join(" ")}
													>
														{entry.role}
													</span>
												</div>
												<p
													className={[
														"truncate text-sm",
														isSelected ? "text-white/75" : "text-base-content/60",
													].join(" ")}
												>
													{entry.email || "No email on file"}
												</p>
											</div>
										</button>
									);
								})}
							</div>
						</div>

						<div className="rounded-[2rem] border border-black/5 bg-white/85 p-5 shadow-xl backdrop-blur sm:p-6">
							{selectedProfile ? (
								<form onSubmit={handleSave} className="space-y-6">
									<div className="flex items-start justify-between gap-4 border-b border-base-200 pb-5">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
												Selected account
											</p>
											<h2 className="mt-2 text-2xl font-black text-base-content">
												{getDisplayName(selectedProfile)}
											</h2>
											<p className="mt-2 text-sm text-base-content/60">
												Edit the profile fields below and save the changes.
											</p>
										</div>
										<span
											className={[
												"badge badge-lg border-0 px-4 py-3",
												form.role === "admin"
													? "bg-emerald-500 text-white"
													: "bg-amber-400 text-slate-900",
											].join(" ")}
										>
											{form.role}
										</span>
									</div>

									<div className="flex items-center gap-4 rounded-3xl border border-base-300 bg-base-100 p-4">
										<div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-xl font-bold text-slate-800">
											{selectedProfile.avatar_url ? (
												<img
													src={selectedProfile.avatar_url}
													alt={getDisplayName(selectedProfile)}
													className="h-full w-full object-cover"
												/>
											) : (
												getInitials(getDisplayName(selectedProfile))
											)}
										</div>
										<div className="min-w-0">
											<p className="text-sm font-semibold text-base-content">
												Profile snapshot
											</p>
											<p className="truncate text-sm text-base-content/60">
												{selectedProfile.email || "No email on file"}
											</p>
											<p className="mt-1 text-xs uppercase tracking-[0.2em] text-base-content/45">
												{selectedProfile.role === "admin" ? "Administrator" : "Client"}
											</p>
											{selectedIsDeleted && (
												<p className="mt-2 inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
													Deleted account
												</p>
											)}
										</div>
									</div>

									<div className="grid gap-5 md:grid-cols-2">
										<label className="form-control">
											<div className="label">
												<span className="label-text font-medium">First name</span>
											</div>
											<input
												type="text"
												value={form.firstname}
												onChange={(event) =>
													setForm((current) => ({
														...current,
														firstname: event.target.value,
													}))
												}
												className="input input-bordered w-full"
												placeholder="Enter first name"
											/>
										</label>

										<label className="form-control">
											<div className="label">
												<span className="label-text font-medium">Last name</span>
											</div>
											<input
												type="text"
												value={form.lastname}
												onChange={(event) =>
													setForm((current) => ({
														...current,
														lastname: event.target.value,
													}))
												}
												className="input input-bordered w-full"
												placeholder="Enter last name"
											/>
										</label>
									</div>

									<label className="form-control">
										<div className="label">
											<span className="label-text font-medium">Email</span>
										</div>
										<input
											type="email"
											value={form.email}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													email: event.target.value,
												}))
											}
											className="input input-bordered w-full"
											placeholder="Enter email"
										/>
									</label>

									<label className="form-control">
										<div className="label">
											<span className="label-text font-medium">Account role</span>
										</div>
										<select
											className="select select-bordered w-full"
											value={form.role}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													role: event.target.value,
												}))
											}
										>
											<option value="client">Client</option>
											<option value="admin">Admin</option>
										</select>
									</label>

									<div className="rounded-2xl bg-base-200 px-4 py-4 text-sm leading-6 text-base-content/70">
										If you promote a client to admin, they will unlock admin-only
										areas like event management and this page. If you delete a
										client, the account can be restored later.
									</div>

									{status && (
										<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
											{status}
										</div>
									)}

									<div className="flex flex-wrap gap-3 pt-2">
										<button
											type="submit"
											disabled={saving}
											className="btn btn-black rounded-full px-6"
										>
											<FiSave />
											{saving ? "Saving..." : "Save changes"}
										</button>
										<button
											type="button"
											onClick={handleReset}
											className="btn btn-outline rounded-full px-6"
										>
											Reset form
										</button>
										{canDeleteSelected && (
											<button
												type="button"
												onClick={handleDeleteToggle}
												disabled={deleting}
												className={[
													"btn rounded-full px-6",
													selectedIsDeleted ? "btn-success" : "btn-error",
												].join(" ")}
											>
												{selectedIsDeleted ? <FiRotateCcw /> : <FiTrash2 />}
												{deleting
													? "Working..."
													: selectedIsDeleted
														? "Restore account"
														: "Delete account"}
											</button>
										)}
									</div>
								</form>
							) : (
								<div className="flex min-h-[28rem] items-center justify-center rounded-[1.5rem] border border-dashed border-base-300 bg-base-100 p-8 text-center">
									<div className="max-w-md">
										<h2 className="text-2xl font-black text-base-content">
											No account selected
										</h2>
										<p className="mt-3 text-sm leading-6 text-base-content/60">
											Pick a client from the left pane to inspect their profile and
											adjust their account details.
										</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ManageClients;
