import React, { useState, useEffect, useContext, useCallback } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import EventCard from "../components/EventCard";
import { SessionContext } from "../contexts/SessionContext";
import { Link } from "react-router-dom";

const Events = () => {
	const [events, setEvents] = useState([]);
	const [registrations, setRegistrations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const { profile } = useContext(SessionContext);

	const loadData = useCallback(async () => {
		setLoading(true);
		setLoadError("");
		const { data: eventsData, error: eventsError } = await supabase
			.from("events")
			.select()
			.order("start_date", { ascending: true });
		if (eventsError) {
			console.error("Unable to load events:", eventsError);
			setLoadError("Events could not be loaded. Check your connection and try again.");
			setLoading(false);
			return;
		}
		setEvents(eventsData || []);

		if (profile) {
			const { data: registrationsData, error: registrationsError } = await supabase
				.from("registrations")
				.select()
				.eq("profile_id", profile.id);
			if (registrationsError) console.error("Unable to load event registrations:", registrationsError);
			if (registrationsData) setRegistrations(registrationsData);
		} else {
			setRegistrations([]);
		}
		setLoading(false);
	}, [profile]);

	useEffect(() => {
		const loadTimer = window.setTimeout(() => loadData(), 0);
		return () => window.clearTimeout(loadTimer);
	}, [loadData]);

	const formatDate = (dateStr) => {
		if (!dateStr) return "";
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
	};

	const formatTime = (timeStr) => {
		if (!timeStr) return "";
		const [hours, minutes] = timeStr.split(":");
		const hour = parseInt(hours);
		const ampm = hour >= 12 ? "PM" : "AM";
		const displayHour = hour % 12 || 12;
		return `${displayHour}:${minutes} ${ampm}`;
	};

	return (
		<MainLayout>
			<div className="px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 pb-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">Available Events</p>
							<h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-base-content">Upcoming Events</h1>
							<p className="mt-2 text-sm sm:text-base text-base-content/70 max-w-2xl">Join our community events and special occasions at Hacienda Amara.</p>
						</div>
						{profile?.role === "admin" && (
							<Link to="/add-event" className="btn btn-primary w-full rounded-full sm:w-auto">
								<span aria-hidden="true">+</span>
								Create Event
							</Link>
						)}
					</div>
					{loadError ? (
						<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-red-800">
							<p>{loadError}</p>
							<button type="button" onClick={loadData} className="btn btn-sm mt-3">Try again</button>
						</div>
					) : loading ? (
						<div className="flex min-h-48 items-center justify-center" role="status" aria-label="Loading events">
							<span className="loading loading-spinner loading-lg" />
						</div>
					) : events.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-5">
							{events?.map((event) => (
								<EventCard
									key={event.id}
									event={event}
									registrations={registrations}
									setRegistrations={setRegistrations}
									formatDate={formatDate}
									formatTime={formatTime}
								/>
							))}
						</div>
					) : (
						<div className="text-center py-12 sm:py-16">
							<p className="text-base-content/60 text-lg sm:text-xl">No events available at the moment.</p>
							<p className="mt-2 text-sm text-base-content/50">Check back soon for upcoming events!</p>
						</div>
					)}
				</div>
			</div>
		</MainLayout>
	);
};

export default Events;