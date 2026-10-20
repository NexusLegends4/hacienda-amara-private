import React, { useEffect, useContext, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { Link, useNavigate } from "react-router-dom";
import EditUserIcon from "../components/icons/EditUserIcon";

const getInitials = (name) => {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const Profile = () => {
	const { session } = useContext(SessionContext);
	const navigate = useNavigate();
	const [profile, setProfile] = useState(null);

	useEffect(() => {
		if (!session) {
			navigate("/log-in", { replace: true });
			return;
		}
		if (session.user.is_anonymous) {
			navigate("/", { replace: true });
			return;
		}

		// Pull the signed-in user's profile data from the database.
		const fetchProfile = async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select()
				.eq("id", session.user.id)
				.maybeSingle();

			if (error) {
				alert(error.message);
				return;
			}
			if (data) {
				setProfile(data);
			} else {
				navigate("/", { replace: true });
			}
		};

		void fetchProfile();
	}, [session, navigate]);

	const displayName = [profile?.firstname, profile?.lastname].filter(Boolean).join(" ").trim();
	const avatarAlt = displayName || profile?.email || "Profile avatar";

	return (
		<MainLayout>
			<div
				className="relative left-1/2 right-1/2 -mx-[50vw] min-h-screen w-screen overflow-hidden bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-4 py-12"
			>
				<div className="mx-auto flex min-h-[5vh] w-full max-w-2xl items-start pt-44">
					<div className="w-full rounded-2xl border border-black/5 bg-white/80 p-8 text-base-content shadow-xl backdrop-blur-sm">
						<div className="mb-8 flex items-center gap-4">
							<div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-200 bg-amber-100 text-xl font-bold text-amber-800 shadow-md">
								{profile?.avatar_url ? (
									<img
										src={profile.avatar_url}
										alt={avatarAlt}
										className="h-full w-full object-cover"
									/>
								) : (
									getInitials(displayName)
								)}
							</div>
							<div>
								<p className="text-sm uppercase tracking-[0.3em] text-base-content/55">
									{profile?.role === "admin" ? "Admin" : profile?.role === "staff" ? "Staff" : "Client"}
								</p>
								<h1 className="mt-2 text-3xl font-semibold text-base-content md:text-4xl">
									{profile?.firstname} {profile?.lastname}
								</h1>
							</div>
						</div>
						<div className="space-y-3 text-base-content/80">
							<p>
								<span className="font-medium text-base-content">Email:</span>{" "}
								{profile?.email}
							</p>
							{profile?.contact_number && (
								<p>
									<span className="font-medium text-base-content">Contact Number:</span>{" "}
									{profile.contact_number}
								</p>
							)}
							<div className="pt-2">
								<Link
									to="/edit-profile"
									className="btn btn-black rounded-full border-0"
								>
									<EditUserIcon className="text-lg" />
									Edit Profile
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default Profile;
