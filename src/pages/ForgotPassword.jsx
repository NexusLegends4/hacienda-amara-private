import MainLayout from "../layouts/MainLayout";
import SendIcon from "../components/icons/SendIcon";
import { supabase } from "../utils/supabase";
import { useState } from "react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [status, setStatus] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async (event) => {
		event.preventDefault();
		setStatus("");
		setError("");

		if (!email.trim()) {
			setError("Please enter your email address.");
			return;
		}

		if (!email.includes("@") || !email.includes(".")) {
			setError("Please enter a valid email address.");
			return;
		}

		setIsSubmitting(true);
		const { error: resetError } = await supabase.auth.resetPasswordForEmail(
			email.trim(),
			{
				redirectTo: `${window.location.origin}/reset-password`,
			},
		);

		if (resetError) {
			setError(resetError.message || "Unable to send a password reset link.");
			setIsSubmitting(false);
			return;
		}

		setStatus("If an account exists for this email, a password reset link has been sent.");
		setEmail("");
		setIsSubmitting(false);
	};

	return (
		<MainLayout>
			<div className="relative left-1/2 right-1/2 -mx-[50vw] min-h-screen w-screen overflow-hidden px-4 py-12">
				<div className="absolute inset-0 bg-gradient-to-b from-[#6b4b2a]/25 via-[#9a6a3c]/15 to-[#f8e8d2]/60" />

				<div className="relative mx-auto flex min-h-[75vh] w-full max-w-2xl items-center justify-center">
					<div className="w-full rounded-[2rem] border border-white/30 bg-white/40 p-9 text-slate-900 shadow-2xl backdrop-blur-xl md:p-12">
						<h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
							Forgot Password
						</h1>
						<p className="mt-3 text-sm leading-6 text-slate-700 md:text-base">
							Enter your account email and we will send you a link to reset your
							password.
						</p>

						<form onSubmit={handleSubmit} className="mt-8" noValidate>
							<label className="fieldset">
								<span className="fieldset-legend">Email</span>
								<input
									name="email"
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									placeholder="Enter your Email"
									className="input input-bordered w-full"
									disabled={isSubmitting}
									autoComplete="email"
									aria-describedby={error ? "forgot-password-error" : undefined}
								/>
							</label>

							{error && (
								<p
									id="forgot-password-error"
									role="alert"
									className="mt-3 text-sm font-medium text-error"
								>
									{error}
								</p>
							)}

							{status && (
								<p
									role="status"
									className="mt-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm leading-6 text-success"
								>
									{status}
								</p>
							)}

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
								{isSubmitting ? " Sending..." : " Send Reset Link"}
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

export default ForgotPassword;
