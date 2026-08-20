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
    "https://scontent-mnl3-2.xx.fbcdn.net/v/t39.30808-6/494369075_122128145408749963_4990497671908646009_n.jpg?stp=dst-jpegr_tt6&cstp=mx2048x1153&ctp=s2048x1153&_nc_cat=110&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeF1nSsOdjuDLwrEDI_9kXRx-VCDRKTPXQf5UINEpM9dBzyOAMF84d2qECgvqklmE7ch8Mi4hhwbTHXVC1xuQACn&_nc_ohc=DnX6-2aeW94Q7kNvwGNPF6x&_nc_oc=AdqdwLiVcExhILF4LJ_78-RZGaNlfzCNT3MNhlNzlObeU27O53LJhtv62anvFnaGvSI&_nc_zt=23&se=-1&_nc_ht=scontent-mnl3-2.xx&_nc_gid=hn9-WcCSptWzl66lzS6Vbw&_nc_ss=7b2a8&oh=00_AQFLrvOeuUnIoo9rCwtz1c-HqwIMeAFBf9_AxhjdV3NXNQ&oe=6A8C9055",
    "https://scontent-mnl3-1.xx.fbcdn.net/v/t39.30808-6/495211844_122128145354749963_2190067951936702202_n.jpg?stp=dst-jpegr_tt6&cstp=mx2048x1153&ctp=s2048x1153&_nc_cat=104&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFU3vqsxmru-_0Jrs9vCcomZDihfd0nmxRkOKF93SebFJBT9iKC_nuXu66Q7USFQtFw03VuyKudesbU9YT4LOkM&_nc_ohc=BdKFH6CWf04Q7kNvwEAFk1_&_nc_oc=AdoYwJGOAOl_56pGEGCICe594UouB0LwPcJ5NPFPXN-nmzh5mdnY7CM7dkyyv3MH6Qc&_nc_zt=23&se=-1&_nc_ht=scontent-mnl3-1.xx&_nc_gid=qIwJZfHkkvp4lwOaorfzNQ&_nc_ss=7b2a8&oh=00_AQFyijitCrt-kNbz-3vh1BAoZ3U_tjA9JRaV8BES9-VLrQ&oe=6A8C8DF2",
    "https://scontent-mnl3-3.xx.fbcdn.net/v/t39.30808-6/481303337_122113740890749963_5078274125687890241_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x1536&ctp=s2048x1536&_nc_cat=109&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFAXuMHXRsgvWku23naV4RL6iRisONI3WnqJGKw40jdaQBqKfLQnjz-oLA5B3k9YuScSHfRPyCpcWEvGViDeBZq&_nc_ohc=4McoBgCMiXIQ7kNvwHpdP6m&_nc_oc=AdpTicbFyPtAJNBLAFcvd4gImzMvbiYl8NSr5OKQVOSFYgYMhHh3MZHWlKOcpsk_uRM&_nc_zt=23&_nc_ht=scontent-mnl3-3.xx&_nc_gid=zhWj9eLHBWdbxXomNfanSw&_nc_ss=7b2a8&oh=00_AQGzP2p6iwsB348c6qsAZCz8aMTtSqajKX3gWnybmh87Ag&oe=6A8C845E",
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
