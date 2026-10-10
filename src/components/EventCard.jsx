import React, { useNavigate } from "react";
import Card from "./Card";
import { useContext } from "react";
import { SessionContext } from "../contexts/SessionContext";
import { supabase } from "../utils/supabase";
import { FiCalendar, FiMapPin, FiClock, FiUsers, FiTag, FiArrowRight } from "react-icons/fi";

const EventCard = ({ event, setEvents, formatDate, formatTime }) => {
	const { profile } = useContext(SessionContext);
	const isAdmin = profile?.role === "admin";
	const navigate = useNavigate();

	const handleDelete = async (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (!confirm("Are you sure you want to delete this event?")) return;

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

	// Format date for display
	const eventDate = formatDate ? formatDate(event.start_date) : event.start_date;
	const eventTime = formatTime ? formatTime(event.start_time) : event.start_time;
	const endTime = formatTime ? formatTime(event.end_time) : event.end_time;

	// Check if event has image
	const eventImage = event.image_url || event.image;

	const handleClick = () => {
		navigate(`/view-event/${event.id}`);
	};

	return (
		<div onClick={handleClick} className="cursor-pointer">
			<Card className="overflow-hidden h-full hover:shadow-xl transition-shadow duration-300 bg-white/95 backdrop-blur-sm">
				{eventImage && (
					<div className="relative aspect-video overflow-hidden">
						<img
							src={eventImage}
							alt={event.title}
							className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
							loading="lazy"
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
						<div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
							<span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/90 text-amber-50 backdrop-blur-sm">
								{eventDate}
							</span>
							<span className="px-2 py-1 text-xs font-medium rounded-full bg-white/90 text-base-content/80 backdrop-blur-sm">
								{eventTime} - {endTime}
							</span>
						</div>
					</div>
				)}
				<div className="p-4 sm:p-5 space-y-4">
					<div className="flex items-start justify-between gap-3">
						<div className="flex-1 min-w-0">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">
								Event
							</p>
							<h2 className="mt-1 text-lg sm:text-xl font-bold leading-tight text-base-content truncate">
								{event.title}
							</h2>
						</div>
						<span className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary whitespace-nowrap">
							{isAdmin ? "Manage" : "View"}
						</span>
					</div>

					{event.description && (
						<p className="text-sm text-base-content/70 line-clamp-2 leading-relaxed">
							{event.description}
						</p>
					)}

					<div className="space-y-2 pt-1 border-t border-base-200">
						<div className="flex items-center gap-2 text-sm text-base-content/70">
							<FiCalendar className="w-4 h-4 text-primary shrink-0" />
							<span className="font-medium text-base-content">{eventDate}</span>
							<span className="text-base-content/40">•</span>
							<FiClock className="w-4 h-4 text-primary shrink-0" />
							<span>{eventTime} - {endTime}</span>
						</div>

						{event.location && (
							<div className="flex items-center gap-2 text-sm text-base-content/70">
								<FiMapPin className="w-4 h-4 text-primary shrink-0" />
								<span className="truncate">{event.location}</span>
							</div>
						)}

						{event.capacity && (
							<div className="flex items-center gap-2 text-sm text-base-content/70">
								<FiUsers className="w-4 h-4 text-primary shrink-0" />
								<span className="font-medium text-base-content">Capacity:</span>
								<span>{event.capacity} guests</span>
							</div>
						)}

						{event.price && (
							<div className="flex items-center gap-2 text-sm text-base-content/70">
								<FiTag className="w-4 h-4 text-primary shrink-0" />
								<span className="font-medium text-base-content">Price:</span>
								<span className="font-semibold text-primary">₱{Number(event.price).toLocaleString()}</span>
							</div>
						)}
					</div>

					<div className="flex items-center justify-between pt-2 border-t border-base-200">
						<span className="btn btn-primary rounded-full text-sm font-medium group flex items-center gap-1.5 cursor-pointer">
							View Details
						</span>

						{isAdmin && (
							<button
								onClick={handleDelete}
								className="btn btn-outline btn-error rounded-full text-sm"
							>
								Delete
							</button>
						)}
					</div>
				</div>
			</Card>
		</div>
	);
};

export default EventCard;