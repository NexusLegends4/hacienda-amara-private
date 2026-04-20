import React, { useMemo, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";
import { FiTrendingUp, FiSun, FiCalendar, FiCheck } from "react-icons/fi";
import { SessionContext } from "../contexts/SessionContext";

const RoomPricing = () => {
	const navigate = useNavigate();
	const { session, profile } = useContext(SessionContext);

	const pricingData = [
		{ id: 1, name: "Day Time (9 Hours)", priceRange: "₱6,999 - ₱7,999", basePrice: 6999, features: ["Check In: 9:00 AM", "Check Out: 6:00 PM", "Good for 20 Pax"] },
		{ id: 2, name: "Night Time (9 Hours)", priceRange: "₱7,999 - ₱8,999", basePrice: 7999, features: ["Check In: 9:00 PM", "Check Out: 6:00 AM", "Good for 20 Pax"] },
		{ id: 3, name: "Overnight (21 Hours)", priceRange: "₱14,999 - ₱17,999", basePrice: 14999, features: ["Option 1: 9 AM - 6 AM", "Option 2: 9 PM - 6 PM", "Good for 20 Pax"] },
	];

	const pricingDetails = useMemo(() => {
		let multiplier = 1.0;
		let reason = "Standard Rate";
		return { multiplier, reason };
	}, []);

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
									Rates & Availability
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									Room Pricing
								</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									View our current rates and inclusions for your next stay.
									<br />
									<span className="font-bold text-amber-700 block mt-2">Rates: Prices are for 20 pax. Additional pax: ₱200/head.</span>
									<span className="text-emerald-700 font-bold italic">Kids 8 years old and below are FREE!</span>
								</p>
							</div>
							<button onClick={() => navigate(-1)} className="btn btn-black rounded-full">
								Back
							</button>
						</div>
					</div>

					<div className="grid gap-6 md:grid-cols-3">
						{pricingData.map((room) => (
							<div key={room.id} className="rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-xl backdrop-blur transition-transform hover:scale-[1.02]">
								<h2 className="text-xl font-bold text-base-content">{room.name}</h2>
								<div className="mt-4 flex items-baseline gap-1">
									<span className="text-4xl font-black text-slate-900">
										{room.priceRange}
									</span>
									<span className="text-sm text-base-content/50">/ night</span>
								</div>
								<p className="mt-1 text-xs text-amber-600 font-medium italic">
									Base: ₱{room.basePrice.toLocaleString()}
								</p>

								<div className="mt-8 space-y-3">
									{room.features.map((f) => (
										<div key={f} className="flex items-center gap-3 text-sm text-base-content/70">
											<div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
												<FiCheck className="text-xs" />
											</div>
											{f}
										</div>
									))}
								</div>

						{session && profile?.role === "client" && (
							<button onClick={() => navigate("/rooms")} className="btn btn-black w-full mt-8 rounded-full">
								Reserve Now
							</button>
						)}
							</div>
						))}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default RoomPricing;