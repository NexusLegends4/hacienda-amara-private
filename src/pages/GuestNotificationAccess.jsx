import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCalendar, FiMail, FiPhone } from "react-icons/fi";

const GuestNotificationAccess = () => {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [checkIn, setCheckIn] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setLoading(true);

		const { data, error } = await supabase.rpc("find_guest_reservation", {
			reservation_email: email.trim(),
			reservation_phone: phone.trim(),
			reservation_check_in: checkIn,
		});

		setLoading(false);

		if (error) {
			alert(error.message);
			return;
		}

		if (!data?.length || !data[0].reservation_token) {
			alert("No reservation matched those details.");
			return;
		}

		navigate(`/guest-notifications/${data[0].reservation_token}`);
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-8 sm:px-4 sm:py-12">
				<div className="mx-auto max-w-2xl">
					<div className="rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-2xl backdrop-blur-xl sm:p-9">
						<div className="flex items-center gap-3">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
								<FiBell className="text-2xl" />
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.24em] text-base-content/50">
									Guest Access
								</p>
								<h1 className="text-3xl font-black tracking-tight text-base-content md:text-4xl">
									Check Reservation Notification
								</h1>
							</div>
						</div>

						<p className="mt-4 text-sm leading-6 text-base-content/70">
							Enter the same details used when you submitted your reservation. Only the matching booking notification will be shown.
						</p>

						<form onSubmit={handleSubmit} className="mt-8 space-y-5">
							<label className="form-control">
								<span className="label-text font-semibold">Email Address</span>
								<div className="relative">
									<FiMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
									<input
										type="email"
										className="input input-bordered w-full rounded-2xl pl-11"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										placeholder="you@example.com"
										required
									/>
								</div>
							</label>

							<label className="form-control">
								<span className="label-text font-semibold">Phone Number</span>
								<div className="relative">
									<FiPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
									<input
										type="tel"
										className="input input-bordered w-full rounded-2xl pl-11"
										value={phone}
										onChange={(event) => setPhone(event.target.value)}
										placeholder="09XX XXX XXXX"
										required
										minLength="7"
									/>
								</div>
							</label>

							<label className="form-control">
								<span className="label-text font-semibold">Reservation Date</span>
								<div className="relative">
									<FiCalendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
									<input
										type="date"
										className="input input-bordered w-full rounded-2xl pl-11"
										value={checkIn}
										onChange={(event) => setCheckIn(event.target.value)}
										required
									/>
								</div>
							</label>

							<button type="submit" className="btn btn-black w-full rounded-2xl" disabled={loading}>
								{loading ? <span className="loading loading-spinner"></span> : <FiBell />}
								{loading ? "Checking..." : "View Notification"}
							</button>
						</form>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default GuestNotificationAccess;
