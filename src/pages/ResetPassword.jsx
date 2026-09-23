import MainLayout from "../layouts/MainLayout";
import SendIcon from "../components/icons/SendIcon";
import { supabase } from "../utils/supabase";
import { useEffect, useState } from "react";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";

const ResetPassword = () => {
	const navigate = useNavigate();
	const [isVerifying, setIsVerifying] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState("");
	const [status, setStatus] = useState("");

	useEffect(() => {
		const verifyRecoveryToken = async () => {
			const params = new URLSearchParams(window.location.search);
			const tokenHash = params.get("token_hash");
			const type = params.get("type");

			if (!tokenHash || type !== "recovery") {
				setError("This password reset link is invalid or has expired.");
				setIsVerifying(false);
				return;
			}

			const { error: verifyError } = await supabase.auth.verifyOtp({
				token_hash: tokenHash,
				type: "recovery",
			});

			if (verifyError) {
				setError("This password reset link is invalid or has expired.");
			}

			setIsVerifying(false);
		};

		void verifyRecoveryToken();
	}, []);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError("");
		setStatus("");

		if (password.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		setIsSubmitting(true);
		const { error: updateError } = await supabase.auth.updateUser({
			password,
		});

		setIsSubmitting(false);
		if (updateError) {
			setError(updateError.message || "Unable to update your password.");
			return;
		}

		setStatus("Your password has been updated.");
		setPassword("");
		setConfirmPassword("");
		window.setTimeout(() => navigate("/log-in"), 1500);
	};

	if (isVerifying) {
		return (
			<MainLayout>
				<div className="flex min-h-screen items-center justify-center px-4 py-12">
					<span className="loading loading-spinner loading-lg text-primary" />
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout>
			<div className="relative left-1/2 right-1/2 -mx-[50vw] min-h-screen w-screen overflow-hidden px-4 py-12">
				<div className="absolute inset-0 bg-gradient-to-b from-[#6b4b2a]/25 via-[#9a6a3c]/15 to-[#f8e8d2]/60" />

				<div className="relative mx-auto flex min-h-[75vh] w-full max-w-2xl items-center justify-center">
					<div className="w-full rounded-[2rem] border border-white/30 bg-white/40 p-9 text-slate-900 shadow-2xl backdrop-blur-xl md:p-12">
						<h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
							Reset Password
						</h1>
						<p className="mt-3 text-sm leading-6 text-slate-700 md:text-base">
							Enter your new password to secure your account.
						</p>

						{error && (
							<p role="alert" className="mt-6 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm leading-6 text-error">
								{error}
							</p>
						)}

						{status && (
							<p role="status" className="mt-6 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm leading-6 text-success">
								{status}
							</p>
						)}

						<form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
							<label className="fieldset">
								<span className="fieldset-legend">New password</span>
								<div className="relative">
									<input
										type={showPassword ? "text" : "password"}
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										className="input input-bordered w-full pr-14"
										placeholder="Enter new password"
										disabled={isSubmitting}
										autoComplete="new-password"
									/>
									<button
										type="button"
										onClick={() => setShowPassword((current) => !current)}
										className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-base-200"
										aria-label={showPassword ? "Hide password" : "Show password"}
									>
										{showPassword ? <IoEyeOffOutline className="text-2xl" /> : <IoEyeOutline className="text-2xl" />}
									</button>
								</div>
							</label>

							<label className="fieldset">
								<span className="fieldset-legend">Confirm new password</span>
								<div className="relative">
									<input
										type={showConfirmPassword ? "text" : "password"}
										value={confirmPassword}
										onChange={(event) => setConfirmPassword(event.target.value)}
										className="input input-bordered w-full pr-14"
										placeholder="Confirm new password"
										disabled={isSubmitting}
										autoComplete="new-password"
									/>
									<button
										type="button"
										onClick={() => setShowConfirmPassword((current) => !current)}
										className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-base-200"
										aria-label={showConfirmPassword ? "Hide password" : "Show password"}
									>
										{showConfirmPassword ? <IoEyeOffOutline className="text-2xl" /> : <IoEyeOutline className="text-2xl" />}
									</button>
								</div>
							</label>

							<button
								type="submit"
								disabled={isSubmitting}
								className="btn btn-black h-12 min-h-12 w-full rounded-full px-6 text-sm md:text-base"
							>
								{isSubmitting ? <span className="loading loading-spinner" /> : <SendIcon className="text-base" />}
								{isSubmitting ? " Updating..." : " Update password"}
							</button>
						</form>

						<Link to="/log-in" className="btn btn-ghost mt-6 w-full rounded-full">
							Back to Log In
						</Link>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ResetPassword;
