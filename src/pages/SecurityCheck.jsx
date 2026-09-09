import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { SECURITY_VERIFIED_KEY } from "../utils/security";
import { FiCheck, FiDroplet, FiHome, FiRefreshCw, FiShield, FiStar, FiSun } from "react-icons/fi";

const randomInt = (minimum, maximum) => {
	const range = maximum - minimum + 1;
	const values = new Uint32Array(1);
	window.crypto.getRandomValues(values);
	return minimum + (values[0] % range);
};

const CAPTCHA_SYMBOLS = ["star", "shield", "home", "sun", "water"];

const createChallenge = () => {
	const target = CAPTCHA_SYMBOLS[randomInt(0, CAPTCHA_SYMBOLS.length - 1)];
	const tiles = Array.from({ length: 9 }, (_, index) => ({
		id: index,
		symbol: index < 3 ? target : CAPTCHA_SYMBOLS[randomInt(0, CAPTCHA_SYMBOLS.length - 1)],
	}));

	for (let index = tiles.length - 1; index > 0; index -= 1) {
		const swapIndex = randomInt(0, index);
		[tiles[index], tiles[swapIndex]] = [tiles[swapIndex], tiles[index]];
	}

	return { target, tiles };
};

const SYMBOL_LABELS = { star: "stars", shield: "shields", home: "houses", sun: "suns", water: "water drops" };
const SYMBOL_ICONS = { star: FiStar, shield: FiShield, home: FiHome, sun: FiSun, water: FiDroplet };

const SecurityCheck = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [challenge, setChallenge] = useState(createChallenge);
	const [stage, setStage] = useState("checkbox");
	const [selectedTiles, setSelectedTiles] = useState([]);
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
		setSelectedTiles([]);
	};

	const startChallenge = () => {
		if (lockSeconds > 0) return;
		setStage("challenge");
	};

	const toggleTile = (tileId) => {
		setSelectedTiles((current) => current.includes(tileId)
			? current.filter((id) => id !== tileId)
			: [...current, tileId]);
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		if (lockSeconds > 0 || stage !== "challenge") return;

		const correctTiles = challenge.tiles.filter((tile) => tile.symbol === challenge.target).map((tile) => tile.id);
		const isCorrect = correctTiles.length === selectedTiles.length && correctTiles.every((id) => selectedTiles.includes(id));

		if (isCorrect) {
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

	const TargetIcon = SYMBOL_ICONS[challenge.target];

	return (
		<MainLayout>
			<div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-12">
				<section className="w-full rounded-[2rem] border border-base-300 bg-base-100 p-8 shadow-xl md:p-12">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Security check</p>
					<h1 className="mt-3 text-3xl font-black text-base-content md:text-4xl">Security verification</h1>
					<p className="mt-3 text-base-content/70">{sourceMessage}</p>

					<form onSubmit={handleSubmit} className="mt-8 space-y-5">
						{stage === "checkbox" ? (
							<button className="flex w-full items-center gap-4 rounded-xl border border-base-300 bg-base-100 p-5 text-left shadow-sm transition hover:border-primary/60" disabled={lockSeconds > 0} onClick={startChallenge} type="button">
								<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border-2 border-base-content/40 bg-base-100" aria-hidden="true" />
								<span className="flex-1"><strong className="block text-base">I’m not a robot</strong><small className="text-base-content/60">Security verification</small></span>
								<FiShield className="text-3xl text-primary" aria-hidden="true" />
							</button>
						) : (
							<div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
								<div className="flex items-center justify-between gap-3">
									<div><p className="font-bold">Select all {SYMBOL_LABELS[challenge.target]}</p><p className="text-xs text-base-content/60">Choose the matching tiles, then verify.</p></div>
									<button className="btn btn-ghost btn-sm btn-square" onClick={refreshChallenge} type="button" aria-label="Generate a new challenge" title="Generate a new challenge"><FiRefreshCw /></button>
								</div>
								<div className="mt-4 grid grid-cols-3 gap-2">
									{challenge.tiles.map((tile) => {
										const Icon = SYMBOL_ICONS[tile.symbol];
										const selected = selectedTiles.includes(tile.id);
										return <button key={tile.id} className={`relative flex aspect-square items-center justify-center rounded-lg border-2 bg-base-200 text-3xl transition ${selected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-primary/50"}`} onClick={() => toggleTile(tile.id)} type="button" aria-pressed={selected} aria-label={`${SYMBOL_LABELS[tile.symbol]} tile`}>{selected && <FiCheck className="absolute right-1 top-1 text-sm text-primary" />}<Icon aria-hidden="true" /></button>;
									})}
								</div>
							</div>
						)}

						{message && (
							<p className={lockSeconds > 0 || wrongAttempts > 0 ? "text-sm text-error" : "text-sm text-success"} role="status">
								{lockSeconds > 0 ? `Try again in ${lockSeconds} second${lockSeconds === 1 ? "" : "s"}.` : message}
							</p>
						)}

						<button className="btn btn-primary w-full rounded-full" disabled={lockSeconds > 0 || stage === "checkbox"} type="submit">
							{lockSeconds > 0 ? `Please wait (${lockSeconds}s)` : "Verify"}
						</button>
						<p className="text-center text-xs text-base-content/55">Characters may overlap or be tilted. Enter them without spaces.</p>
					</form>
				</section>
			</div>
		</MainLayout>
	);
};

export default SecurityCheck;
