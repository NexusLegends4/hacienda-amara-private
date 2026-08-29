import React from "react";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { FiArrowLeft, FiSmartphone, FiInfo } from "react-icons/fi";

const BOOKING_URL = `${window.location.origin}/rooms`;

const BookingQr = () => {
    const navigate = useNavigate();

    return (
        <MainLayout>
            <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-4 py-8 sm:px-6 lg:px-8">
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
                            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                                <FiSmartphone />
                                Scan to Book
                            </div>
                            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
                                Hacienda Amara Booking QR
                            </h1>
                            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                                Let guests scan this QR code with their phone camera to open the reservation page directly.
                            </p>

                            <div className="mt-8 space-y-4 rounded-3xl border border-black/5 bg-amber-50 p-6">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-800">2026 Rates — Good for 20 Pax</p>
                                <div>
                                    <p className="font-bold text-slate-800">Day Time (9 Hours)</p>
                                    <p className="text-xs text-slate-500">Check In: 9:00 AM | Check Out: 6:00 PM</p>
                                    <p className="text-sm text-slate-700 mt-1">Mon–Thu: <strong>₱6,999</strong> &nbsp;·&nbsp; Fri–Sun & Holiday: <strong>₱7,999</strong></p>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">Night Time (9 Hours)</p>
                                    <p className="text-xs text-slate-500">Check In: 9:00 PM | Check Out: 6:00 AM</p>
                                    <p className="text-sm text-slate-700 mt-1">Mon–Thu: <strong>₱7,999</strong> &nbsp;·&nbsp; Fri–Sun & Holiday: <strong>₱8,999</strong></p>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">Overnight (21 Hours)</p>
                                    <p className="text-xs text-slate-500">Check In: 9:00 AM | Check Out: 6:00 AM next day</p>
                                    <p className="text-sm text-slate-700 mt-1">Mon–Thu: <strong>₱14,999</strong> &nbsp;·&nbsp; Fri–Sun & Holiday: <strong>₱17,999</strong></p>
                                </div>
                                <div className="border-t border-amber-200 pt-3">
                                    <p className="text-sm text-slate-600">Additional pax: <strong>₱200/head</strong></p>
                                    <p className="text-sm text-slate-600">Kids 8 years old and below are <strong>FREE</strong></p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-black/5 bg-slate-950 p-8 text-center text-white shadow-2xl md:p-10">
                            <div className="mx-auto flex max-w-sm flex-col items-center">
                                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/55">
                                    Scan To Book
                                </p>
                                <div className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
                                    <QRCodeSVG
                                        value={BOOKING_URL}
                                        size={240}
                                        includeMargin
                                        title="Hacienda Amara Booking QR"
                                    />
                                </div>
                                <p className="mt-5 text-sm leading-6 text-white/70">
                                    Scanning this code opens the reservation page directly on the guest's phone.
                                </p>
                                <div className="mt-4 flex items-start gap-2 rounded-2xl bg-white/10 p-4 text-left text-xs text-white/60">
                                    <FiInfo className="mt-0.5 shrink-0" />
                                    <span>Guest must be logged in to complete the booking. Please provide guests with their account details before booking.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default BookingQr;
