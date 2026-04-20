import React from "react";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiStar, FiTarget, FiSun, FiHome, FiTv, FiCoffee, FiMapPin, FiBox } from "react-icons/fi";

const amenities = [
	{
		title: "Outdoor Pool Area",
		icon: <FiSun className="text-amber-500" />,
		items: ["4ft Depth", "Jacuzzi/Kiddie Pool (Free 2hrs)", "Heated pool (₱1,000/hr)", "2 Lounger Seats", "2 Picnic Tables", "BBQ Grill", "Cooler"],
	},
	{
		title: "Room",
		icon: <FiHome className="text-blue-500" />,
		items: ["Fully Airconditioned Barkada/Family Room (2 Queen Beds and 3 Bunk Beds)", "2 Sofa Beds", "55 inches Smart TV"],
	},
	{
		title: "Living & Dining Area",
		icon: <FiTv className="text-purple-500" />,
		items: ["75 inches Smart TV", "JBL Partybox Ultimate speaker with 2 wireless microphones", "8-seater Dining Table"],
	},
	{
		title: "Kitchen Area",
		icon: <FiCoffee className="text-emerald-500" />,
		items: [
			"Gas Stove (Additional ₱300.00)",
			"Refrigerator",
			"Hot & Cold Water Dispenser (Free 1 Gallon Purified Water, additional ₱30 per gallon)",
			"Rice Cooker & Microwave",
			"Cookware and Kitchen Tools",
			"30+ sets Tableware (Plates / Utensils)",
		],
	},
	{
		title: "T&B & Parking",
		icon: <FiMapPin className="text-rose-500" />,
		items: ["2 Bathroom with heater", "Front Gate Parking"],
	},
	{
		title: "Other amenities",
		icon: <FiBox className="text-slate-500" />,
		items: ["Games: Bingo, Scrabble, Chess, Deck Cards, Comfort Cards, Rubik's Cube", "WIFI (PLDT)"],
	},
];

const About = () => {
	const navigate = useNavigate();

	return (
		<MainLayout>
			<div className="bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] py-12 px-4">
				<div className="hero min-h-[60vh] mb-12">
				<div className="hero-content flex-col lg:flex-row gap-12 lg:gap-20 max-w-7xl">
					<div className="text-center lg:text-left max-w-2xl">
						<h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight uppercase">About Hacienda Amara Private Resort</h1>
						<div className="py-8 space-y-6 text-slate-700 text-lg leading-relaxed text-left">
							<p className="font-semibold text-slate-900 text-xl">
								Welcome to a peaceful and exclusive getaway designed for unforgettable moments.
							</p>
							<p>
								Nestled in the scenic area of Rodriguez (Montalban), Rizal, our resort offers a perfect blend of comfort, privacy, and leisure—just a short drive away from Metro Manila.
							</p>
							<p>
								At Hacienda Amara, we believe that every celebration deserves a special place. Whether you're planning a birthday, reunion, or team-building, we provide a relaxing environment to unwind and create lasting memories.
							</p>
						</div>
						 <button 
                    onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")} 
                    className="btn btn-black rounded-full px-10 border-black text-white hover:bg-slate-800 transition-all"
                  >
                    Go Back
                  </button>
					</div>
					<div className="card bg-white/70 w-full max-w-md shrink-0 shadow-2xl border border-black/5 backdrop-blur-xl rounded-[2.5rem]">
						<div className="card-body p-8 md:p-12 space-y-8">
							<div>
								<h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight">
									<FiStar className="text-amber-500 fill-amber-500" /> Offerings
								</h2>
								<ul className="grid grid-cols-1 gap-3">
									<li className="flex items-center gap-3 text-slate-700 font-medium">
										<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
											<FiCheck className="text-xs" />
										</div>
										<span className="text-sm italic">Full list of amenities below</span>
									</li>
								</ul>
							</div>

							<div>
								<h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight">
									<FiTarget className="text-[#8b5e34]" /> Mission
								</h2>
								<div className="bg-black/5 rounded-2xl p-5 border border-black/5">
									<p className="text-sm text-slate-600 leading-relaxed font-medium">
										To provide a safe, clean, and enjoyable environment where guests can celebrate life’s special moments through quality service and well-maintained facilities.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

				<div className="max-w-7xl mx-auto py-16">
					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Our Amenities</h2>
						<div className="h-1.5 w-24 bg-amber-500 mx-auto mt-4 rounded-full"></div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
						{amenities.map((category, idx) => (
							<div key={idx} className="bg-white/60 backdrop-blur-md p-8 rounded-[2.5rem] border border-black/5 hover:shadow-2xl transition-all duration-300 group">
								<div className="flex items-center gap-4 mb-6">
									<div className="p-4 bg-white rounded-2xl shadow-sm text-2xl group-hover:scale-110 transition-transform">
										{category.icon}
									</div>
									<h3 className="font-bold text-xl text-slate-900 uppercase tracking-tight">{category.title}</h3>
								</div>
								<ul className="space-y-4">
									{category.items.map((item, i) => (
										<li key={i} className="flex items-start gap-3 text-slate-600">
											<FiCheck className="mt-1 shrink-0 text-emerald-500" />
											<span className="text-sm font-semibold leading-snug">{item}</span>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default About;