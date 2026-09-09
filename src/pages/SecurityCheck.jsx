import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { SECURITY_VERIFIED_KEY } from "../utils/security";
import { FiRefreshCw } from "react-icons/fi";

const randomInt = (minimum, maximum) => {
	const range = maximum - minimum + 1;
	const values = new Uint32Array(1);
	window.crypto.getRandomValues(values);
	return minimum + (values[0] % range);
};

const createChallenge = () => {
	const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let code = "";

	for (let index = 0; index < 6; index += 1) {
		code += characters[randomInt(0, characters.length - 1)];
	}

	return {
		code,
		characters: [...code].map((character) => ({
			character,
			rotation: randomInt(-18, 18),
			offset: randomInt(-7, 7),
			scale: randomInt(92, 112) / 100,
		})),
		noise: Array.from({ length: 12 }, (_, index) => ({
			left: randomInt(2, 98),
			top: randomInt(8, 92),
			delay: `${index * 35}ms`,
		})),
	};
};

const SecurityCheck = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [challenge, setChallenge] = useState(createChallenge);
	const [answer, setAnswer] = useState("");
	const [wrongAttempts, setWrongAttempts] = useState(0);
	const [lockSeconds, setLockSeconds] = useState(0);
	const [message, setMessage] = useState("");
	const destination = location.state?.nextPath || "/";

	useEffect(() => {
		if (lockSeconds <= 0) return undefined;

		const timer = window.setTimeout(() => {
			setLockSeconds((seconds) => seconds - 1);
		}, 1000);

		return () => window.clearTimeout(timer);
	}, [lockSeconds]);

	const sourceMessage = useMemo(() => {
		return location.state?.source === "signup"
			? "Your account has been created. Complete this quick check before logging in."
			: "Complete this quick check to continue to your account.";
	}, [location.state]);

	const refreshChallenge = () => {
		setChallenge(createChallenge());
		setAnswer("");
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		if (lockSeconds > 0) return;

		if (answer.trim().toUpperCase() === challenge.code) {
			sessionStorage.setItem(SECURITY_VERIFIED_KEY, "true");
			setMessage("Security check complete.");
			navigate(destination, { replace: true });
			return;
		}

		const nextAttempts = wrongAttempts + 1;
		setWrongAttempts(nextAttempts);
		refreshChallenge();

		if (nextAttempts >= 3) {
			setWrongAttempts(0);
			setLockSeconds(5);
			setMessage("Three incorrect answers. Please wait 5 seconds before trying again.");
		} else {
			setMessage(`Incorrect answer. ${3 - nextAttempts} attempt${3 - nextAttempts === 1 ? "" : "s"} remaining.`);
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
						<div className="rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4">
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs font-bold uppercase tracking-[0.18em] text-base-content/60">Type this CAPTCHA code</p>
								<button className="btn btn-ghost btn-sm btn-square" onClick={refreshChallenge} type="button" aria-label="Generate a new CAPTCHA" title="Generate a new CAPTCHA">
									<FiRefreshCw />
								</button>
							</div>
							<div className="relative mt-3 h-20 select-none overflow-hidden rounded-xl border border-base-content/15 bg-base-100/80" aria-label={`CAPTCHA code: ${challenge.code}`}>
								<div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true">
									{challenge.noise.map((dot) => (
										<span
											key={`${dot.left}-${dot.top}`}
											className="absolute h-1 w-1 rounded-full bg-primary"
											style={{ left: `${dot.left}%`, top: `${dot.top}%`, animationDelay: dot.delay }}
										/>
									))}
									<span className="absolute left-[-5%] top-1/2 h-1 w-[110%] -rotate-6 bg-primary/30" />
									<span className="absolute left-[-5%] top-1/2 h-1 w-[110%] rotate-12 bg-secondary/25" />
								</div>
								<div className="relative flex h-full items-center justify-center gap-0.5 px-3" role="img" aria-label={`CAPTCHA code: ${challenge.code}`}>
									{challenge.characters.map((item, index) => (
										<span
											key={`${item.character}-${index}`}
											className="font-mono text-3xl font-black text-primary drop-shadow-sm sm:text-4xl"
											style={{
												transform: `translateY(${item.offset}px) rotate(${item.rotation}deg) scale(${item.scale})`,
												zIndex: index,
												marginLeft: index === 0 ? 0 : "-2px",
											}}
										>
											{item.character}
										</span>
									))}
								</div>
							</div>
						</div>
						<label className="block">
							<span className="mb-2 block text-sm font-semibold text-base-content">Enter the code shown above</span>
							<input
								autoFocus
								className="input input-bordered w-full text-lg"
								disabled={lockSeconds > 0}
								autoComplete="off"
								inputMode="text"
								onChange={(event) => setAnswer(event.target.value)}
								placeholder="Type the CAPTCHA code"
								spellCheck="false"
								value={answer}
							/>
						</label>

						{message && (
							<p className={lockSeconds > 0 || wrongAttempts > 0 ? "text-sm text-error" : "text-sm text-success"} role="status">
								{lockSeconds > 0 ? `Try again in ${lockSeconds} second${lockSeconds === 1 ? "" : "s"}.` : message}
							</p>
						)}

						<button className="btn btn-primary w-full rounded-full" disabled={lockSeconds > 0} type="submit">
							{lockSeconds > 0 ? `Please wait (${lockSeconds}s)` : "Continue"}
						</button>
						<p className="text-center text-xs text-base-content/55">Characters may overlap or be tilted. Enter them without spaces.</p>
					</form>
				</section>
			</div>
		</MainLayout>
	);
};

export default SecurityCheck;
