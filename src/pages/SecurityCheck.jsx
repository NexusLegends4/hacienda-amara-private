import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { SECURITY_VERIFIED_KEY } from "../utils/security";
import { FiShield } from "react-icons/fi";
import { verifyRecaptcha } from "../utils/recaptcha";

const SecurityCheck = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState("");
	const destination = location.state?.nextPath || "/";

	const sourceMessage = useMemo(() => {
		return location.state?.source === "signup"
			? "Your account has been created. Complete this quick check before logging in."
			: "Complete this quick check to continue to your account.";
	}, [location.state]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsSubmitting(true);
		setMessage("");
		try {
			await verifyRecaptcha("security_check");
			sessionStorage.setItem(SECURITY_VERIFIED_KEY, "true");
			setMessage("Security check complete.");
			navigate(destination, { replace: true });
		} catch (error) {
			setMessage(error.message || "Security verification failed. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<MainLayout>
			<div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-12">
				<section className="w-full rounded-[2rem] border border-base-300 bg-base-100 p-8 shadow-xl md:p-12">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Security check</p>
					<h1 className="mt-3 text-3xl font-black text-base-content md:text-4xl">Security verification</h1>
					<p className="mt-3 text-base-content/70">{sourceMessage}</p>

					<form onSubmit={handleSubmit} className="mt-8 space-y-5">
						<div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
							<div className="flex items-center gap-4">
								<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border-2 border-primary/50 bg-primary/5" aria-hidden="true"><FiShield className="text-primary" /></span>
								<div className="flex-1"><strong className="block text-base">Protected by reCAPTCHA</strong><small className="text-base-content/60">Google risk analysis runs automatically when you continue.</small></div>
							</div>
							<p className="mt-4 text-xs leading-5 text-base-content/55">This site is protected by reCAPTCHA and the Google <a className="link" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a> and <a className="link" href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms of Service</a> apply.</p>
						</div>

						{message && <p className="text-sm text-error" role="status">{message}</p>}

						<button className="btn btn-primary w-full rounded-full" data-action="security_check" data-sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY} disabled={isSubmitting} type="submit">
							{isSubmitting ? <span className="loading loading-spinner" /> : "Continue"}
						</button>
					</form>
				</section>
			</div>
		</MainLayout>
	);
};

export default SecurityCheck;
