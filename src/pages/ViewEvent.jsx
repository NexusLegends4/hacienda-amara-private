import React, { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { useContext } from "react";
import { SessionContext } from "../contexts/SessionContext";
import { QRCodeSVG } from "qrcode.react";

const HOME_BACKGROUND_IMAGE =
	"https://scontent.fmnl9-6.fna.fbcdn.net/v/t39.30808-6/494369075_122128145408749963_4990497671908646009_n.jpg?stp=cp6_dst-jpegr_tt6&_nc_cat=110&ccb=1-7&_nc_sid=7b2446&_nc_ohc=_bIjtQyapPkQ7kNvwGyjTEL&_nc_oc=Adqs_72QnpeiESmu27Z5jwKEdvlzqAcLaFBXBG4oCyJCT9SIGVUdoqhTiyTTjh4lpro&_nc_zt=23&se=-1&_nc_ht=scontent.fmnl9-6.fna&_nc_gid=AsNb17ujiPpWRbYFkqG07w&_nc_ss=7a3a8&oh=00_Af136LY8WbVVP2OmYbCjcpfh2N0e4mOXOcsRxVzAEKKHmg&oe=69D7F2D5";

const ViewEvent = () => {
	const { eventId } = useParams();
	const [event, setEvent] = useState(null);
	const [loading, setLoading] = useState(true);
	const { profile } = useContext(SessionContext);

	useEffect(() => {
		// Fetch the selected event whenever the route parameter changes.
		const fetchEvent = async () => {
			setLoading(true);
			const { data, error } = await supabase
				.from("events")
				.select()
				.eq("id", eventId)
				.single();

			if (error) {
				alert(error.message || error);
				setEvent(null);
			} else {
				setEvent(data);
			}

			setLoading(false);
		};

		if (eventId) fetchEvent();
	}, [eventId]);

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-5xl">
					<div className="rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur-xl md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
									Event Details
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									{event?.title || "Loading event details"}
								</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									View the full schedule, location, and QR code for this event.
								</p>
							</div>
							{profile?.role === "admin" && event && (
								<Link
									to={`/edit-event/${event.id}`}
									className="btn btn-black rounded-full"
								>
									Edit Event
								</Link>
							)}
						</div>

						<div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
							<div className="rounded-3xl border border-base-200 bg-white/90 p-6 shadow-sm">
								{loading && <p>Loading event...</p>}

								{!loading && !event && <p>Event not found.</p>}

								{event && (
									<div className="space-y-4 text-sm leading-6 text-base-content/80">
										<div className="grid gap-3">
											<p>
												<span className="font-semibold text-base-content">Start Date:</span>{" "}
												{event.start_date}
											</p>
											<p>
												<span className="font-semibold text-base-content">End Date:</span>{" "}
												{event.end_date}
											</p>
											<p>
												<span className="font-semibold text-base-content">Start Time:</span>{" "}
												{event.start_time}
											</p>
											<p>
												<span className="font-semibold text-base-content">End Time:</span>{" "}
												{event.end_time}
											</p>
											<p>
												<span className="font-semibold text-base-content">Location:</span>{" "}
												{event.location}
											</p>
										</div>

										<div className="rounded-2xl bg-base-100 p-5">
											<p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/55">
												Description
											</p>
											<p className="mt-2 text-base-content/80">
												{event.description || "No description provided."}
											</p>
										</div>
									</div>
								)}
							</div>

							<div className="rounded-3xl border border-base-200 bg-white/90 p-6 shadow-sm">
								<p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-base-content/60">
									Scan to open this event
								</p>
								<div className="flex flex-col items-center gap-4">
									<QRCodeSVG
										value={`${window.location.origin}/view-event/${event?.id || ""}`}
										size={220}
										includeMargin
										className="rounded-2xl bg-white p-3 shadow-sm"
									/>
									<div className="text-center text-sm text-base-content/70">
										Scan this QR code to open the event page directly on another
										device.
									</div>
								</div>
							</div>
						</div>

						<div className="mt-8 flex justify-end">
							<Link to="/events" className="btn btn-black rounded-full">
								Back to Events
							</Link>
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ViewEvent;
