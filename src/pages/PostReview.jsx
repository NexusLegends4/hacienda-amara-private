import React, { useState, useContext, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import { FiStar, FiUpload, FiSend } from "react-icons/fi";
import DOMPurify from "dompurify";

const getInitials = (name) => {
	const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "G";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const INAPPROPRIATE_WORDS = [
	// English profanity, sexual insults, slurs, and common abbreviations.
	"fuck", "fucker", "fucking", "motherfucker", "fck", "shit", "bullshit", "bitch", "bitches", "ass", "asshole", "arsehole", "bastard", "damn", "goddamn", "cunt", "dick", "dickhead", "pussy", "cock", "cum", "whore", "slut", "hoe", "thot", "jackass", "crap", "wtf", "stfu", "mf", "nigga", "nigger", "faggot", "retard", "sex", "porn", "nude", "naked", "horny", "blowjob", "handjob", "masturbate", "orgasm", "vagina", "penis",
	// Tagalog and Filipino profanity, including common combined spellings.
	"puta", "pota", "putangina", "putang ina", "putanginamo", "putang ina mo", "p tangina", "tangina", "tang ina", "tanginamo", "gago", "gaga", "bobo", "boba", "tanga", "ulol", "ulul", "tarantado", "kupal", "pakyu", "pak yu", "pakshet", "pucha", "letse", "leche", "lintik", "bwisit", "buwisit", "buwakanangina", "kantot", "kantutan", "kantutin", "jakol", "jakulan", "puke", "puki", "titi", "burat", "bayag", "iyot", "libog", "malibog", "hinayupak", "hayop ka", "siraulo", "sira ulo", "buwang",
];

const normalizeForModeration = (value) => String(value || "")
	.normalize("NFKD")
	.replace(/[\u0300-\u036f]/g, "")
	.toLowerCase()
	.replace(/[0]/g, "o")
	.replace(/[1!|]/g, "i")
	.replace(/[3]/g, "e")
	.replace(/[4@]/g, "a")
	.replace(/[5$]/g, "s")
	.replace(/([aeiou])\1+/g, "$1")
	.replace(/([b-df-hj-np-tv-z])\1{2,}/g, "$1$1")
	.replace(/[^a-z0-9]+/g, " ")
	.replace(/\b(?:[a-z0-9]\s+){2,}[a-z0-9]\b/g, (spelled) => spelled.replace(/\s+/g, ""))
	.trim();

const NORMALIZED_INAPPROPRIATE_WORDS = INAPPROPRIATE_WORDS.map(normalizeForModeration);

function containsInappropriate(text) {
	const normalized = ` ${normalizeForModeration(text)} `;
	return NORMALIZED_INAPPROPRIATE_WORDS.some((word) => word && normalized.includes(` ${word} `));
}

const PostReview = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [reviewerName, setReviewerName] = useState("");
	const [rating, setRating] = useState(5);
	const [comment, setComment] = useState("");
	const [file, setFile] = useState(null);
	const [existingMedia, setExistingMedia] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [submitError, setSubmitError] = useState("");

	useEffect(() => {
		const profileName = [profile?.firstname, profile?.lastname].filter(Boolean).join(" ").trim();
		const accountEmail = (profile?.email || session?.user?.email || "").trim().toLowerCase();
		let bookingName = "";
		let bookingEmail = "";
		try {
			bookingName = localStorage.getItem("hacienda-reviewer-name") || "";
			bookingEmail = (localStorage.getItem("hacienda-reviewer-email") || "").trim().toLowerCase();
		} catch {
			// Keep the profile name available if browser storage is disabled.
		}
		const belongsToCurrentAccount = !session || !bookingEmail || bookingEmail === accountEmail;
		const suggestedName = belongsToCurrentAccount && bookingName ? bookingName : profileName;
		if (suggestedName) setReviewerName(suggestedName);
	}, [profile?.firstname, profile?.lastname, profile?.email, session]);

	useEffect(() => {
		const fetchExistingReview = async () => {
			if (!session) return;
			const { data } = await supabase
				.from("reviews")
				.select("*")
				.eq("profile_id", session.user.id)
				.maybeSingle();
			if (data) {
				setReviewerName(data.reviewer_name || [profile?.firstname, profile?.lastname].filter(Boolean).join(" ").trim());
				setRating(data.rating);
				setComment(data.comment);
				if (data.media_url) {
					setExistingMedia({ url: data.media_url, type: data.media_type });
				}
			}
		};
		fetchExistingReview();
	}, [session, profile?.firstname, profile?.lastname]);

	const handlePost = async (e) => {
		e.preventDefault();
		if (reviewerName.trim().length < 2) {
			setSubmitError("Please enter a name with at least 2 characters.");
			return;
		}
		if (comment.length > 1000) {
			setSubmitError("Review comments must be 1,000 characters or fewer.");
			return;
		}

		// Check for inappropriate words in comment
		if (containsInappropriate(comment)) {
			setSubmitError("Your review contains inappropriate language. Please keep it respectful.");
			return;
		}

		setUploading(true);
		setSubmitError("");

		try {
			let mediaUrl = null;
			if (file) {
				const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
				const ownerFolder = session?.user?.id || `guest-${crypto.randomUUID()}`;
				const fileName = `${ownerFolder}/${Date.now()}-${cleanFileName}`;

				const { error: uploadError } = await supabase.storage
					.from("review-media")
					.upload(fileName, file, { upsert: true });

				if (uploadError) {
					console.error("Review media upload failed:", uploadError);
					throw new Error("The media could not be uploaded. Please try another file or submit without media.");
				}
				const { data: publicUrl } = supabase.storage.from("review-media").getPublicUrl(fileName);
				mediaUrl = publicUrl.publicUrl;
			}

			const review = {
				profile_id: session?.user?.id || null,
				reviewer_name: DOMPurify.sanitize(reviewerName.trim()),
				rating,
				comment: DOMPurify.sanitize(comment.trim()),
				media_url: mediaUrl || (file ? null : existingMedia?.url) || null,
				media_type: file ? (file.type.startsWith("video") ? "video" : "image") : (existingMedia?.type || null),
			};
			const query = session
				? supabase.from("reviews").upsert(review, { onConflict: "profile_id" })
				: supabase.from("reviews").insert(review);
			const { error } = await query;

			if (error) throw error;
			alert("Review posted! Thank you.");
			navigate("/reviews");
		} catch (error) {
			console.error("Review submission failed:", error);
			setSubmitError(error?.message || "Unable to submit your review. Please try again.");
		} finally {
			setUploading(false);
		}
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-4xl space-y-6">
					<div className="hero min-h-[180px] rounded-[1.5rem] bg-white sm:min-h-[220px] sm:rounded-[2rem]">
						<div className="hero-content text-center text-base-content">
							<div className="max-w-md">
								<h1 className="mb-2 text-4xl font-black uppercase tracking-tighter italic text-slate-900">Feedback</h1>
								<p className="mb-0 text-xs font-bold leading-relaxed text-slate-700 uppercase tracking-[0.3em]">
									Share your Hacienda Amara Story
								</p>
							</div>
						</div>
					</div>

						<div className="rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-xl sm:rounded-[3rem] md:p-12">
						{submitError && <p role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{submitError}</p>}
						<div className="mb-10 flex items-center gap-4 border-b border-black/5 pb-8">
							<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-lg font-bold text-slate-800 shadow-md">
								{profile?.avatar_url ? (
									<img src={profile.avatar_url} className="h-full w-full object-cover" alt="Profile" />
								) : (
									getInitials(`${profile?.firstname || ""} ${profile?.lastname || ""}`)
								)}
							</div>
							<div className="w-full">
								<p className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-slate-400">Posting as</p>
								<input
									type="text"
									className="input input-bordered mt-2 w-full rounded-xl font-bold"
									placeholder="Name used during registration"
									value={reviewerName}
									onChange={(e) => setReviewerName(e.target.value)}
									required
									minLength="2"
								/>
								<p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-1">Customer review</p>
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
									className="textarea textarea-ghost h-48 rounded-2xl bg-black/5 p-4 text-base font-medium transition-all border-0 ring-1 ring-black/5 focus:bg-white sm:p-6 sm:text-lg"
									placeholder="Tell us about the pool, the villa, and our service..."
									value={comment}
									maxLength={1000}
									onChange={(e) => setComment(e.target.value)}
									required
								/>
								<p className="mt-2 text-right text-xs font-medium text-slate-500" aria-live="polite">
									{comment.length.toLocaleString()} / 1,000 characters
								</p>
							</div>
							</div>

							<div className="flex flex-col justify-between">
							<div className="form-control">
								<label className="label-text font-black uppercase tracking-widest text-slate-400 mb-4 block">Share Photos or Videos in Your Review</label>
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
										{file ? file.name : "Click to upload a review photo or video"}
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
