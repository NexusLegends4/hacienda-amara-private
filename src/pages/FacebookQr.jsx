import React from "react";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { FaFacebookF } from "react-icons/fa";
import { FiArrowLeft, FiExternalLink, FiSmartphone } from "react-icons/fi";

const FACEBOOK_URL = "https://www.facebook.com/HaciendaAmara/";

const FacebookQr = () => {
	const navigate = useNavigate();

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,_rgba(255,214,10,0.18),_transparent_34%),linear-gradient(180deg,_#fffaf2_0%,_#fff3df_48%,_#f4e3c2_100%)] px-4 py-8 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-5xl">
					<div className="mb-6 flex justify-start">
						<button
							type="button"
							onClick={() => navigate(-1)}
							className="btn btn-outline rounded-full border-black/10 bg-white/80 px-6 shadow-sm backdrop-blur"
						>
							<FiArrowLeft />
							Back
						</button>
					</div>

					<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
						<div className="rounded-[2rem] border border-black/5 bg-white/75 p-8 shadow-2xl backdrop-blur-xl md:p-10">
							<div className="inline-flex items-center gap-2 rounded-full bg-[#1877F2]/10 px-4 py-2 text-sm font-semibold text-[#1877F2]">
								<FaFacebookF />
								Official Facebook Access
							</div>
							<h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
								Hacienda Amara Facebook QR
							</h1>
							<p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
								Scan the code or open the link to visit the official Facebook page for updates,
								photos, inquiries, and announcements.
							</p>

							<div className="mt-8 grid gap-3 sm:grid-cols-2">
								<div className="rounded-3xl border border-black/5 bg-[#f8fbff] p-5">
									<div className="flex items-center gap-3 text-[#1877F2]">
										<FiSmartphone className="text-xl" />
										<h2 className="text-sm font-black uppercase tracking-[0.22em]">Scan</h2>
									</div>
									<p className="mt-3 text-sm leading-6 text-slate-600">
										Open your phone camera and point it at the QR code.
									</p>
								</div>
								<div className="rounded-3xl border border-black/5 bg-[#fff9ef] p-5">
									<div className="flex items-center gap-3 text-amber-700">
										<FiExternalLink className="text-xl" />
										<h2 className="text-sm font-black uppercase tracking-[0.22em]">Open</h2>
									</div>
									<p className="mt-3 text-sm leading-6 text-slate-600">
										Use the button below if you want to open the page directly.
									</p>
								</div>
							</div>
						</div>

						<div className="rounded-[2rem] border border-black/5 bg-slate-950 p-8 text-center text-white shadow-2xl md:p-10">
							<div className="mx-auto flex max-w-sm flex-col items-center">
								<p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/55">
									Scan To Visit
								</p>
								<div className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
									<QRCodeSVG
										value={FACEBOOK_URL}
										size={240}
										includeMargin
										title="Hacienda Amara Facebook QR code"
									/>
								</div>
								<p className="mt-5 text-sm leading-6 text-white/70">
									This QR goes directly to the official Hacienda Amara Facebook page.
								</p>
								<a
									href={FACEBOOK_URL}
									target="_blank"
									rel="noreferrer"
									className="btn mt-6 rounded-full border-0 bg-[#1877F2] px-7 text-white hover:bg-[#1666d8]"
								>
									<FaFacebookF />
									Open Facebook Page
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default FacebookQr;
