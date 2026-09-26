import React, { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";
import { FiCheck } from "react-icons/fi";
import { supabase } from "../utils/supabase";

const HOLIDAY_NAMES = {
    "2026-01-01": "New Year's Day",
    "2026-02-17": "Chinese New Year",
    "2026-03-20": "Eid'l Fitr",
    "2026-04-02": "Maundy Thursday",
    "2026-04-03": "Good Friday",
    "2026-04-04": "Black Saturday",
    "2026-04-09": "Araw ng Kagitingan",
    "2026-05-01": "Labor Day",
    "2026-06-12": "Independence Day",
    "2026-08-21": "Ninoy Aquino Day",
    "2026-08-31": "National Heroes Day",
    "2026-11-01": "All Saints' Day",
    "2026-11-02": "All Souls' Day",
    "2026-11-30": "Bonifacio Day",
    "2026-12-08": "Feast of the Immaculate Conception",
    "2026-12-24": "Christmas Eve",
    "2026-12-25": "Christmas Day",
    "2026-12-30": "Rizal Day",
    "2026-12-31": "Last Day of the Year",
};

const PH_HOLIDAYS_2026 = Object.keys(HOLIDAY_NAMES);

const RoomPricing = () => {
    const navigate = useNavigate();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPackages = async () => {
        const { data, error } = await supabase
            .from("packages")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true });
        if (error) {
            console.error(error);
        } else {
            setPackages(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchPackages();
    }, []);

    return (
        <MainLayout>
            <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div className="max-w-2xl">
                                <p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
                                    Rates & Availability
                                </p>
                                <h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
                                    Room Pricing
                                </h1>
                                <p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
                                    View our current rates and inclusions for your next stay.
                                    <br />
                                    <span className="font-bold text-amber-700 block mt-2">Rates: Prices are for 20 pax. Additional pax: ₱200/head.</span>
                                    <span className="font-bold text-rose-600 block mt-1">Higher rates apply on Fridays, Saturdays, Sundays, and listed Philippine holidays.</span>
                                    <span className="font-medium text-base-content/70 block mt-1">February 25 (EDSA People Power Revolution Anniversary) uses the regular weekday rate.</span>
                                    <span className="text-emerald-700 font-bold italic">Kids 8 years old and below are FREE!</span>
                                </p>
                            </div>
                            <button onClick={() => navigate(-1)} className="btn btn-black rounded-full">
                                Back
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-xl backdrop-blur animate-pulse">
                                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                                    <div className="h-10 bg-gray-200 rounded w-1/2 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                </div>
                            ))
                        ) : packages.length === 0 ? (
                            <div className="col-span-3 p-12 text-center border-2 border-dashed border-base-300 rounded-3xl opacity-50">No packages available at the moment.</div>
                        ) : (
                            packages.map((pkg) => (
                                <div key={pkg.id} className="rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-xl backdrop-blur transition-transform hover:scale-[1.02]">
                                    <h2 className="text-xl font-bold text-base-content">{pkg.name}</h2>
<div className="mt-4 space-y-2">
                                         <div className="flex items-baseline gap-1">
                                          <span className="text-4xl font-black text-slate-900">
                                              ₱{Number(pkg.base_price).toLocaleString()}
                                          </span>
                                              <span className="text-sm text-base-content/50">/ stay (Mon-Thu)</span>
                                          </div>
                                          <div className="flex items-baseline gap-1">
                                              <span className="text-4xl font-black text-slate-900">
                                                  ₱{Number(pkg.max_price).toLocaleString()}
                                              </span>
                                              <span className="text-sm text-base-content/50">/ stay (Fri-Sun & Holiday)</span>
                                          </div>
                                      </div>
                                      <p className="mt-1 text-xs text-amber-600 font-medium italic">
                                          Select your booking date to see the exact rate. Holiday rates apply to the dates listed above.
                                     </p>

                                    <div className="mt-8 space-y-3">
                                        {pkg.features?.map((f) => (
                                            <div key={f} className="flex items-center gap-3 text-sm text-base-content/70">
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                                    <FiCheck className="text-xs" />
                                                </div>
                                                {f}
                                            </div>
                                        ))}
                                    </div>

                                    <button onClick={() => navigate("/rooms")} className="btn btn-black w-full mt-8 rounded-full">
                                        Reserve Now
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default RoomPricing;
