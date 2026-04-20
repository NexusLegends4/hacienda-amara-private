import React, { useEffect, useContext, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { Link } from "react-router-dom";
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
	const [profile, setProfile] = useState(null);

	useEffect(() => {
		// Pull the signed-in user's profile data from the database.
		const fetchProfile = async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select()
				.eq("id", session.user.id)
				.single();

			if (error) alert(error);
			if (data) {
				setProfile(data);
			}
		};

		if (session) {
			fetchProfile();
		}
	}, [session]);

	const displayName = [profile?.firstname, profile?.lastname].filter(Boolean).join(" ").trim();
	const avatarAlt = displayName || profile?.email || "Profile avatar";

	return (
		<MainLayout>
			{/* The profile page uses a full-screen background for a resort feel. */}
			<div
				className="relative left-1/2 right-1/2 -mx-[50vw] min-h-screen w-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-12"
				style={{
					backgroundImage:
						'linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25)), url("https://scontent.fmnl9-3.fna.fbcdn.net/v/t39.30808-6/498621173_122130914540749963_238405466557103005_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=2a1932&_nc_eui2=AeFbSN8TdpWfyxBZrWSC_FxAelQG7z5WU_J6VAbvPlZT8jlKAoCsk3Ai6CCiD2DZT9WadKTyFNCeB9LrzyNCNd5Y&_nc_ohc=3fUFjvEWuogQ7kNvwGcc91D&_nc_oc=AdqW5AtIaFMzg06ui5Ap82t7gnoS1cVIpqdK9kLYl26gtnBuR1eF_lBVnI676gapmrw&_nc_zt=23&_nc_ht=scontent.fmnl9-3.fna&_nc_gid=V7ltjqr7MS5-BehPpo8N3w&_nc_ss=7a3a8&oh=00_Af0M5UyjzO6ZNJ52ZYpiN649-3b-MYBsd5wWJjFB-CaBrA&oe=69DE7687")',
					backgroundSize: "120%",
					backgroundPosition: "left center",
				}}
			>
				<div className="mx-auto flex min-h-[5vh] w-full max-w-2xl items-start pt-44">
					<div className="w-full rounded-2xl border border-white/20 bg-black/25 p-8 text-white shadow-sm backdrop-blur-sm">
						<div className="mb-8 flex items-center gap-4">
							<div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/15 text-xl font-bold text-white shadow-md">
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
								<p className="text-sm uppercase tracking-[0.3em] text-white/70">
									{profile?.role === "admin" ? "Admin" : "Client"}
								</p>
								<h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
									{profile?.firstname} {profile?.lastname}
								</h1>
							</div>
						</div>
						<div className="space-y-3 text-white/85">
							<p>
								<span className="font-medium text-white">Email:</span>{" "}
								{profile?.email}
							</p>
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
