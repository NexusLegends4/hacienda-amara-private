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
    : "/log-in";

  const images = [
    "https://scontent.fmnl25-7.fna.fbcdn.net/v/t39.30808-6/495034226_122127788288749963_6494358927456626875_n.jpg?stp=cp6_dst-jpegr_tt6&_nc_cat=111&ccb=1-7&_nc_sid=7b2446&_nc_eui2=AeHgf-UXE9hvmS_XFx53Fx7XAdK01uX6x0EB0rTW5frHQWW34lM-6uhLeE0V4QcWZgFq9viXtfwtsE_v82sGxF8w&_nc_ohc=8MOfALyUSWkQ7kNvwFrSN-J&_nc_oc=AdrrDAJZniq-4n2o2659DWNZVtGJqO-dpXg7CW_ahb0wm0tg2xiKzS7N_V6rvRjUqz8&_nc_zt=23&se=-1&_nc_ht=scontent.fmnl25-7.fna&_nc_gid=v2ifRWvwjMt93w6GQ5EyXg&_nc_ss=7a3a8&oh=00_Af2OjoD4FrG5VqNGjAUc17SiLHj8HLHzNIUbIevLIr_2TA&oe=69EBDD52",
    "https://scontent.fmnl25-5.fna.fbcdn.net/v/t39.30808-6/481303337_122113740890749963_5078274125687890241_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=7b2446&_nc_eui2=AeGCRDmPtAf2scB9p3ZLkGuH6iRisONI3WnqJGKw40jdaVqr_odvIx6NI_XMBD50lGZUHJqDDhC9G-25meE3XxmQ&_nc_ohc=NE7MKzoHImgQ7kNvwHqdaoR&_nc_oc=Ado16LEhyIXn6BWjyHCuJkIUE78rhkOVWrBU7jfYiX5MYYX4CHbbldlxS9yMIhOJjOA&_nc_zt=23&_nc_ht=scontent.fmnl25-5.fna&_nc_gid=cdl6Co87kxqKqEPyQcSWLQ&_nc_ss=7a3a8&oh=00_Af1YA2idv2iRICg_J_kKgcnH3f3QyXbzNrAWnon54kS4Iw&oe=69EBE59E",
    "https://scontent.fmnl25-8.fna.fbcdn.net/v/t39.30808-6/494369075_122128145408749963_4990497671908646009_n.jpg?stp=cp6_dst-jpegr_tt6&_nc_cat=110&ccb=1-7&_nc_sid=7b2446&_nc_eui2=AeE4GS5HLw2x1OxTTMtFZjeu-VCDRKTPXQf5UINEpM9dB4rpld3sHW41x5Fk60G9wJ_UqB8qWvvEQzav1LHqItFT&_nc_ohc=dy1X0zRrwZEQ7kNvwGZ4kuj&_nc_oc=Adomw14PpRSzT43F6sDSNVj6ADB8bc19s2fd5tgY8mxFQInQjC41nEKaCdI4Y3Tzbp4&_nc_zt=23&se=-1&_nc_ht=scontent.fmnl25-8.fna&_nc_gid=s4AvOq-eNHIu8nf3FASWLg&_nc_ss=7a3a8&oh=00_Af1il1xMyQI9MRG7_nxt2-zqxL5EvV06SQRfRL3Q5Jk0Ug&oe=69EBF195",
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