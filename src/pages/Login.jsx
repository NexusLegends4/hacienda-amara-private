```jsx
import Input from "../components/Form/Input";
import MainLayout from "../layouts/MainLayout";
import SendIcon from "../components/icons/SendIcon";
import { supabase } from "../utils/supabase";
import { useContext, useEffect, useState } from "react";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { useNavigate } from "react-router-dom";
import { recordAuthNotification } from "../utils/auth-service";
import { SECURITY_VERIFIED_KEY } from "../utils/security";
import { verifyRecaptcha } from "../utils/recaptcha";
import ReCAPTCHA from "react-google-recaptcha";

import PROFILE_BACKGROUND_IMAGE from "../assets/login-background.jpg";

const Login = () => {
	const { profile } = useContext(SessionContext);
	const navigate = useNavigate();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showV2Challenge, setShowV2Challenge] = useState(false);
	const [pendingLoginForm, setPendingLoginForm] = useState(null);

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

	// Runs the actual Supabase login once any required reCAPTCHA check has passed.
	const completeLogin = async (loginForm) => {
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

				alert(
					"This account has been deleted. Please contact the administrator."
				);

				setIsSubmitting(false);
				return;
			}

			await recordAuthNotification(supabase, {
				eventType: "login",
				profileId: data.user.id,
				name: [profileData.firstname, profileData.lastname]
					.filter(Boolean)
					.join(" ")
					.trim(),
				email: profileData.email || loginForm.email,
			});

			navigate("/security-check", {
				state: {
					source: "login",
					nextPath: "/",
				},
			});
		}

		setIsSubmitting(false);
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		sessionStorage.removeItem(SECURITY_VERIFIED_KEY);

		const formData = new FormData(event.target);

		setIsSubmitting(true);

		const loginForm = {
			email: formData.get("email"),
			password: formData.get("password"),
		};

		// Run the invisible v3 check first.
		try {
			await verifyRecaptcha("login");

			// Passed with a good score — go straight to login.
			await completeLogin(loginForm);
		} catch (err) {
			// Low score or verification failed — fall back to visible v2.
			console.warn(
				"v3 check did not pass, falling back to v2:",
				err.message
			);

			setPendingLoginForm(loginForm);
			setShowV2Challenge(true);
			setIsSubmitting(false);
		}
	};

	// Called when the user completes the v2 challenge.
	const handleV2Change = async (v2Token) => {
		if (!v2Token || !pendingLoginForm) {
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/verify-recaptcha", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					token: v2Token,
					type: "v2",
				}),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(
					result.message || "Security verification failed."
				);
			}

			setShowV2Challenge(false);

			await completeLogin(pendingLoginForm);

			setPendingLoginForm(null);
		} catch (err) {
			alert(
				err.message || "Security check failed. Please try again."
			);

			setIsSubmitting(false);
		}
	};

	return (
		<MainLayout>
			<div className="relative left-1/2 right-1/2 -mx-[50vw] min-h-screen w-screen overflow-hidden px-4 py-12">
				{/* Background image */}
				<div
					className="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat blur-2xl"
					style={{
						backgroundImage: `url("${PROFILE_BACKGROUND_IMAGE}")`,
						backgroundPosition: "left center",
					}}
				/>

				{/* Background overlay */}
				<div className="absolute inset-0 bg-gradient-to-b from-[#6b4b2a]/35 via-[#9a6a3c]/20 to-[#f8e8d2]/60" />

				{/* Login container */}
				<div className="relative mx-auto flex min-h-[75vh] w-full max-w-2xl items-center justify-center">
					<div className="w-full rounded-[2rem] border border-white/30 bg-white/40 p-9 text-slate-900 shadow-2xl backdrop-blur-xl md:p-12">
						<h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
							Log In
						</h1>

						<div className="mt-3 space-y-1 text-sm text-slate-700 md:text-base">
							<p>
								Welcome back. Please enter your details.
							</p>
						</div>

						{!showV2Challenge ? (
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
									type="submit"
									disabled={isSubmitting}
									className="btn btn-black mt-6 h-12 min-h-12 w-full rounded-full px-6 text-sm md:text-base"
								>
									{isSubmitting ? (
										<span className="loading loading-spinner" />
									) : (
										<SendIcon className="text-base" />
									)}

									{isSubmitting
										? " Logging in..."
										: " Log In"}
								</button>
							</form>
						) : (
							<div className="mt-8 flex flex-col items-center gap-4">
								<p className="text-sm text-slate-700">
									We need one more quick check before you
									continue.
								</p>

								<ReCAPTCHA
									sitekey={
										import.meta.env
											.VITE_RECAPTCHA_V2_SITE_KEY
									}
									onChange={handleV2Change}
								/>

								{isSubmitting && (
									<span className="loading loading-spinner" />
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default Login;
```
