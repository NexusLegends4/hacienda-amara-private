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
    "https://scontent.fmnl13-1.fna.fbcdn.net/v/t39.30808-6/494369075_122128145408749963_4990497671908646009_n.jpg?stp=dst-jpegr_tt6&cstp=mx2048x1153&ctp=s2048x1153&_nc_cat=110&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeF1nSsOdjuDLwrEDI_9kXRx-VCDRKTPXQf5UINEpM9dBzyOAMF84d2qECgvqklmE7ch8Mi4hhwbTHXVC1xuQACn&_nc_ohc=LI8lTwGxF2cQ7kNvwFnsbQR&_nc_oc=AdpRrYbsvcQJNGeMBQEILnchtIMr-yIJrLoUe88NIR_AsmbLS9uMbpDW-ul3IK36Pgc&_nc_zt=23&se=-1&_nc_ht=scontent.fmnl13-1.fna&_nc_gid=RjEQok9WlHTIFtPAtSlthw&_nc_ss=7b2a8&oh=00_AQKdagrCdD09L5JcikXaqvPv8-vi8H9og7XINTK0a7_6KA&oe=6AAD85D5",
    "https://scontent.fmnl13-2.fna.fbcdn.net/v/t39.30808-6/495211844_122128145354749963_2190067951936702202_n.jpg?stp=dst-jpegr_tt6&cstp=mx2048x1153&ctp=s2048x1153&_nc_cat=104&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFU3vqsxmru-_0Jrs9vCcomZDihfd0nmxRkOKF93SebFJBT9iKC_nuXu66Q7USFQtFw03VuyKudesbU9YT4LOkM&_nc_ohc=pNepbjTlcosQ7kNvwEnad-W&_nc_oc=AdosBbMvvqM2_0tFjUCOnziWoqjId53qNAJ-IIorfzgjD_t8JPdeH0bFqFWUYYk3T8U&_nc_zt=23&se=-1&_nc_ht=scontent.fmnl13-2.fna&_nc_gid=5KkgsPDikJtPmIK2xuSWfg&_nc_ss=7b2a8&oh=00_AQLeQMb86NbHqsunoBg67cXrUHsvqn_TolKs7DfVI_Rv6w&oe=6AAD8372",
    "https://scontent.fmnl13-2.fna.fbcdn.net/v/t39.30808-6/481303337_122113740890749963_5078274125687890241_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x1536&ctp=s2048x1536&_nc_cat=109&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFAXuMHXRsgvWku23naV4RL6iRisONI3WnqJGKw40jdaQBqKfLQnjz-oLA5B3k9YuScSHfRPyCpcWEvGViDeBZq&_nc_ohc=mD9P-kTFGEsQ7kNvwENzE9O&_nc_oc=AdoWuNXgu5tJTwqu8ssrMQIqkvynj9EpJZUhqA_ji-zjvH-bMWw3BQel1DE59AHaZ4A&_nc_zt=23&_nc_ht=scontent.fmnl13-2.fna&_nc_gid=3PGFtVqtK9DuXsEJWe8_sg&_nc_ss=7b2a8&oh=00_AQLiUiq2iGGArwvb4ij7rnFpoY3l1vhcNmN3sKfe_Vk9Kg&oe=6AAD79DE",
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
