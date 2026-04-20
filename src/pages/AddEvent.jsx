import MainLayout from "../layouts/MainLayout";
import EventForm from "../components/EventForm";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { SessionContext } from "../contexts/SessionContext";
import { Link } from "react-router-dom";

const AddEvent = () => {
	const navigate = useNavigate();
	const { session, profile } = useContext(SessionContext);

	if (!session) {
		return (
			<MainLayout>
				<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
					<div className="mx-auto max-w-3xl rounded-[1.5rem] border border-black/5 bg-white/75 p-6 text-center shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<h1 className="text-2xl font-black text-base-content">Admin access required</h1>
						<p className="mt-3 text-sm leading-6 text-base-content/70">
							Log in with an administrator account to create events.
						</p>
						<Link to="/log-in" className="btn btn-black mt-6 rounded-full">
							Log In
						</Link>
					</div>
				</div>
			</MainLayout>
		);
	}

	if (session && profile === null) {
		return (
			<MainLayout>
				<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
					<div className="mx-auto max-w-3xl rounded-[1.5rem] border border-black/5 bg-white/75 p-6 text-center shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<h1 className="text-2xl font-black text-base-content">Checking access</h1>
						<p className="mt-3 text-sm leading-6 text-base-content/70">
							Verifying your administrator permissions...
						</p>
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
								Add Event
							</p>
							<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
								Create a new event
							</h1>
							<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
								Fill in the event details to publish a new schedule for
								clients.
							</p>
						</div>
						<button
							type="button"
							onClick={() => navigate("/manage-events")}
							className="btn btn-black rounded-full"
						>
							Back
						</button>
					</div>
					<EventForm />
				</div>
			</div>
		</MainLayout>
	);
};

export default AddEvent;
