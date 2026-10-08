import React, { useState, useEffect, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import EventCard from "../components/EventCard";
import { SessionContext } from "../contexts/SessionContext";
import { FiCalendar, FiMapPin, FiClock, FiUsers, FiTag } from "react-icons/fi";

const Events = () => {
	const [events, setEvents] = useState([]);
	const [registrations, setRegistrations] = useState([]);
	const { profile } = useContext(SessionContext);

	useEffect(() => {
		const loadData = async () => {
			// Fetch Events
			const { data: eventsData, error: eventsError } = await supabase.from("events").select().order("start_date", { ascending: true });
			if (eventsError) alert(eventsError.message || eventsError);
			if (eventsData) setEvents(eventsData);

			// Fetch Registrations if user is logged in
			if (profile) {
				const { data: registrationsData, error: registrationsError } = await supabase
					.from("registrations")
					.select()
					.eq("profile_id", profile?.id);
				if (registrationsError) console.error(registrationsError.message);
				if (registrationsData) setRegistrations(registrationsData);
			}
		};

		loadData();
	}, [profile]);

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
					<div className="mb-6 sm:mb-8">
						<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">Available Events</p>
						<h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-base-content">Upcoming Events</h1>
						<p className="mt-2 text-sm sm:text-base text-base-content/70 max-w-2xl">Join our community events and special occasions at Hacienda Amara.</p>
					</div>
					{events?.length > 0 ? (
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