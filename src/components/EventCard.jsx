import React from "react";
import Card from "./Card";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { SessionContext } from "../contexts/SessionContext";
import { supabase } from "../utils/supabase";

const EventCard = ({ event, setEvents }) => {
	const { profile } = useContext(SessionContext);
	const isAdmin = profile?.role === "admin";

	const handleDelete = async () => {
		// Remove related registrations first, then delete the event itself.
		const { error: registrationsError } = await supabase
			.from("registrations")
			.delete()
			.eq("event_id", event.id);

		if (registrationsError) {
			alert(registrationsError.message || registrationsError);
			return;
		}

		const { error: eventError } = await supabase
			.from("events")
			.delete()
			.eq("id", event.id);

		if (eventError) {
			alert(eventError.message || eventError);
			return;
		}

		if (setEvents) {
			setEvents((prev) => prev.filter((currentEvent) => currentEvent.id !== event.id));
		}
	};

	return (
		<Card className="overflow-hidden">
			<div className="space-y-5">
				<div className="space-y-3">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
								Event
							</p>
							<h2 className="mt-1 text-xl font-semibold leading-tight text-base-content">
								{event.title}
							</h2>
						</div>
						<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
							{isAdmin ? "Manage" : "View"}
						</span>
					</div>

					<div className="grid gap-2 text-sm text-base-content/75">
						<p>
							<span className="font-medium text-base-content">Start:</span>{" "}
							{event.start_date} at {event.start_time}
						</p>
						<p>
							<span className="font-medium text-base-content">End:</span>{" "}
							{event.end_date} at {event.end_time}
						</p>
						<p>
							<span className="font-medium text-base-content">Location:</span>{" "}
							{event.location}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap gap-3 pt-2">
					<Link
						to={`/view-event/${event.id}`}
						className="btn btn-black rounded-full"
					>
						View
					</Link>

					{isAdmin && (
						<>
							<button
								className="btn btn-outline btn-error rounded-full"
								onClick={handleDelete}
							>
								Delete
							</button>
						</>
					)}
				</div>
			</div>
		</Card>
	);
};

export default EventCard;
