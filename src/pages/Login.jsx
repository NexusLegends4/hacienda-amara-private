import Input from "../components/Form/Input";
import MainLayout from "../layouts/MainLayout";
import SendIcon from "../components/icons/SendIcon";
import { supabase } from "../utils/supabase";
import { useContext, useEffect, useState } from "react";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { Link, useNavigate } from "react-router-dom";
import { recordAuthNotification } from "../utils/auth-service";

const PROFILE_BACKGROUND_IMAGE =
	"https://scontent.fmnl9-3.fna.fbcdn.net/v/t39.30808-6/498621173_122130914540749963_238405466557103005_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=2a1932&_nc_eui2=AeFbSN8TdpWfyxBZrWSC_FxAelQG7z5WU_J6VAbvPlZT8jlKAoCsk3Ai6CCiD2DZT9WadKTyFNCeB9LrzyNCNd5Y&_nc_ohc=3fUFjvEWuogQ7kNvwGcc91D&_nc_oc=AdqW5AtIaFMzg06ui5Ap82t7gnoS1cVIpqdK9kLYl26gtnBuR1eF_lBVnI676gapmrw&_nc_zt=23&_nc_ht=scontent.fmnl9-3.fna&_nc_gid=V7ltjqr7MS5-BehPpo8N3w&_nc_ss=7a3a8&oh=00_Af0M5UyjzO6ZNJ52ZYpiN649-3b-MYBsd5wWJjFB-CaBrA&oe=69DE7687";

const Login = () => {
	const { profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		// Redirect already signed-in users to their role-based landing page.
		if (!profile) {
			return;
		}

		if (profile?.role === "admin") {
			navigate("/manage-events");
		} else {
			navigate("/");
		}
	}, [profile, navigate]);

	const handleSubmit = async (event) => {
		// Send credentials to Supabase and redirect on success.
		event.preventDefault();
		const formData = new FormData(event.target);
		setIsSubmitting(true);

		const loginForm = {
			email: formData.get("email"),
			password: formData.get("password"),
		};

		const { data, error } = await supabase.auth.signInWithPassword({
			email: loginForm.email,
			password: loginForm.password,
		});

		if (error) {
			alert(error.message || error);
			setIsSubmitting(false);
			return;
		}

		if (data?.user) {
			const { data: profileData, error: profileError } = await supabase
				.from("profiles")
				.select("firstname, lastname, email, role, deleted_at")
				.eq("id", data.user.id)
				.single();

			if (profileError) {
				alert(profileError.message || profileError);
				setIsSubmitting(false);
				return;
			}

			if (profileData?.deleted_at) {
				await supabase.auth.signOut();
				alert("This account has been deleted. Please contact the administrator.");
				setIsSubmitting(false);
				return;
			}

			await recordAuthNotification(supabase, {
				eventType: "login",
				profileId: data.user.id,
				name: [profileData.firstname, profileData.lastname].filter(Boolean).join(" ").trim(),
				email: profileData.email || loginForm.email,
			});

			const landingRole = profileData?.role === "admin" ? "admin" : "client";

			navigate(landingRole === "admin" ? "/manage-events" : "/");
		}
		setIsSubmitting(false);
	};

	return (
		<MainLayout>
			<div className="relative left-1/2 right-1/2 -mx-[50vw] min-h-screen w-screen overflow-hidden px-4 py-12">
				<div
					className="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat blur-2xl"
					style={{
						backgroundImage: `url("${PROFILE_BACKGROUND_IMAGE}")`,
						backgroundPosition: "left center",
					}}
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-[#6b4b2a]/35 via-[#9a6a3c]/20 to-[#f8e8d2]/60" />

				<div className="relative mx-auto flex min-h-[75vh] w-full max-w-2xl items-center justify-center">
					<div className="w-full rounded-[2rem] border border-white/30 bg-white/40 p-9 text-slate-900 shadow-2xl backdrop-blur-xl md:p-12">
						<h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
							Log In
						</h1>
						<div className="mt-3 space-y-1 text-sm text-slate-700 md:text-base">
							<p>Welcome back. Please enter your details.</p>
						</div>
						<form onSubmit={handleSubmit} className="mt-8">
							<Input
								name="email"
								placeholder="Enter your Email"
								label="Email"
								type="email"
							/>
							<Input
								name="password"
								placeholder="Enter your Password"
								label="Password"
								type="password"
							/>

							<button 
								disabled={isSubmitting}
								className="btn btn-black mt-6 h-12 min-h-12 w-full rounded-full px-6 text-sm md:text-base"
							>
								{isSubmitting ? <span className="loading loading-spinner"></span> : <SendIcon className="text-base" />}
								{isSubmitting ? " Logging in..." : " Log In"}
							</button>
							<div className="mt-6 border-t border-black/10 pt-4 text-center text-sm text-slate-700 md:text-base">
								<span>Don't have an account? </span>
								<Link
									to="/sign-up"
									className="font-semibold text-primary underline-offset-4 hover:underline"
								>
									Sign Up
								</Link>
							</div>
						</form>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default Login;
