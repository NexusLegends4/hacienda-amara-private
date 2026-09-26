import React, { useState, useEffect, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import EventCard from "../components/EventCard";
import { SessionContext } from "../contexts/SessionContext";

const Events = () => {
	const [events, setEvents] = useState([]);
	const [registrations, setRegistrations] = useState([]);
	const { profile } = useContext(SessionContext);

	useEffect(() => {
		const loadData = async () => {
			// Fetch Events
			const { data: eventsData, error: eventsError } = await supabase.from("events").select();
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

	return (
		<MainLayout>
			<div className="pt-5">
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
					{events?.map((event) => (
						<EventCard
							key={event.id}
							event={event}
							registrations={registrations}
							setRegistrations={setRegistrations}
						/>
					))}
				</div>
			</div>
		</MainLayout>
	);
};

export default Events;
