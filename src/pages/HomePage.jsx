import React, { useContext, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import LoginIcon from "../components/icons/LoginIcon";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { supabase } from "../utils/supabase";
import { FiStar, FiHeart, FiCoffee, FiMapPin, FiCalendar, FiUsers, FiMapPin as FiLocation, FiBookOpen } from "react-icons/fi";

const HomePage = () => {
  const { session, profile } = useContext(SessionContext);
  const [recentReviews, setRecentReviews] = useState([]);
  const primaryAction = profile?.role === "admin"
    ? { to: "/admin-reservations", label: "Calendar", icon: FiCalendar }
    : profile?.role === "staff"
      ? { to: "/manage-reservations", label: "Reservations", icon: FiBookOpen }
      : null;

  const showBookNow = true;

  const features = [
    {
      title: "Weddings & Celebrations",
      description: "Elegant venue for your special day with poolside ceremonies and starlit receptions.",
      icon: FiHeart,
      color: "text-rose-600",
      bgColor: "bg-rose-50 border-rose-100",
    },
    {
      title: "Private Events",
      description: "Birthdays, reunions, corporate retreats — fully exclusive use of the resort.",
      icon: FiUsers,
      color: "text-amber-600",
      bgColor: "bg-amber-50 border-amber-100",
    },
    {
      title: "Relaxing Staycations",
      description: "Overnight packages with jacuzzi, air-conditioned rooms, and full amenities access.",
      icon: FiCoffee,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 border-emerald-100",
    },
    {
      title: "Scenic Location",
      description: "Nestled in Rodriguez, Rizal — mountain vistas, infinity pool, and lush landscapes.",
      icon: FiLocation,
      color: "text-blue-600",
      bgColor: "bg-blue-50 border-blue-100",
    },
  ];

  useEffect(() => {
    const fetchRecentReviews = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, reviewer_name, rating, comment, profiles(firstname, lastname)")
        .order("created_at", { ascending: false })
        .limit(3);

      if (data) setRecentReviews(data);
    };

    fetchRecentReviews();
  }, []);

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
      ================================= */}
      <div
        className="
          min-h-[calc(100vh-92px)]
          bg-[#f5f0e8]
          flex
          items-center
          py-6
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
              {features.map((feature) => (
                <span
                  key={feature.title}
                  className={`
                    flex items-center gap-1.5
                    px-3 sm:px-4 py-1.5 sm:py-2
                    rounded-full
                    text-xs sm:text-sm font-medium
                    border
                    ${feature.bgColor} ${feature.color}
                  `}
                >
                  <feature.icon className="w-3.5 h-3.5" />
                  {feature.title}
                </span>
              ))}
            </div>

            {/* =================================
                BUTTONS
            ================================== */}
            <div className="mb-4 flex flex-wrap gap-3">
              <NavLink
                to="/rooms"
                className="flex items-center justify-center gap-2 rounded-full border border-black bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 sm:px-5 sm:text-base"
              >
                Book Now
              </NavLink>

              <NavLink
                to={getStartedPath}
                className="flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 sm:px-5 sm:text-base"
              >
                <FiCalendar className="w-4 h-4" />
                Events
              </NavLink>

              {primaryAction && (
                <NavLink
                  to={primaryAction.to}
                  className="flex items-center justify-center gap-2 rounded-full border border-black bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 sm:px-5 sm:text-base"
                >
                  <primaryAction.icon className="w-4 h-4" />
                  {primaryAction.label}
                </NavLink>
              )}
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

      <section className="bg-[#fffaf0] px-4 py-12 sm:px-6 md:px-8 lg:px-10 xl:px-16 2xl:px-20">
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Guest experiences</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">Guest Reviews</h2>
            </div>
            <NavLink to="/reviews" className="text-sm font-semibold text-amber-900 underline underline-offset-4 hover:text-amber-700">
              See all reviews
            </NavLink>
          </div>

          {recentReviews.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {recentReviews.map((review) => {
                const reviewerName = review.reviewer_name ||
                  `${review.profiles?.firstname || ""} ${review.profiles?.lastname || ""}`.trim() ||
                  "Guest";

                return (
                  <article key={review.id} className="flex min-h-44 flex-col rounded-xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className="flex gap-1 text-amber-500" aria-label={`${review.rating} out of 5 stars`}>
                      {[...Array(5)].map((_, index) => (
                        <FiStar key={index} className={index < review.rating ? "fill-current" : ""} />
                      ))}
                    </div>
                    <p className="mt-4 flex-1 text-sm leading-6 text-gray-700">“{review.comment}”</p>
                    <p className="mt-4 text-sm font-semibold text-gray-900">{reviewerName}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-black/15 bg-white/60 p-6 text-sm text-gray-600">
              Guest reviews will appear here.
            </p>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default HomePage;
