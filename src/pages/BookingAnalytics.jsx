import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBarChart2, FiRefreshCw, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import MainLayout from "../layouts/MainLayout";
import { SessionContext } from "../contexts/SessionContext";

const formatMonth = (month, options = { month: "long", year: "numeric" }) =>
	new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString("en-US", {
		...options,
		timeZone: "UTC",
	});

const BookingChart = ({ history, predictions }) => {
	const points = [...history, ...predictions];
	const width = 900;
	const height = 350;
	const padding = { top: 24, right: 24, bottom: 58, left: 52 };
	const plotWidth = width - padding.left - padding.right;
	const plotHeight = height - padding.top - padding.bottom;
	const maximum = Math.max(1, ...points.map((point) => point.bookings));
	const step = plotWidth / points.length;
	const barWidth = Math.min(32, step * 0.58);
	const ticks = [...new Set(Array.from({ length: 5 }, (_, index) =>
		Math.ceil((maximum * index) / 4),
	))];

	return (
		<div className="overflow-x-auto">
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="min-w-[760px] w-full"
				role="img"
				aria-label="Bar chart comparing monthly booking requests and three AI forecast months"
			>
				{ticks.map((tick, index) => {
					const y = padding.top + plotHeight - (tick / maximum) * plotHeight;
					return (
						<g key={`${tick}-${index}`}>
							<line
								x1={padding.left}
								x2={width - padding.right}
								y1={y}
								y2={y}
								stroke="#e7e5e4"
								strokeDasharray={index === 0 ? undefined : "4 5"}
							/>
							<text x={padding.left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="#78716c">
								{tick}
							</text>
						</g>
					);
				})}
				{points.map((point, index) => {
					const valueHeight = (point.bookings / maximum) * plotHeight;
					const x = padding.left + index * step + (step - barWidth) / 2;
					const y = padding.top + plotHeight - Math.max(2, valueHeight);
					const isForecast = index >= history.length;
					const label = formatMonth(point.month);

					return (
						<g key={point.month}>
							<title>{`${label}: ${point.bookings} ${isForecast ? "predicted" : "actual"} booking requests`}</title>
							<rect
								x={x}
								y={y}
								width={barWidth}
								height={Math.max(2, valueHeight)}
								rx="5"
								fill={isForecast ? "#16a34a" : "#c77b2a"}
								fillOpacity={isForecast ? "0.28" : "0.88"}
								stroke={isForecast ? "#15803d" : "none"}
								strokeDasharray={isForecast ? "4 3" : undefined}
							/>
							<text
								x={x + barWidth / 2}
								y={height - padding.bottom + 22}
								textAnchor="middle"
								fontSize="10"
								fill="#57534e"
							>
								{formatMonth(point.month, { month: "short" })}
							</text>
							<text
								x={x + barWidth / 2}
								y={height - padding.bottom + 37}
								textAnchor="middle"
								fontSize="9"
								fill="#a8a29e"
							>
								{point.month.slice(2, 4)}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
};

const BookingAnalytics = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [analytics, setAnalytics] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const profileRole = profile?.role;

	const loadAnalytics = useCallback(async () => {
		if (!session?.access_token) return;
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/booking-analytics", {
				method: "POST",
				headers: { Authorization: `Bearer ${session.access_token}` },
			});
			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.error || "Unable to load booking analytics.");
			}
			setAnalytics(result);
		} catch (loadError) {
			setError(loadError.message || "Unable to load booking analytics.");
		} finally {
			setLoading(false);
		}
	}, [session?.access_token]);

	useEffect(() => {
		if (!session) {
			navigate("/log-in", { replace: true });
			return;
		}
		if (profileRole && !["admin", "staff"].includes(profileRole)) {
			navigate("/", { replace: true });
			return;
		}
		if (["admin", "staff"].includes(profileRole)) loadAnalytics();
	}, [session, profileRole, navigate, loadAnalytics]);

	const extremes = useMemo(() => {
		const history = analytics?.history || [];
		if (!history.length) return { highest: null, lowest: null };

		return {
			highest: history.reduce((best, month) =>
				month.bookings > best.bookings ? month : best,
			),
			lowest: history.reduce((best, month) =>
				month.bookings < best.bookings ? month : best,
			),
		};
	}, [analytics?.history]);

	const forecast = analytics?.forecast;

	return (
		<MainLayout>
			<main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-5 sm:px-6 md:px-8">
				<div className="mx-auto max-w-7xl space-y-6">
					<header className="flex flex-col gap-4 rounded-[1.5rem] border border-black/5 bg-white/75 p-6 shadow-xl backdrop-blur sm:flex-row sm:items-end sm:justify-between sm:rounded-[2rem] md:p-8">
						<div>
							<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
								{profile?.role === "staff" ? "Staff Dashboard" : "Admin Dashboard"}
							</p>
							<h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
								<FiBarChart2 aria-hidden="true" />
								Booking Analytics
							</h1>
							<p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/75 md:text-base">
								Monthly reservation requests and an AI forecast based on the last 36 months of booking history.
							</p>
						</div>
						<div className="flex gap-3">
							<button onClick={() => navigate(-1)} className="btn btn-black rounded-full">
								Back
							</button>
							<button
								onClick={loadAnalytics}
								disabled={loading}
								className="btn rounded-full"
								aria-label="Refresh booking analytics"
							>
								<FiRefreshCw className={loading ? "animate-spin" : ""} />
								Refresh
							</button>
						</div>
					</header>

					{error && (
						<div role="alert" className="alert alert-error rounded-2xl">
							<span>{error}</span>
							<button className="btn btn-sm" onClick={loadAnalytics}>Try again</button>
						</div>
					)}

					{loading ? (
						<div className="flex min-h-72 items-center justify-center rounded-[1.5rem] bg-white/80 shadow-lg">
							<span className="loading loading-spinner loading-lg text-amber-700" aria-label="Loading analytics" />
						</div>
					) : analytics && (
						<>
							<section className="grid gap-4 sm:grid-cols-2" aria-label="Booking highlights">
								{[
									{
										title: "Highest booking month",
										entry: extremes.highest,
										icon: <FiTrendingUp aria-hidden="true" />,
										color: "text-emerald-700",
									},
									{
										title: "Lowest booking month",
										entry: extremes.lowest,
										icon: <FiTrendingDown aria-hidden="true" />,
										color: "text-rose-700",
									},
								].map(({ title, entry, icon, color }) => (
									<article key={title} className="rounded-[1.5rem] border border-black/5 bg-white/80 p-6 shadow-lg sm:rounded-[2rem]">
										<div className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
											{icon}
											{title}
										</div>
										{entry && (
											<div className="mt-3 flex items-baseline justify-between gap-4">
												<p className="text-xl font-bold text-base-content">{formatMonth(entry.month)}</p>
												<p className="text-3xl font-black text-base-content">
													{entry.bookings}
													<span className="ml-2 text-sm font-medium text-base-content/55">bookings</span>
												</p>
											</div>
										)}
									</article>
								))}
							</section>

							<section className="rounded-[1.5rem] border border-black/5 bg-white/85 p-5 shadow-xl sm:rounded-[2rem] sm:p-7">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<h2 className="text-xl font-bold">Monthly booking comparison</h2>
										<p className="mt-1 text-sm text-base-content/65">
											Last 12 months compared with the next 3 AI-predicted months
										</p>
									</div>
									<div className="flex flex-wrap gap-4 text-xs font-semibold text-base-content/70">
										<span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#c77b2a]" /> Historical</span>
										<span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-dashed border-green-700 bg-green-600/30" /> AI forecast</span>
									</div>
								</div>
								<div className="mt-6">
									<BookingChart history={analytics.history} predictions={forecast?.predictions || []} />
								</div>
								<p className="mt-2 text-xs leading-5 text-base-content/55">
									Counts use reservation request creation date. All booking statuses are included; this measures demand, not stays by check-in date.
								</p>
							</section>

							<section className="rounded-[1.5rem] border border-green-900/10 bg-white/85 p-5 shadow-lg sm:rounded-[2rem] sm:p-7">
								<div className="flex items-center gap-2">
									<FiTrendingUp className="text-green-700" aria-hidden="true" />
									<h2 className="text-xl font-bold">AI booking prediction</h2>
								</div>
								<p className="mt-3 text-sm leading-6 text-base-content/75">{forecast?.summary}</p>
								{forecast?.predictions?.length > 0 && (
									<div className="mt-5 grid gap-3 md:grid-cols-3">
										{forecast.predictions.map((prediction) => (
											<article key={prediction.month} className="rounded-2xl border border-green-900/10 bg-green-50/70 p-4">
												<p className="text-sm font-semibold text-green-900">{formatMonth(prediction.month)}</p>
												<p className="mt-1 text-2xl font-black text-green-950">
													{prediction.bookings}
													<span className="ml-2 text-sm font-medium">bookings</span>
												</p>
												<p className="mt-2 text-sm leading-5 text-green-950/75">{prediction.reason}</p>
											</article>
										))}
									</div>
								)}
								<p className="mt-4 text-xs leading-5 text-base-content/55">
									Predictions are AI-generated estimates, not guarantees. They are based on monthly booking counts only and may be inaccurate.
									{analytics.generatedAt && ` Updated ${new Date(analytics.generatedAt).toLocaleString()}.`}
								</p>
							</section>
						</>
					)}
				</div>
			</main>
		</MainLayout>
	);
};

export default BookingAnalytics;
