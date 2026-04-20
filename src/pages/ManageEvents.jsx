import React, { useState, useEffect, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import EventCard from "../components/EventCard";
import { SessionContext } from "../contexts/SessionContext";

const ManageEvents = () => {
	const [events, setEvents] = useState(null);
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();

	useEffect(() => {
		if (!session) {
			navigate("/log-in");
			return;
		}
		if (profile && profile.role !== "admin") {
			navigate("/");
			return;
		}
		fetchEvents();
	}, [session, profile, navigate]);

	const fetchEvents = async () => {
		const { data: eventsData, error: eventsError } = await supabase
			.from("events")
			.select();
		if (eventsError) alert(eventsError.message || eventsError);
		if (eventsData) setEvents(eventsData);
	};

	return (
		<MainLayout>
			<div className="pt-5">
				<div className="text-right mb-5">
					<Link to="/add-event" className="btn btn-primary rounded-full">
						Add Event
					</Link>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
					{events?.map((event) => {
						return (
							<EventCard key={event.id} event={event} setEvents={setEvents} />
						);
					})}
				</div>
			</div>
		</MainLayout>
	);
};

export default ManageEvents;
