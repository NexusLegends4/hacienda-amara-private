import Input from "../components/Form/Input";
import MainLayout from "../layouts/MainLayout";
import SendIcon from "../components/icons/SendIcon";
import { supabase } from "../utils/supabase";
import { useContext, useEffect, useState } from "react";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { recordAuthNotification } from "../utils/auth-service";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;
const ATTEMPTS_KEY = "hacienda-login-attempts";
const LOCKOUT_KEY = "hacienda-login-lockout";

const Login = () => {
	const { profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [loginError, setLoginError] = useState('');
	const [attempts, setAttempts] = useState(0);
	const [lockoutUntil, setLockoutUntil] = useState(null);

	// Initialize attempts/lockout from localStorage
	useEffect(() => {
		if (typeof window === "undefined") return;
		const storedAttempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0", 10);
		const storedLockout = localStorage.getItem(LOCKOUT_KEY);
		const now = Date.now();
		
		if (storedLockout && storedLockout > now) {
			setLockoutUntil(storedLockout);
			setAttempts(storedAttempts);
		} else if (storedLockout && storedLockout <= now) {
			// Lockout expired, clear it
			localStorage.removeItem(LOCKOUT_KEY);
			localStorage.removeItem(ATTEMPTS_KEY);
			setAttempts(0);
			setLockoutUntil(null);
		} else {
			setAttempts(storedAttempts);
		}
	}, []);

	// Countdown timer for lockout
	useEffect(() => {
		if (!lockoutUntil) return;
		const interval = setInterval(() => {
			const remaining = lockoutUntil - Date.now();
			if (remaining <= 0) {
				setLockoutUntil(null);
				setAttempts(0);
				localStorage.removeItem(LOCKOUT_KEY);
				localStorage.removeItem(ATTEMPTS_KEY);
			}
		}, 1000);
		return () => clearInterval(interval);
	}, [lockoutUntil]);

	const formatLockoutTime = (ms) => {
		const minutes = Math.ceil(ms / 60000);
		return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
	};

	useEffect(() => {
		if (!profile) {
			return;
		}
		navigate("/");
	}, [profile, navigate]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		
		// Check lockout
		if (lockoutUntil && lockoutUntil > Date.now()) {
			setLoginError(`Too many attempts. Try again in ${formatLockoutTime(lockoutUntil - Date.now())}.`);
			return;
		}

		const formData = new FormData(event.target);
		setIsSubmitting(true);
		setLoginError('');

		const loginForm = {
			email: formData.get("email"),
			password: formData.get("password"),
		};

		const { data, error } = await supabase.auth.signInWithPassword({
			email: loginForm.email,
			password: loginForm.password,
		});

		if (error) {
			let errorMessage = error.message;
			
			// Supabase error codes for invalid credentials
			if (error.code === 'invalid_credentials' || 
				error.message.includes('Invalid login credentials') || 
				error.message.includes('Invalid email or password') || 
				error.message.includes('User not found') || 
				error.message.includes('Wrong password') || 
				error.message.includes('Invalid credentials') ||
				error.message.includes('AuthApiError')) {
				
				// Increment failed attempts
				const newAttempts = attempts + 1;
				setAttempts(newAttempts);
				localStorage.setItem(ATTEMPTS_KEY, String(newAttempts));
				
				if (newAttempts >= MAX_ATTEMPTS) {
					const until = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
					setLockoutUntil(until);
					localStorage.setItem(LOCKOUT_KEY, String(until));
					errorMessage = `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`;
				} else {
					errorMessage = 'Incorrect email or password. Please try again.';
				}
			} else if (error.message.includes('Email not confirmed')) {
				errorMessage = 'Please verify your email address before logging in.';
			} else if (error.message.includes('Too many requests')) {
				errorMessage = 'Too many login attempts. Please try again later.';
			}
			
			setLoginError(errorMessage);
			setIsSubmitting(false);
			return;
		}

		// Success - reset attempts
		localStorage.removeItem(ATTEMPTS_KEY);
		localStorage.removeItem(LOCKOUT_KEY);
		setAttempts(0);
		setLockoutUntil(null);

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

			navigate("/");
		}
		setIsSubmitting(false);
	};

	return (
		<MainLayout>
			<div className="relative left-1/2 right-1/2 -mx-[50vw] min-h-screen w-screen overflow-hidden px-3 sm:px-4 md:px-6 py-8 sm:py-12">
				<div className="absolute inset-0 bg-gradient-to-b from-[#6b4b2a]/35 via-[#9a6a3c]/20 to-[#f8e8d2]/60" />

				<div className="relative mx-auto flex min-h-[75vh] w-full max-w-md sm:max-w-xl md:max-w-2xl items-center justify-center">
					<div className="w-full rounded-2xl sm:rounded-[2rem] border border-white/30 bg-white/40 p-6 sm:p-8 md:p-9 lg:p-12 text-slate-900 shadow-2xl backdrop-blur-xl">
						<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
							Log In
						</h1>
						<div className="mt-2 sm:mt-3 space-y-1 text-sm sm:text-base text-slate-700 md:text-base">
							<p>Welcome back. Please enter your details.</p>
						</div>

						<form onSubmit={handleSubmit} className="mt-6 sm:mt-8">
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
								error={loginError}
							/>

							{lockoutUntil && lockoutUntil > Date.now() && (
								<div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
									⏳ Account locked. Try again in <strong id="lockout-timer">{formatLockoutTime(lockoutUntil - Date.now())}</strong>.
								</div>
							)}

							<button
								disabled={isSubmitting || (lockoutUntil && lockoutUntil > Date.now())}
								className="btn btn-black mt-4 sm:mt-6 h-12 min-h-12 w-full rounded-full px-4 sm:px-6 text-sm sm:text-base"
							>
								{isSubmitting ? <span className="loading loading-spinner"></span> : <SendIcon className="text-base" />}
								{isSubmitting ? " Logging in..." : " Log In"}
							</button>
						</form>
						<Link to="/forgot-password" className="mt-3 sm:mt-4 block text-center text-sm font-medium text-slate-700 hover:underline">
							Forgot your password?
						</Link>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default Login;