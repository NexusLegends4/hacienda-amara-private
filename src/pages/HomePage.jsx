import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import LoginIcon from "../components/icons/LoginIcon";
import { SessionContext } from "../contexts/SessionContext.jsx";

const HomePage = () => {
  const { session, profile } = useContext(SessionContext);

  const getStartedPath = session
    ? profile?.role === "admin"
      ? "/manage-events"
      : "/events"
    : "/events";

  const images = [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f5f0e8] flex items-center px-6 md:px-12 lg:px-20 py-12">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">

          {/* LEFT CARD */}
          <div className="bg-white rounded-3xl p-10 md:p-12 shadow-sm">

            {/* Badge */}
            <span className="inline-block border border-gray-300 text-gray-700 text-sm px-4 py-1 rounded-full mb-6">
              Hacienda Amara
            </span>

            {/* Heading */}
            <h1 className="text-5xl md:text-6xl font-extrabold text-black leading-tight mb-5">
              Hello Ka-Amara
            </h1>

            {/* Subtext */}
            <p className="text-gray-500 text-base md:text-lg mb-7 leading-relaxed">
              Escape the ordinary. Embrace the exclusive. Welcome to Hacienda Amara Private Resort and Events Place.
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {["Weddings", "Private Events", "Relaxing Stay", "Scenic Views"].map((tag) => (
                <span
                  key={tag}
                  className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 mb-5">
              <NavLink
                to={getStartedPath}
                className="flex items-center gap-2 bg-black text-white text-sm font-medium px-5 py-3 rounded-full hover:bg-gray-800 transition-colors"
              >
                <LoginIcon />
                Get Started
              </NavLink>

              <NavLink
                to="/reviews"
                className="border border-gray-300 text-gray-800 text-sm font-medium px-5 py-3 rounded-full hover:bg-gray-50 transition-colors"
              >
                Guest Reviews
              </NavLink>
            </div>

            {/* Footer note */}
            <p className="text-sm text-gray-400">
              Explore our services and jump straight into your dashboard.
            </p>
          </div>

          {/* RIGHT IMAGE GRID */}
          <div className="grid grid-cols-2 gap-4 h-full">

            {/* Big top image — spans full width */}
            <div className="col-span-2 rounded-3xl overflow-hidden h-[280px] md:h-[320px]">
              <img
                src={images[0]}
                alt="Hacienda Amara interior"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom left */}
            <div className="rounded-3xl overflow-hidden h-[200px]">
              <img
                src={images[1]}
                alt="Hacienda Amara pool"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom right */}
            <div className="rounded-3xl overflow-hidden h-[200px]">
              <img
                src={images[2]}
                alt="Hacienda Amara exterior night"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;
