import React, { useState, useEffect, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiTrash2, FiMegaphone } from "react-icons/fi";
import DOMPurify from "dompurify";

const ManageAnnouncements = () => {
	const { profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [announcements, setAnnouncements] = useState([]);
	const [newTitle, setNewTitle] = useState("");
	const [newContent, setNewContent] = useState("");

	useEffect(() => {
		// Guard the page so only administrators can access it.
		if (profile?.role !== "admin") {
			navigate("/");
		}
		fetchAnnouncements();
	}, [profile, navigate]);

	const fetchAnnouncements = async () => {
		const { data, error } = await supabase
			.from("announcements")
			.select("*")
			.order("created_at", { ascending: false });
		if (data) setAnnouncements(data);
	};

	const handlePost = async (e) => {
		e.preventDefault();
		if (!newTitle.trim() || !newContent.trim()) return;

		const { error } = await supabase
			.from("announcements")
			.insert([{ 
				title: DOMPurify.sanitize(newTitle), 
				content: DOMPurify.sanitize(newContent) 
			}]);

		if (error) {
			alert(error.message);
		} else {
			setNewTitle("");
			setNewContent("");
			fetchAnnouncements();
		}
	};

	const handleDelete = async (id) => {
		if (!window.confirm("Are you sure you want to delete this announcement?")) return;
		const { error } = await supabase.from("announcements").delete().eq("id", id);
		if (!error) fetchAnnouncements();
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
									Admin Dashboard
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									Manage Announcements
								</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									Keep your guests informed with real-time updates and important resort news.
								</p>
							</div>
							<div className="flex flex-wrap gap-3">
								<button onClick={() => navigate(-1)} className="btn btn-black rounded-full">
									Back
								</button>
							</div>
						</div>
					</div>

					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur sm:rounded-[2rem]">
						<form onSubmit={handlePost} className="card-body">
							<h2 className="text-xl font-bold mb-2">Post New Announcement</h2>
							<div className="form-control">
								<input
									className="input input-bordered w-full"
									placeholder="Announcement Title"
									value={newTitle}
									onChange={e => setNewTitle(e.target.value)}
									required
								/>
							</div>
							<div className="form-control">
								<textarea
									className="textarea textarea-bordered h-24"
									placeholder="Announcement content..."
									value={newContent}
									onChange={e => setNewContent(e.target.value)}
									required
								/>
							</div>
							<button className="btn btn-black rounded-full mt-2"><FiPlus /> Post</button>
						</form>
					</div>

					<div className="space-y-4">
						<h2 className="text-xl font-bold px-2">Active Announcements</h2>
						{announcements.length === 0 ? (
							<div className="p-12 text-center border-2 border-dashed border-base-300 rounded-3xl opacity-50">No active announcements.</div>
						) : (
							announcements.map(item => (
								<div key={item.id} className="card bg-base-100 border border-base-300 shadow-sm">
									<div className="card-body flex-row justify-between items-center">
										<div className="flex-1 pr-4">
											<p className="text-xs opacity-50 mb-1">{new Date(item.created_at).toLocaleDateString()}</p>
											<h3 className="font-bold text-lg">{item.title}</h3>
											<p className="text-base-content/70">{item.content}</p>
										</div>
										<button onClick={() => handleDelete(item.id)} className="btn btn-ghost btn-sm text-error" title="Delete"><FiTrash2 /></button>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ManageAnnouncements;