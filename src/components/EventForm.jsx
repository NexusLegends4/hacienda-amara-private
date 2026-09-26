import React from "react";
import Input from "./Form/Input";
import { supabase } from "../utils/supabase";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { SessionContext } from "../contexts/SessionContext";

const EventForm = ({ eventData = null }) => {
	const navigate = useNavigate();
	const { profile } = useContext(SessionContext);

	if (profile?.role !== "admin") {
		return (
			<div className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
				Administrator access is required to save event changes.
			</div>
		);
	}

	const insertEvent = async (formEvent) => {
		// Convert the form into a plain object before inserting a new event.
		const formData = new FormData(formEvent.target);
		const formDataObject = Object.fromEntries(formData.entries());

		const { data: eventDataResult, error: eventError } = await supabase
			.from("events")
			.insert(formDataObject)
			.select()
			.single();
		if (eventError) alert(eventError);
		if (eventDataResult) navigate("/manage-events");
	};

	const updateEvent = async (formEvent) => {
		// Reuse the same payload when editing an existing event.
		const formData = new FormData(formEvent.target);
		const formDataObject = Object.fromEntries(formData.entries());

		const { data: eventDataResult, error: eventError } = await supabase
			.from("events")
			.update(formDataObject)
			.eq("id", eventData.id)
			.select()
			.single();
		if (eventError) alert(eventError);
		if (eventDataResult) navigate("/manage-events");
	};

	const handleSubmit = (formEvent) => {
		formEvent.preventDefault();

		if (!eventData) {
			insertEvent(formEvent);
		} else {
			updateEvent(formEvent);
		}
	};

	return (
		<div className="pt-5">
			<form onSubmit={handleSubmit}>
				<div className="flex">
					<div className="w-1/3">
						{/* Main event metadata inputs. */}
						<Input
							type="text"
							label="Title"
							placeholder="Enter Title"
							name="title"
							defaultValue={eventData?.title}
						/>
						<Input
							type="date"
							label="Start Date"
							placeholder="Select Start Date"
							name="start_date"
							defaultValue={eventData?.start_date}
						/>
						<Input
							type="date"
							label="End Date"
							placeholder="Select End Date"
							name="end_date"
							defaultValue={eventData?.end_date}
						/>
						<Input
							type="time"
							label="Start Time"
							placeholder="Select Start Time"
							name="start_time"
							defaultValue={eventData?.start_time}
						/>
						<Input
							type="time"
							label="End Time"
							placeholder="Select End Time"
							name="end_time"
							defaultValue={eventData?.end_time}
						/>
						<Input
							type="text"
							label="Location"
							placeholder="Enter Location"
							name="location"
							defaultValue={eventData?.location}
						/>
					</div>
					<div className="flex-1">
						{/* Description gets more space than the short fields. */}
						<fieldset className="fieldset">
							<legend className="fieldset-legend">Description</legend>
							<textarea
								className="textarea h-full w-full"
								placeholder="Description"
								rows={20}
								name="description"
								defaultValue={eventData?.description}
							></textarea>
						</fieldset>
					</div>
				</div>
				<div className="mt-5 flex justify-end gap-3">
					{/* Admins editing an existing event get a back button for convenience. */}
					{profile?.role === "admin" && eventData && (
						<button
							type="button"
							onClick={() => navigate("/manage-events")}
							className="btn btn-black rounded-full"
						>
							Back
						</button>
					)}
					<button className="btn btn-black rounded-full" type="submit">
						Save Event
					</button>
				</div>
			</form>
		</div>
	);
};

export default EventForm;
