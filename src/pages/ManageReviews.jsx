import React, { useState, useEffect, useContext, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import { FiStar, FiMessageSquare, FiTrash2, FiRefreshCw } from "react-icons/fi";

const getInitials = (name) => {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const ManageReviews = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [reviews, setReviews] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!session) {
			navigate("/log-in");
			return;
		}
		if (profile) {
			if (profile.role !== "admin") {
				navigate("/");
			} else {
				fetchReviews();

				// Sync profiles real-time
				const channel = supabase
					.channel("manage-reviews-profile-sync")
					.on(
						"postgres_changes",
						{ event: "UPDATE", schema: "public", table: "profiles" },
						() => fetchReviews()
					)
					.subscribe();

				return () => {
					supabase.removeChannel(channel);
				};
			}
		}
	}, [session, profile, navigate]);

	const fetchReviews = async () => {
		setLoading(true);
		const { data } = await supabase
			.from("reviews")
			.select("*, profiles(firstname, lastname, avatar_url)")
			.order("created_at", { ascending: false });
		if (data) setReviews(data);
		setLoading(false);
	};

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

	const deleteReview = async (id) => {
		if (!window.confirm("Are you sure you want to delete this review?")) return;
		const { error } = await supabase.from("reviews").delete().eq("id", id);
		if (error) {
			alert(error.message);
		} else {
			fetchReviews();
		}
	};

	const clearAllReviews = async () => {
		if (window.confirm("WARNING: This will permanently delete ALL guest reviews. Are you sure?")) {
			setLoading(true);
			// Deletes all rows by checking for IDs not equal to a dummy UUID
			const { error } = await supabase
				.from("reviews")
				.delete()
				.neq("id", "00000000-0000-0000-0000-000000000000");
			
			if (error) {
				alert("Failed to clear reviews: " + error.message);
			} else {
				setReviews([]);
				alert("All reviews have been successfully cleared.");
			}
			setLoading(false);
		}
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
									Admin Panel
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									Guest Feedback
								</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									Review feedback from your guests. This dashboard is view-only to maintain the integrity of guest reviews.
								</p>
							</div>
							<div className="flex flex-wrap gap-3">
								<button
									onClick={fetchReviews}
									disabled={loading}
									className="btn btn-outline rounded-full"
								>
									<FiRefreshCw className={loading ? "animate-spin" : ""} />
									Refresh
								</button>
								<button onClick={clearAllReviews} className="btn btn-error btn-outline rounded-full" title="Clear All Data">
									<FiTrash2 /> Clear All
								</button>
								<button onClick={() => navigate(-1)} className="btn btn-black rounded-full">
									Back
								</button>
							</div>
						</div>
					</div>

					{!loading && reviews.length > 0 && (
						<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
							<div className="grid gap-8 md:grid-cols-[auto_1fr]">
								<div className="flex flex-col items-center justify-center border-black/10 md:border-r md:pr-12">
									<p className="text-6xl font-black text-slate-900">{ratingSummary.avg}</p>
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
													style={{ width: `${ratingSummary.total > 0 ? (ratingSummary.counts[i] / ratingSummary.total) * 100 : 0}%` }}
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

					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{loading ? (
							<div className="col-span-full py-20 text-center">
								<span className="loading loading-spinner loading-lg text-amber-700"></span>
							</div>
						) : reviews.length === 0 ? (
							<div className="col-span-full p-20 text-center rounded-[2rem] border-2 border-dashed border-black/10 bg-white/30 backdrop-blur opacity-50">
								No reviews yet.
							</div>
						) : (
							reviews.map((rev) => (
								<div key={rev.id} className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur transition-all hover:shadow-2xl sm:rounded-[2rem] md:p-8 flex flex-col justify-between">
									<div>
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-1 text-amber-500 mb-2">
											{[...Array(5)].map((_, i) => (
												<FiStar key={i} className={i < rev.rating ? "fill-current" : ""} />
											))}
										</div>
										<button
											onClick={() => deleteReview(rev.id)}
											className="btn btn-ghost btn-sm text-error"
											title="Delete Review"
										>
											<FiTrash2 />
										</button>
									</div>
									<p className="text-base-content/80 italic mb-4">"{rev.comment}"</p>
									
									{rev.media_url && (
										<div className="mb-4 overflow-hidden rounded-xl border border-black/5">
											{rev.media_type === "video" ? (
												<video
													controls
													className="aspect-video w-full object-cover"
													src={rev.media_url}
												/>
											) : (
												<img
													src={rev.media_url}
													className="aspect-video w-full object-cover"
													alt="Guest upload"
												/>
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
												<p className="text-[0.7rem] uppercase tracking-wider text-slate-400">Verified Guest</p>
											</div>
										</div>
										<span className="text-xs text-slate-400 font-medium">
											{new Date(rev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
										</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ManageReviews;