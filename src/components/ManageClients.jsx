import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";
import MainLayout from "../layouts/MainLayout";
import Card from "./Card";
import { FiUser, FiClock, FiCircle, FiAlertTriangle } from "react-icons/fi";

const ManageClients = () => {
	const [clients, setClients] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const channelRef = useRef(null);

	const fetchClients = async () => {
		try {
			const { data, error: fetchError } = await supabase
				.from("profiles")
				.select("*")
				.order("created_at", { ascending: false });

			if (fetchError) throw fetchError;

			setClients(data ?? []);
			setError(null);
		} catch (err) {
			console.error("Failed to fetch clients:", err);
			setError(err.message || "Failed to load clients.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		let isMounted = true;

		fetchClients();

		// Unique channel name avoids "tried to subscribe multiple times"
		// errors during React StrictMode double-mount or hot reload.
		const channelName = `client-activity-${Math.random().toString(36).slice(2)}`;
		const channel = supabase
			.channel(channelName)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "profiles" },
				() => {
					if (isMounted) fetchClients();
				}
			)
			.subscribe((status, err) => {
				if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
					console.error("Realtime subscription failed:", err);
					if (isMounted) {
						setError(
							"Live updates unavailable — check that Realtime is enabled for 'profiles' in Supabase (Database → Replication)."
						);
					}
				}
			});

		channelRef.current = channel;

		return () => {
			isMounted = false;
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
			}
		};
	}, []);

	const formatDate = (dateString) => {
		if (!dateString) return "No data";
		return new Date(dateString).toLocaleString("en-PH", {
			dateStyle: "medium",
			timeStyle: "short",
		});
	};

	return (
		<MainLayout>
			<div className="min-h-screen bg-base-200/50 p-6 md:p-10">
				<div className="max-w-7xl mx-auto space-y-8">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div>
							<h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Client Management</h1>
							<p className="text-slate-500 font-medium">Real-time monitoring of user registrations and activity.</p>
						</div>
						<div className="stats shadow bg-white">
							<div className="stat py-2 px-6">
								<div className="stat-title text-xs uppercase font-bold tracking-widest">Active Now</div>
								<div className="stat-value text-emerald-500 text-2xl">
									{clients.filter((c) => c.status === "online").length}
								</div>
							</div>
						</div>
					</div>

					{error && (
						<div className="alert bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2 px-4 py-3">
							<FiAlertTriangle className="shrink-0" />
							<span className="text-sm font-medium">{error}</span>
						</div>
					)}

					{loading ? (
						<div className="flex justify-center py-20">
							<span className="loading loading-spinner loading-lg"></span>
						</div>
					) : clients.length === 0 && !error ? (
						<div className="text-center py-20 text-slate-400 font-medium">No clients found.</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{clients.map((client) => (
								<Card key={client.id} className="border-none hover:ring-2 ring-primary/20 transition-all">
									<div className="flex items-start justify-between">
										<div className="flex gap-4">
											<div className="avatar placeholder">
												<div className="bg-slate-800 text-white rounded-xl w-12">
													<span className="text-xl font-bold uppercase">{client.firstname?.[0]}</span>
												</div>
											</div>
											<div>
												<h3 className="font-bold text-lg text-slate-900">
													{client.firstname} {client.lastname}
												</h3>
												<span className="badge badge-sm badge-outline opacity-50 uppercase text-[10px] font-bold tracking-tighter">
													{client.role}
												</span>
											</div>
										</div>
										<div
											className={`badge badge-sm gap-1.5 py-3 px-3 font-bold uppercase text-[10px] ${
												client.status === "online"
													? "bg-emerald-100 text-emerald-700 border-emerald-200"
													: "bg-slate-100 text-slate-500 border-slate-200"
											}`}
										>
											<FiCircle className={client.status === "online" ? "fill-current" : ""} />
											{client.status || "offline"}
										</div>
									</div>

									<div className="mt-6 space-y-3 pt-4 border-t border-slate-100">
										<div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
											<FiClock className="text-primary" />
											<span>Registered: {formatDate(client.created_at)}</span>
										</div>
										<div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
											<FiUser className="text-primary" />
											<span>Last Activity: {formatDate(client.last_seen)}</span>
										</div>
									</div>
								</Card>
							))}
						</div>
					)}
				</div>
			</div>
		</MainLayout>
	);
};

export default ManageClients;
