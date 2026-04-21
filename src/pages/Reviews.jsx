import React, { useState, useEffect, useContext, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { FiStar, FiMessageSquare, FiEdit2 } from "react-icons/fi";
import { NavLink, useNavigate } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext";

const getInitials = (name) => {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const Reviews = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [reviews, setReviews] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchReviews = async () => {
		const { data } = await supabase
			.from("reviews")
			.select("*, profiles(firstname, lastname, avatar_url)")
			.order("created_at", { ascending: false });
		if (data) setReviews(data);
		setLoading(false);
	};

	useEffect(() => {
		fetchReviews();

		// Listen for profile changes to keep reviewer info fresh
		const profileChannel = supabase
			.channel("reviews-profile-sync")
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "profiles" },
				() => fetchReviews()
			)
			.subscribe();

		return () => {
			supabase.removeChannel(profileChannel);
		};
	}, []);

	const ratingSummary = useMemo(() => {
		if (reviews.length === 0) return { avg: "0.0", total: 0, counts: [0, 0, 0, 0, 0] };
		const total = reviews.length;
		const sum = reviews.reduce((acc, rev) => acc + rev.rating, 0);
		const avg = (sum / total).toFixed(1);
		const counts = [5, 4, 3, 2, 1].map(
			(star) => reviews.filter((r) => Math.floor(r.rating) === star || (star === 5 && r.rating === 5)).length
		);
		return { avg, total, counts };
	}, [reviews]);

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
									Guest Experience
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									Customer Reviews
								</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									See what our guests have to say about their stay at Hacienda Amara.
								</p>
							</div>
							<div className="flex flex-wrap gap-3">
								{profile?.role === "client" && (
									<NavLink to="/post-review" className="btn btn-black rounded-full px-8">
										Write a Review
									</NavLink>
								)}
								<button onClick={() => navigate(-1)} className="btn btn-outline rounded-full px-8">
									Back
								</button>
							</div>
						</div>
					</div>

					{profile?.role === "client" && (
						<div className="hero rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl mb-6 min-h-[280px] sm:min-h-[400px]" style={{ backgroundImage: "url(https://scontent.fmnl9-3.fna.fbcdn.net/v/t39.30808-6/498621173_122130914540749963_238405466557103005_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=2a1932&_nc_eui2=AeFbSN8TdpWfyxBZrWSC_FxAelQG7z5WU_J6VAbvPlZT8jlKAoCsk3Ai6CCiD2DZT9WadKTyFNCeB9LrzyNCNd5Y&_nc_ohc=cfCLJUVzao4Q7kNvwHkxwNh&_nc_oc=AdpE0JFQrBnPMHKnH6dqabs-xqQOdPvHsw262QkOci5yTGgiK6vHwqedamAx6AmlLps&_nc_zt=23&_nc_ht=scontent.fmnl9-3.fna&_nc_gid=hvaparAoG7w4R15a9Bp1BQ&_nc_ss=7a3a8&oh=00_Af1xxj9ZwlTVMjU_VoVV6LVK_iESz0Nd4JnGEcT1ZcEErg&oe=69E232C7)", backgroundPosition: "center" }}>
							<div className="hero-overlay bg-black/60 backdrop-blur-[2px]"></div>
							<div className="hero-content text-neutral-content text-center p-8">
								<div className="max-w-md">
									<h1 className="mb-4 text-5xl font-black uppercase tracking-tighter">Guest Reviews</h1>
									<p className="mb-6 text-sm font-medium opacity-90 leading-relaxed uppercase tracking-[0.2em]">
										Hacienda Amara Experience
									</p>
									<div className="flex justify-center gap-1 text-amber-400 text-3xl">
										<FiStar className="fill-current" /> <FiStar className="fill-current" /> <FiStar className="fill-current" /> <FiStar className="fill-current" /> <FiStar className="fill-current" />
									</div>
								</div>
							</div>
						</div>
					)}

					{!loading && reviews.length > 0 && (
						<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
							<div className="grid gap-8 md:grid-cols-[auto_1fr]">
								<div className="flex flex-col items-center justify-center border-black/10 md:border-r md:pr-12">
									<p className="text-7xl font-black text-slate-900">{ratingSummary.avg}</p>
									<div className="mt-2 flex gap-1 text-xl text-amber-500">
										{[...Array(5)].map((_, i) => (
											<FiStar key={i} className={i < Math.round(Number(ratingSummary.avg)) ? "fill-current" : ""} />
										))}
									</div>
									<p className="mt-2 text-sm font-medium text-slate-500">{ratingSummary.total} reviews</p>
								</div>
								<div className="flex flex-col justify-center space-y-2">
									{[5, 4, 3, 2, 1].map((star, i) => (
										<div key={star} className="flex items-center gap-4">
											<span className="w-3 text-xs font-bold text-slate-500">{star}</span>
											<div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
												<div
													className="h-full bg-amber-500 transition-all duration-500"
													style={{ width: `${(ratingSummary.counts[i] / ratingSummary.total) * 100}%` }}
												/>
											</div>
											<span className="w-8 text-right text-xs font-medium text-slate-400">
												{ratingSummary.counts[i]}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{loading ? (
						<div className="flex justify-center py-20">
							<span className="loading loading-spinner loading-lg text-amber-700"></span>
						</div>
					) : reviews.length === 0 ? (
						<div className="text-center py-20 rounded-[2rem] border-2 border-dashed border-black/10 bg-white/30 backdrop-blur">
							<FiMessageSquare className="mx-auto text-4xl mb-4 opacity-20" />
							<p className="text-slate-500">No reviews yet. Be the first to share your experience!</p>
						</div>
					) : (
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{reviews.map((rev) => (
								<div key={rev.id} className="relative rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-xl backdrop-blur transition-all hover:shadow-2xl sm:p-8 md:p-10 flex flex-col justify-between overflow-hidden">
									<div className="absolute top-4 right-8 text-8xl font-serif text-black/5 pointer-events-none">“</div>
									<div>
										<div className="flex items-center gap-1 text-amber-500 mb-4">
											{[...Array(5)].map((_, i) => (
												<FiStar key={i} className={i < rev.rating ? "fill-current" : ""} />
											))}
										</div>
										<p className="text-slate-700 text-lg mb-6 leading-relaxed font-medium">"{rev.comment}"</p>

										{rev.media_url && (
											<div className="mb-6 overflow-hidden rounded-2xl border border-black/5 shadow-inner">
												{rev.media_type === "video" ? (
													<video controls className="aspect-video w-full object-cover" src={rev.media_url} />
												) : (
													<img src={rev.media_url} className="aspect-video w-full object-cover" alt="Guest stay" />
												)}
											</div>
										)}
									</div>

									<div className="flex items-center justify-between border-t border-black/5 pt-6 mt-4">
										<div className="flex items-center gap-3">
											<div className="h-10 w-10 overflow-hidden rounded-full bg-[#f4e0c6] flex items-center justify-center font-bold text-[#8b5e34] text-xs shadow-inner">
												{rev.profiles?.avatar_url ? (
													<img src={rev.profiles.avatar_url} className="h-full w-full object-cover" alt="Profile" />
												) : (
													getInitials(`${rev.profiles?.firstname || ""} ${rev.profiles?.lastname || ""}`)
												)}
											</div>
											<div>
												<p className="font-bold text-slate-900 text-sm">{rev.profiles?.firstname} {rev.profiles?.lastname}</p>
												<p className="text-[0.65rem] uppercase tracking-widest font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">Verified Guest</p>
											</div>
										</div>
										<div className="flex flex-col items-end gap-1">
											<span className="text-xs text-slate-400 font-medium">
												{new Date(rev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
											</span>
											{rev.profile_id === session?.user?.id && (
												<NavLink to="/post-review" className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-[#8b5e34] hover:opacity-75 transition-opacity">
													<FiEdit2 className="text-[10px]" />
													Edit My Review
												</NavLink>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</MainLayout>
	);
};

export default Reviews;