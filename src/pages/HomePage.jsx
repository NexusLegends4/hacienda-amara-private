import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import LoginIcon from "../components/icons/LoginIcon";
import { SessionContext } from "../contexts/SessionContext.jsx";

const HomePage = () => {
  const { session, profile } = useContext(SessionContext);

  const getStartedPath = "/events";

 
  const images = [
  "/images/hacienda-amara-1.jpg",
  "/images/hacienda-amara-2.jpg",
  "/images/hacienda-amara-3.jpg",
];

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f5f0e8] flex items-center px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 py-8 sm:py-12 lg:py-16">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-6 lg:gap-10 items-start">

          {/* LEFT CARD */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 shadow-sm">

            {/* Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-black leading-tight mb-4 sm:mb-5">
              Hello Ka-Amara
            </h1>

            {/* Subtext */}
            <p className="text-gray-500 text-sm sm:text-base md:text-lg mb-5 sm:mb-7 leading-relaxed">
              Escape the ordinary. Embrace the exclusive. Welcome to Hacienda Amara Private Resort and Events Place.
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
              {["Weddings", "Private Events", "Relaxing Stay", "Scenic Views"].map((tag) => (
                <span
                  key={tag}
                  className="border border-gray-300 text-gray-700 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 sm:mb-5">
              <NavLink
                to={getStartedPath}
                className="flex items-center justify-center gap-2 bg-black text-white text-sm sm:text-base font-medium px-4 sm:px-5 py-3 rounded-full hover:bg-gray-800 transition-colors"
              >
                <LoginIcon />
                Events
              </NavLink>

              <NavLink
                to="/reviews"
                className="flex items-center justify-center border border-gray-300 text-gray-800 text-sm sm:text-base font-medium px-4 sm:px-5 py-3 rounded-full hover:bg-gray-50 transition-colors"
              >
                Guest Reviews
              </NavLink>
            </div>

            {/* Footer note */}
            <p className="text-xs sm:text-sm text-gray-400">
              Explore our services and jump straight into your dashboard.
            </p>
          </div>

          {/* RIGHT IMAGE GRID */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 hidden lg:block">

            {/* Big top image — spans full width */}
            <div className="col-span-2 rounded-2xl sm:rounded-3xl overflow-hidden h-[220px] sm:h-[280px] md:h-[320px] lg:h-[360px]">
              <img
                src={images[0]}
                alt="Hacienda Amara interior"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom left */}
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden h-[160px] sm:h-[200px] md:h-[220px]">
              <img
                src={images[1]}
                alt="Hacienda Amara pool"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom right */}
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden h-[160px] sm:h-[200px] md:h-[220px]">
              <img
                src={images[2]}
                alt="Hacienda Amara exterior night"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Mobile hero image - single stack for smaller screens */}
          <div className="lg:hidden space-y-3">
            <div className="rounded-2xl overflow-hidden h-[220px] sm:h-[280px]">
              <img src={images[0]} alt="Hacienda Amara interior" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden h-[180px] sm:h-[220px]">
              <img src={images[1]} alt="Hacienda Amara pool" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden h-[180px] sm:h-[220px]">
              <img src={images[2]} alt="Hacienda Amara exterior night" className="w-full h-full object-cover" />
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;