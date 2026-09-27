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
      {/* ================================
          HOMEPAGE CONTAINER
          No scrolling on tablet / desktop
      ================================= */}
      <div
        className="
          h-[calc(100vh-92px)]
          overflow-hidden
          bg-[#f5f0e8]
          flex
          items-center
          px-4
          sm:px-6
          md:px-8
          lg:px-10
          xl:px-16
          2xl:px-20
        "
      >
        {/* ================================
            MAIN CONTENT
        ================================= */}
        <div
          className="
            w-full
            max-w-[1500px]
            mx-auto
            grid
            md:grid-cols-2
            gap-5
            md:gap-6
            lg:gap-8
            xl:gap-10
            items-center
          "
        >

          {/* =================================
              LEFT WHITE CARD
          ================================== */}
          <div
            className="
              bg-white
              rounded-2xl
              sm:rounded-3xl
              p-5
              sm:p-7
              md:p-7
              lg:p-8
              xl:p-10
              2xl:p-12
              shadow-sm
            "
          >

            {/* HEADING */}
            <h1
              className="
                text-3xl
                sm:text-4xl
                md:text-4xl
                lg:text-5xl
                xl:text-6xl
                font-extrabold
                text-black
                leading-tight
                mb-3
                sm:mb-4
              "
            >
              Hello Ka-Amara
            </h1>

            {/* DESCRIPTION */}
            <p
              className="
                text-gray-500
                text-sm
                sm:text-base
                md:text-sm
                lg:text-base
                xl:text-lg
                mb-4
                sm:mb-6
                leading-relaxed
              "
            >
              Escape the ordinary. Embrace the exclusive. Welcome to Hacienda
              Amara Private Resort and Events Place.
            </p>

            {/* =================================
                TAGS
            ================================== */}
            <div
              className="
                flex
                flex-wrap
                gap-2
                mb-5
                sm:mb-7
              "
            >
              {[
                "Weddings",
                "Private Events",
                "Relaxing Stay",
                "Scenic Views",
              ].map((tag) => (
                <span
                  key={tag}
                  className="
                    border
                    border-gray-300
                    text-gray-700
                    text-xs
                    sm:text-sm
                    px-3
                    sm:px-4
                    py-1.5
                    sm:py-2
                    rounded-full
                  "
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* =================================
                BUTTONS
            ================================== */}
            <div
              className="
                flex
                flex-wrap
                gap-3
                mb-4
              "
            >
              {/* EVENTS */}
              <NavLink
                to={getStartedPath}
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  bg-black
                  text-white
                  text-sm
                  sm:text-base
                  font-medium
                  px-4
                  sm:px-5
                  py-3
                  rounded-full
                  hover:bg-gray-800
                  transition-colors
                "
              >
                <LoginIcon />
                Events
              </NavLink>

              {/* GUEST REVIEWS */}
              <NavLink
                to="/reviews"
                className="
                  flex
                  items-center
                  justify-center
                  border
                  border-gray-300
                  text-gray-800
                  text-sm
                  sm:text-base
                  font-medium
                  px-4
                  sm:px-5
                  py-3
                  rounded-full
                  hover:bg-gray-50
                  transition-colors
                "
              >
                Guest Reviews
              </NavLink>
            </div>

            {/* FOOTER TEXT */}
            <p
              className="
                text-xs
                sm:text-sm
                text-gray-400
              "
            >
              Explore our services and jump straight into your dashboard.
            </p>
          </div>


          {/* =================================
              RIGHT SIDE IMAGE GRID
              TABLET / IPAD / LAPTOP / PC
          ================================== */}
          <div
            className="
              hidden
              md:grid
              grid-cols-2
              gap-3
              sm:gap-4
            "
          >

            {/* =================================
                BIG TOP IMAGE
            ================================== */}
            <div
              className="
                col-span-2
                rounded-2xl
                sm:rounded-3xl
                overflow-hidden

                h-[220px]
                sm:h-[260px]
                md:h-[250px]
                lg:h-[280px]
                xl:h-[330px]
                2xl:h-[380px]
              "
            >
              <img
                src={images[0]}
                alt="Hacienda Amara interior"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            </div>


            {/* =================================
                BOTTOM LEFT IMAGE
            ================================== */}
            <div
              className="
                rounded-2xl
                sm:rounded-3xl
                overflow-hidden

                h-[140px]
                sm:h-[170px]
                md:h-[150px]
                lg:h-[180px]
                xl:h-[210px]
                2xl:h-[240px]
              "
            >
              <img
                src={images[1]}
                alt="Hacienda Amara interior"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            </div>


            {/* =================================
                BOTTOM RIGHT IMAGE
            ================================== */}
            <div
              className="
                rounded-2xl
                sm:rounded-3xl
                overflow-hidden

                h-[140px]
                sm:h-[170px]
                md:h-[150px]
                lg:h-[180px]
                xl:h-[210px]
                2xl:h-[240px]
              "
            >
              <img
                src={images[2]}
                alt="Hacienda Amara exterior at night"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            </div>

          </div>


          {/* =================================
              MOBILE IMAGE VERSION
              BELOW md
          ================================== */}
          <div
            className="
              md:hidden
              space-y-3
            "
          >

            {/* IMAGE 1 */}
            <div
              className="
                rounded-2xl
                overflow-hidden
                h-[180px]
                sm:h-[240px]
              "
            >
              <img
                src={images[0]}
                alt="Hacienda Amara interior"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            </div>

            {/* IMAGE 2 */}
            <div
              className="
                rounded-2xl
                overflow-hidden
                h-[150px]
                sm:h-[190px]
              "
            >
              <img
                src={images[1]}
                alt="Hacienda Amara interior"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            </div>

            {/* IMAGE 3 */}
            <div
              className="
                rounded-2xl
                overflow-hidden
                h-[150px]
                sm:h-[190px]
              "
            >
              <img
                src={images[2]}
                alt="Hacienda Amara exterior at night"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            </div>

          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;
