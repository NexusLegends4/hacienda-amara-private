import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext";

const Hero = () => {
	const { session, profile } = useContext(SessionContext);
	const getStartedPath = session
		? profile?.role === "admin"
			? "/manage-events"
			: "/events"
		: "/log-in";

	// Lightweight hero section used on the homepage.
	return (
		<div className="hero min-h-screen bg-base-200">
			<div className="hero-content flex-col lg:flex-row">
				<img
					src="https://th.bing.com/th/id/OIP.O6XPwTpg3n890Ow3JDwWZgHaHa?w=152&h=180&c=7&r=0&o=7&pid=1.7&rm=3"
					className="max-w-sm rounded-lg shadow-2xl"
				/>
				<div>
					<h1 className="text-5xl font-bold">Serving clients nationwide</h1>
					<p className="py-6">Hacienda Amara is ready to assist clients anywhere in the Philippines for bookings, events, and inquiries.</p>
					<NavLink
						to={getStartedPath}
						className="mr-4 inline-flex items-center rounded-full btn-outline text-black"
					>
						Get Started
					</NavLink>
				</div>
			</div>
		</div>
	);
};

export default Hero;
