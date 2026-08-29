import React, { useState, useContext, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import { FiStar, FiUpload, FiSend } from "react-icons/fi";
import DOMPurify from "dompurify";

const getInitials = (name) => {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const PostReview = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [rating, setRating] = useState(5);
	const [comment, setComment] = useState("");
	const [file, setFile] = useState(null);
	const [existingMedia, setExistingMedia] = useState(null);
	const [uploading, setUploading] = useState(false);

	useEffect(() => {
		if (!session || !["admin", "staff"].includes(profile?.role)) {
			navigate("/");
			return;
		}

		const fetchExistingReview = async () => {
			const { data } = await supabase
				.from("reviews")
				.select("*")
				.eq("profile_id", session.user.id)
				.maybeSingle();
			if (data) {
				setRating(data.rating);
				setComment(data.comment);
				if (data.media_url) {
					setExistingMedia({ url: data.media_url, type: data.media_type });
				}
			}
		};
		fetchExistingReview();
	}, [session, profile, navigate]);

	const handlePost = async (e) => {
		e.preventDefault();
		if (!session) return alert("Please log in to post a review.");
		setUploading(true);

		let mediaUrl = null;
		if (file) {
			// Sanitize filename and create a structured path
			const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
			const fileName = `${session.user.id}/${Date.now()}-${cleanFileName}`;
			
			const { data, error: uploadError } = await supabase.storage
				.from("review-media")
				.upload(fileName, file, { upsert: true });

			if (!uploadError) {
				const { data: publicUrl } = supabase.storage.from("review-media").getPublicUrl(fileName);
				mediaUrl = publicUrl.publicUrl;
			} else {
				alert("Media upload failed, but posting comment...");
				console.error(uploadError);
			}
		}

		const { error } = await supabase.from("reviews").upsert([
			{
				profile_id: session.user.id,
				rating,
				comment: DOMPurify.sanitize(comment),
				media_url: mediaUrl || (file ? null : existingMedia?.url) || null,
				media_type: file ? (file.type.startsWith("video") ? "video" : "image") : (existingMedia?.type || null)
			},
		], { onConflict: 'profile_id' });

		if (error) {
			alert(error.message);
		} else {
			alert("Review posted! Thank you.");
			navigate("/reviews");
		}
		setUploading(false);
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-4xl space-y-6">
					<div className="hero rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl min-h-[280px] sm:min-h-[400px]" style={{ backgroundImage: "url(https://scontent.fmnl9-3.fna.fbcdn.net/v/t39.30808-6/498621173_122130914540749963_238405466557103005_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=2a1932&_nc_eui2=AeFbSN8TdpWfyxBZrWSC_FxAelQG7z5WU_J6VAbvPlZT8jlKAoCsk3Ai6CCiD2DZT9WadKTyFNCeB9LrzyNCNd5Y&_nc_ohc=cfCLJUVzao4Q7kNvwHkxwNh&_nc_oc=AdpE0JFQrBnPMHKnH6dqabs-xqQOdPvHsw262QkOci5yTGgiK6vHwqedamAx6AmlLps&_nc_zt=23&_nc_ht=scontent.fmnl9-3.fna&_nc_gid=hvaparAoG7w4R15a9Bp1BQ&_nc_ss=7a3a8&oh=00_Af1xxj9ZwlTVMjU_VoVV6LVK_iESz0Nd4JnGEcT1ZcEErg&oe=69E232C7)", backgroundPosition: "center" }}>
						<div className="hero-overlay bg-black/60 backdrop-blur-sm"></div>
						<div className="hero-content text-neutral-content text-center">
							<div className="max-w-md">
								<h1 className="mb-2 text-4xl font-black uppercase tracking-tighter italic">Feedback</h1>
								<p className="mb-0 text-xs font-bold opacity-80 leading-relaxed uppercase tracking-[0.3em]">
									Share your Hacienda Amara Story
								</p>
							</div>
						</div>
					</div>

					<div className="rounded-[2.5rem] border border-black/5 bg-white/80 p-6 shadow-xl backdrop-blur-xl sm:rounded-[3rem] md:p-12">
						<div className="mb-10 flex items-center gap-4 border-b border-black/5 pb-8">
							<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-lg font-bold text-slate-800 shadow-md">
								{profile?.avatar_url ? (
									<img src={profile.avatar_url} className="h-full w-full object-cover" alt="Profile" />
								) : (
									getInitials(`${profile?.firstname || ""} ${profile?.lastname || ""}`)
								)}
							</div>
							<div>
								<p className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-slate-400">Posting as</p>
								<p className="text-xl font-black text-slate-900 leading-tight">{profile?.firstname} {profile?.lastname}</p>
								<p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-1">Verified Guest</p>
							</div>
						</div>
						<form onSubmit={handlePost} className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
							<div className="space-y-8 border-b border-black/5 pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12">
							<div className="form-control">
								<label className="label-text font-black uppercase tracking-widest text-slate-400 mb-4 block">Your Rating</label>
								<div className="rating rating-lg rating-half" onChange={(e) => setRating(parseFloat(e.target.value))}>
									<input type="radio" name="rating-input" className="rating-hidden" onChange={() => setRating(0)} checked={rating === 0} />
									<input type="radio" name="rating-input" value="0.5" className="mask mask-star-2 mask-half-1 bg-amber-400" checked={rating === 0.5} />
									<input type="radio" name="rating-input" value="1" className="mask mask-star-2 mask-half-2 bg-amber-400" checked={rating === 1} />
									<input type="radio" name="rating-input" value="1.5" className="mask mask-star-2 mask-half-1 bg-amber-400" checked={rating === 1.5} />
									<input type="radio" name="rating-input" value="2" className="mask mask-star-2 mask-half-2 bg-amber-400" checked={rating === 2} />
									<input type="radio" name="rating-input" value="2.5" className="mask mask-star-2 mask-half-1 bg-amber-400" checked={rating === 2.5} />
									<input type="radio" name="rating-input" value="3" className="mask mask-star-2 mask-half-2 bg-amber-400" checked={rating === 3} />
									<input type="radio" name="rating-input" value="3.5" className="mask mask-star-2 mask-half-1 bg-amber-400" checked={rating === 3.5} />
									<input type="radio" name="rating-input" value="4" className="mask mask-star-2 mask-half-2 bg-amber-400" checked={rating === 4} />
									<input type="radio" name="rating-input" value="4.5" className="mask mask-star-2 mask-half-1 bg-amber-400" checked={rating === 4.5} />
									<input type="radio" name="rating-input" value="5" className="mask mask-star-2 mask-half-2 bg-amber-400" checked={rating === 5} />
								</div>
								<p className="mt-2 text-[0.65rem] font-bold text-slate-400 uppercase tracking-tighter">Current Score: {rating} Stars</p>
							</div>

							<div className="form-control">
								<label className="label-text font-black uppercase tracking-widest text-slate-400 mb-4 block">Comment</label>
								<textarea
									className="textarea textarea-ghost h-48 rounded-2xl bg-black/5 text-lg font-medium p-6 focus:bg-white transition-all border-0 ring-1 ring-black/5"
									placeholder="Tell us about the pool, the villa, and our service..."
									value={comment}
									onChange={(e) => setComment(e.target.value)}
									required
								/>
							</div>
							</div>

							<div className="flex flex-col justify-between">
							<div className="form-control">
								<label className="label-text font-black uppercase tracking-widest text-slate-400 mb-4 block">Visual Experience</label>
								{existingMedia && !file && (
									<div className="mb-4 relative group">
										<p className="text-[0.65rem] font-bold mb-2 opacity-50 uppercase tracking-widest text-[#8b5e34]">Current Media:</p>
										<div className="overflow-hidden rounded-xl border border-black/5 aspect-video w-48 bg-black/5">
											{existingMedia.type === 'video' ? (
												<video src={existingMedia.url} className="h-full w-full object-cover" />
											) : (
												<img src={existingMedia.url} className="h-full w-full object-cover" alt="Existing" />
											)}
										</div>
										<p className="text-[10px] mt-1 text-amber-700 italic">Uploading a new file will replace this one.</p>
									</div>
								)}
								<label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-black/10 bg-black/5 p-10 transition hover:bg-black/10">
									<FiUpload className="text-2xl opacity-40" />
									<span className="mt-2 text-sm opacity-60">
										{file ? file.name : "Click to upload media"}
									</span>
									<input
										type="file"
										className="hidden"
										accept="image/*,video/*"
										onChange={(e) => setFile(e.target.files[0])}
									/>
								</label>
							</div>

							<div className="mt-8 space-y-3">
								<button
									disabled={uploading}
									className="btn btn-black w-full rounded-full h-16 text-lg"
								>
									{uploading ? (
										<span className="loading loading-spinner"></span>
									) : (
										<>
											<FiSend /> Submit Review
										</>
									)}
								</button>
								<button 
									type="button"
									onClick={() => navigate(-1)} 
									className="btn btn-ghost w-full rounded-full uppercase tracking-widest text-[0.65rem] font-black opacity-40 hover:opacity-100"
								>
									Cancel
								</button>
							</div>
							</div>
						</form>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default PostReview;