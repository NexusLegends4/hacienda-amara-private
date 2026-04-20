import Input from "../components/Form/Input";
import MainLayout from "../layouts/MainLayout";
import SendIcon from "../components/icons/SendIcon";
import { supabase } from "../utils/supabase";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext";
import { FiUser, FiMail, FiShield } from "react-icons/fi";
import DOMPurify from "dompurify";

const EditProfile = () => {
	const { session, profile, setProfile } = useContext(SessionContext);
	const navigate = useNavigate();
	const avatarInputRef = useRef(null);
	const [avatarFile, setAvatarFile] = useState(null);
	const [avatarPreview, setAvatarPreview] = useState("");
	const [avatarSaving, setAvatarSaving] = useState(false);
	const [avatarStatus, setAvatarStatus] = useState("");

	useEffect(() => {
		if (!session) {
			navigate("/log-in");
		}
	}, [session, navigate]);

	useEffect(() => {
		if (!avatarFile) {
			setAvatarPreview("");
			return undefined;
		}

		const previewUrl = URL.createObjectURL(avatarFile);
		setAvatarPreview(previewUrl);

		return () => URL.revokeObjectURL(previewUrl);
	}, [avatarFile]);

	const avatarSource = useMemo(
		() => avatarPreview || profile?.avatar_url || "",
		[avatarPreview, profile?.avatar_url],
	);

	const getInitials = (name) => {
		const parts = String(name || "")
			.trim()
			.split(/\s+/)
			.filter(Boolean);

		if (parts.length === 0) return "?";
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	};

	const saveAvatar = async (file) => {
		if (!file || !session?.user?.id) return;

		setAvatarSaving(true);
		setAvatarStatus("Uploading photo...");

		try {
			const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
			const filePath = `${session.user.id}/${Date.now()}-${cleanFileName}`;
			const { error: uploadError } = await supabase.storage
				.from("profile-avatars")
				.upload(filePath, file, {
					contentType: file.type,
					upsert: false,
				});

			if (uploadError) {
				throw uploadError;
			}

			const { data: publicUrlData } = supabase.storage
				.from("profile-avatars")
				.getPublicUrl(filePath);

			const avatarUrl = publicUrlData.publicUrl;
			const { data: profileData, error: profileError } = await supabase
				.from("profiles")
				.update({ avatar_url: avatarUrl })
				.eq("id", session.user.id)
				.select()
				.single();

			if (profileError) {
				throw profileError;
			}

			if (profileData) {
				setProfile(profileData);
				setAvatarStatus("Photo saved.");
			}
		} catch (error) {
			setAvatarStatus("");
			alert(error?.message || error);
		} finally {
			setAvatarSaving(false);
			window.setTimeout(() => setAvatarStatus(""), 1800);
		}
	};

	const handleSubmit = async (event) => {
		// Save only the editable profile fields back to Supabase.
		event.preventDefault();
		const formData = new FormData(event.target);
		const signupForm = {
			firstname: DOMPurify.sanitize(formData.get("firstname")),
			lastname: DOMPurify.sanitize(formData.get("lastname")),
			email: DOMPurify.sanitize(formData.get("email")),
		};

		const { data: profileData, error: profileError } = await supabase
			.from("profiles")
			.update({
				firstname: signupForm.firstname,
				lastname: signupForm.lastname,
				email: signupForm.email.trim(),
			})
			.eq("id", session.user.id)
			.select()
			.single();

		if (profileError) alert(profileError);
		if (profileData) {
			navigate("/profile");
			setProfile(profileData);
		}
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_transparent_35%),linear-gradient(180deg,_#fffaf0_0%,_#fff5e6_48%,_#f8ecd8_100%)] px-3 py-6 sm:px-4 md:px-6">
				<div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
					<div className="space-y-5 rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur md:p-8">
						<div className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-base-content/70">
							PROFILE EDIT
						</div>
						<div className="space-y-3">
							<h1 className="text-3xl font-black tracking-tight text-base-content md:text-5xl">
								Make your profile feel complete.
							</h1>
							<p className="max-w-xl text-sm leading-6 text-base-content/70 md:text-base md:leading-7">
								Update the details people see on your account page. Clear names
								and a correct email make the whole experience feel more polished.
							</p>
						</div>

						<div className="grid gap-3">
							<div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
									<FiUser />
								</div>
								<div>
									<p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
										Display name
									</p>
									<p className="font-semibold text-base-content">
										{profile?.firstname} {profile?.lastname}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/15 text-secondary">
									<FiMail />
								</div>
								<div>
									<p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
										Email address
									</p>
									<p className="font-semibold text-base-content">{profile?.email}</p>
								</div>
							</div>
							<div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<div className="flex h-11 w-11 items-center justify-center rounded-full bg-base-200 text-base-content">
									<FiShield />
								</div>
								<div>
									<p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
										Account type
									</p>
									<p className="font-semibold text-base-content">
										{profile?.role === "admin" ? "Administrator" : "Client"}
									</p>
								</div>
							</div>
						</div>
					</div>

					<div className="rounded-[2rem] border border-black/5 bg-white/80 p-5 shadow-2xl backdrop-blur sm:p-6 md:p-8">
						<div className="mb-6 flex flex-col gap-3 border-b border-base-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.24em] text-base-content/50">
									Account details
								</p>
								<h2 className="mt-2 text-2xl font-black text-base-content">
									Edit Profile
								</h2>
							</div>
							<p className="max-w-sm text-sm leading-6 text-base-content/60">
								Keep your name and email aligned with the rest of your account.
							</p>
						</div>

						<div className="mb-6 flex items-center gap-4 rounded-3xl border border-black/5 bg-white/90 p-4 shadow-sm">
							<div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-lg font-bold text-slate-800 shadow-inner">
								{avatarSource ? (
									<img
										src={avatarSource}
										alt="Profile avatar preview"
										className="h-full w-full object-cover"
									/>
								) : (
									getInitials(`${profile?.firstname || ""} ${profile?.lastname || ""}`)
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-base-content">Profile picture</p>
								<p className="text-xs leading-5 text-base-content/60">
									Add a photo so your profile looks the same in chat, the navbar, and your
									account page.
								</p>
								<div className="mt-3 flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => avatarInputRef.current?.click()}
										disabled={avatarSaving}
										className="btn btn-outline btn-sm rounded-full"
									>
										{avatarSaving ? "Uploading..." : "Choose photo"}
									</button>
									{avatarFile && !avatarSaving && (
										<button
											type="button"
											onClick={() => setAvatarFile(null)}
											className="btn btn-ghost btn-sm rounded-full"
										>
											Remove preview
										</button>
									)}
								</div>
								<input
									ref={avatarInputRef}
									type="file"
									accept="image/*"
									className="hidden"
									disabled={avatarSaving}
									onChange={async (event) => {
										const file = event.target.files?.[0] || null;
										setAvatarFile(file);
										event.target.value = "";
										if (file) {
											await saveAvatar(file);
											setAvatarFile(null);
										}
									}}
								/>
							</div>
						</div>

						<form onSubmit={handleSubmit} className="space-y-5">
							<div className="grid gap-5 md:grid-cols-2">
								<Input
									name="firstname"
									placeholder="Enter your first name"
									label="First name"
									type="text"
									defaultValue={profile?.firstname}
								/>
								<Input
									name="lastname"
									placeholder="Enter your last name"
									label="Last name"
									type="text"
									defaultValue={profile?.lastname}
								/>
							</div>

							<Input
								name="email"
								placeholder="Enter your email"
								label="Email"
								type="email"
								defaultValue={profile?.email}
							/>

							<div className="rounded-2xl bg-base-200/80 px-4 py-4 text-sm leading-6 text-base-content/70">
								This page updates your profile details and optional photo only. Your role stays
								as assigned by the system.
							</div>
							{avatarStatus && (
								<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
									{avatarStatus}
								</div>
							)}

							<div className="flex flex-col gap-3 pt-2 sm:flex-row">
								<button className="btn btn-black rounded-full px-6" disabled={avatarSaving}>
									<SendIcon className="text-sm" />
									Save changes
								</button>
								<button
									type="button"
									onClick={() => navigate(-1)}
									className="btn btn-outline rounded-full px-6"
								>
									Back
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default EditProfile;
