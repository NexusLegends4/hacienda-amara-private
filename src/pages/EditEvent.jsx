import React, { useState, useEffect, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import { useParams, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabase";
import EventForm from "../components/EventForm";
import { SessionContext } from "../contexts/SessionContext";

const EditEvent = () => {
	const { eventId } = useParams();
	const [event, setEvent] = useState(null);
	const navigate = useNavigate();
	const { session, profile } = useContext(SessionContext);

	useEffect(() => {
		// Users are redirected away from editing so the route stays admin-only.
		if (profile && profile.role !== "admin") {
			navigate(`/view-event/${eventId}`, { replace: true });
		}
	}, [session, profile, navigate, eventId]);

	useEffect(() => {
		// Load the selected event before rendering the edit form.
		const fetchEvent = async () => {
			const { data: eventData, error: eventError } = await supabase
				.from("events")
				.select()
				.eq("id", eventId)
				.single();
			if (eventError) alert(eventError);
			if (eventData) setEvent(eventData);
		};

		fetchEvent();
	}, [eventId]);

	if (session && profile === null) {
		return (
			<MainLayout>
				<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
					<div className="mx-auto max-w-5xl rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur-xl md:p-8">
						Loading event permissions...
					</div>
				</div>
			</MainLayout>
		);
	}

	if (!session) {
		return (
			<MainLayout>
				<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
					<div className="mx-auto max-w-3xl rounded-[1.5rem] border border-black/5 bg-white/75 p-6 text-center shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<h1 className="text-2xl font-black text-base-content">Admin access required</h1>
						<p className="mt-3 text-sm leading-6 text-base-content/70">
							Please log in with an administrator account to edit events.
						</p>
						<Link to="/log-in" className="btn btn-black mt-6 rounded-full">
							Log In
						</Link>
					</div>
				</div>
			</MainLayout>
		);
	}

	if (profile && profile.role !== "admin") {
		return (
			<MainLayout>
				<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
					<div className="mx-auto max-w-3xl rounded-[1.5rem] border border-black/5 bg-white/75 p-6 text-center shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<h1 className="text-2xl font-black text-base-content">Access restricted</h1>
						<p className="mt-3 text-sm leading-6 text-base-content/70">
							This page is available only to administrators.
						</p>
						<Link to="/" className="btn btn-black mt-6 rounded-full">
							Back Home
						</Link>
					</div>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-5xl rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur-xl md:p-8">
					<div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
						<div className="max-w-2xl">
							<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
								Edit Event
							</p>
							<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
								Refine event details
							</h1>
							<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
								Update the schedule, location, and description before saving
								the changes.
							</p>
						</div>
					</div>
					<EventForm eventData={event} />
				</div>
			</div>
		</MainLayout>
	);
};

export default EditEvent;
