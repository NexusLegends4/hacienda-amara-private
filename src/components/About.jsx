import React, { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { FiCheck, FiStar, FiTarget, FiSun, FiHome, FiTv, FiCoffee, FiMapPin, FiBox, FiX } from "react-icons/fi";


// Ang mga picture ay nasa: public/amenities/ (nilo-load bilang /amenities/<file>)
// `photos` = ipinapakita ang buong picture (hindi crop)
// `description` = maikling paliwanag (kasama ang rates, WiFi, atbp.)
const amenities = [
  {
    id: "pool",
    title: "Outdoor Pool Area",
    icon: <FiSun className="text-amber-500" />,
    photos: [
      { src: "/amenities/pool-night.png", alt: "Swimming pool at night", caption: "Pool, 4 feet deep" },
      { src: "/amenities/jacuzzi.jpg", alt: "Jacuzzi", caption: "Jacuzzi / kiddie pool" },
    ],
    description:
      "Enjoy a 4-foot-deep pool with an attached jacuzzi/kiddie pool, free for 2 hours. A heated pool is also available at ₱1,000 per hour. The area comes with 2 lounger seats, 2 picnic tables, a BBQ grill, and a cooler.",
  },
  {
    id: "room",
    title: "Room",
    icon: <FiHome className="text-blue-500" />,
    photos: [{ src: "/amenities/barkada-room.jpg", alt: "Barkada room with queen bed and bunk beds", caption: "Air-conditioned barkada room" }],
    description:
      "A fully air-conditioned barkada room with 2 queen beds and 3 bunk beds, with a sleeping capacity of up to 25 people.",
  },
  {
    id: "living",
    title: "Living / Dining Area",
    icon: <FiTv className="text-purple-500" />,
    photos: [{ src: "/amenities/living-dining.jpg", alt: "Living and dining area", caption: "Living and dining area" }],
    description:
      "Gather in the living area with a JBL PartyBox Ultimate speaker and 2 wireless microphones. The 12-seater dining table has additional seats available for bigger groups.",
  },
  {
    id: "kitchen",
    title: "Kitchen Area",
    icon: <FiCoffee className="text-emerald-500" />,
    photos: [
      { src: "/amenities/kitchen-1.jpg", alt: "Kitchen counter with sink and gas stove", caption: "Sink and gas stove" },
      { src: "/amenities/kitchen-2.jpg", alt: "Refrigerator, water dispenser, and tableware", caption: "Refrigerator, dispenser and tableware" },
    ],
    description:
      "Cook and eat together with a refrigerator, hot and cold water dispenser, rice cooker, microwave, cookware, and kitchen tools. 30 sets of tableware (plates and utensils) are provided; charges may apply for missing resort items. The gas stove is ₱300 for 9 hours or ₱400 for 21 hours, and 1 gallon of mineral water is free, then ₱50 per gallon.",
  },
  {
    id: "tb",
    title: "T&B",
    icon: <FiMapPin className="text-rose-500" />,
    photos: [
      { src: "/amenities/restroom-doors.jpg", alt: "Two restrooms", caption: "2 bathrooms" },
      { src: "/amenities/restroom.jpg", alt: "Bathroom with shower and heater", caption: "Shower with heater" },
    ],
    description:
      "Two bathrooms, both equipped with heaters.",
  },
  {
    id: "parking",
    title: "Parking",
    icon: <FiMapPin className="text-rose-500" />,
    photos: [{ src: "/amenities/front-parking.jpg", alt: "Front of the resort with parked vehicle", caption: "Front gate parking" }],
    description:
      "Guests may park at the front gate or at the side parking.",
  },
  {
    id: "other",
    title: "Other Amenities",
    icon: <FiBox className="text-slate-500" />,
    photos: [{ src: "/amenities/game-room.jpg", alt: "Billiards and darts game area", caption: "Billiards and darts" }],
    description:
      "Games available are Bingo, Rubik's Cube, Scrabble, Chess, deck cards, and comfort cards. WiFi is available through Converge and PointLink.",
  },
  {
    id: "charges",
    title: "Other Charges",
    icon: <FiBox className="text-orange-500" />,
    photos: [
      { src: "/amenities/bedroom-1.jpg", alt: "2nd floor master bedroom", caption: "2nd floor master bedroom" },
      { src: "/amenities/bedroom-2.jpg", alt: "2nd floor room", caption: "2nd floor room" },
      { src: "/amenities/bedroom-3.jpg", alt: "2nd floor family room with two beds", caption: "2nd floor family room" },
    ],
    description:
      "Additional rooms on the 2nd floor include 1 master bedroom and 2 family rooms. Catering, sound system, and photo booth are also available at extra charge.",
  },
];

const packageInclusions = [
  "Free 2 hours of jacuzzi for 9-hour packages",
  "Free 4 hours of jacuzzi for 21-hour packages",
  "1 barkada room, sleeping capacity up to 25 people",
];

// "contain" = buo ang picture (walang crop) sa loob ng landscape na kahon
// "cover"   = puno ang kahon pero may naka-crop na parte
const PHOTO_FIT = "contain";

const quickFacts = [
  { value: "25", label: "Guests can sleep in the barkada room" },
  { value: "9 or 21 hrs", label: "Package options" },
  { value: "Pool + Jacuzzi", label: "Private resort" },
  { value: "2", label: "Bathrooms with heaters" },
];

const offerings = [
  "Private pool with jacuzzi and BBQ area",
  "Air-conditioned barkada room",
  "Living and dining area with party speaker and wireless microphones",
  "Fully equipped kitchen",
  "Billiards, darts, and board games",
  "WiFi (Converge and PointLink) and parking",
];

const About = () => {
  const [preview, setPreview] = useState(null);

  // Esc para isara ang popup
  useEffect(() => {
    if (!preview) return;
    const onKey = (e) => e.key === "Escape" && setPreview(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] py-12 px-4">
        {/* HERO */}
        <div className="mx-auto mb-16 grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="text-4xl font-black uppercase leading-tight tracking-tight text-slate-900 md:text-5xl">
              Hacienda Amara Private Resort
            </h1>
            <p className="mt-3 flex items-center gap-2 font-semibold text-[#8b5e34]">
              <FiMapPin /> Rodriguez (Montalban), Rizal
            </p>

            <div className="mt-8 space-y-5 text-lg leading-relaxed text-slate-700">
              <p className="text-xl font-semibold text-slate-900">
                A peaceful and exclusive getaway designed for unforgettable moments.
              </p>
              <p>
                Our resort offers a perfect blend of comfort, privacy, and leisure, just a short drive away from Metro Manila.
              </p>
              <p>
                Whether you're planning a birthday, reunion, or team-building, we provide a relaxing place to unwind and create lasting memories.
              </p>
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-3">
              {quickFacts.map((fact) => (
                <li key={fact.label} className="rounded-2xl border border-[#8b5e34]/20 bg-white/70 px-4 py-3">
                  <p className="text-xl font-black text-slate-900">{fact.value}</p>
                  <p className="text-xs font-semibold text-slate-500">{fact.label}</p>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#amenities"
                className="btn btn-black rounded-full border-black px-8 text-white transition-all hover:bg-slate-800"
              >
                See our amenities
              </a>
            </div>
          </div>

          {/* Cover photo, buong picture (walang crop) */}
          <figure className="mx-auto w-full max-w-xl">
            <img
              src="/amenities/pool-night.png"
              alt="Hacienda Amara pool at night"
              className="block h-auto w-full rounded-[2rem] shadow-2xl"
            />
            <figcaption className="mt-3 text-center text-xs font-semibold text-slate-500">
              The pool and jacuzzi area at night
            </figcaption>
          </figure>
        </div>

        {/* OFFERINGS + MISSION */}
        <div className="mx-auto mb-16 grid max-w-6xl gap-6 md:grid-cols-2">
          <div className="rounded-[2.5rem] border border-black/5 bg-white/70 p-8 shadow-sm backdrop-blur-md md:p-10">
            <h2 className="mb-6 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900">
              <FiStar className="fill-amber-500 text-amber-500" /> Offerings
            </h2>
            <ul className="space-y-3">
              {offerings.map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-700">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <FiCheck className="text-xs" />
                  </div>
                  <span className="text-sm font-semibold">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2.5rem] border border-black/5 bg-white/70 p-8 shadow-sm backdrop-blur-md md:p-10">
            <h2 className="mb-6 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900">
              <FiTarget className="text-[#8b5e34]" /> Mission
            </h2>
            <p className="text-lg font-medium leading-relaxed text-slate-700">
              To provide a safe, clean, and enjoyable environment where guests can celebrate life’s special moments through quality service and well-maintained facilities.
            </p>
          </div>
        </div>

        {/* AMENITIES */}
        <div id="amenities" className="max-w-6xl mx-auto py-12 scroll-mt-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Our Amenities</h2>
            <div className="h-1.5 w-24 bg-amber-500 mx-auto mt-4 rounded-full"></div>
            <p className="mt-5 text-slate-600">Tap any photo to see it bigger.</p>
          </div>

          {/* Package inclusions */}
          <div className="mb-8 rounded-[2rem] border border-[#8b5e34]/20 bg-[#fff8ef] p-6 shadow-sm md:p-8">
            <h3 className="mb-5 text-center text-2xl font-black text-slate-900">Your Package Includes</h3>
            <ul className="grid gap-3 text-sm font-semibold text-slate-700 md:grid-cols-3">
              {packageInclusions.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <FiCheck className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Jump links */}
          <nav className="mb-10 flex flex-wrap justify-center gap-2" aria-label="Amenity sections">
            {amenities.map((a) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                className="rounded-full border border-[#8b5e34]/25 bg-white/70 px-4 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-[#8b5e34] hover:text-white"
              >
                {a.title}
              </a>
            ))}
          </nav>

          {/* Isang section per amenity: malalaking picture muna, tapos details */}
          <div className="space-y-10">
            {amenities.map((category) => {
              const single = category.photos.length === 1;
              return (
                <section
                  key={category.id}
                  id={category.id}
                  className="scroll-mt-24 rounded-[2.5rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur-md md:p-10"
                >
                  <div className="mb-8 flex items-center gap-4">
                    <div className="rounded-2xl bg-white p-4 text-2xl shadow-sm">{category.icon}</div>
                    <h3 className="text-2xl font-bold uppercase tracking-tight text-slate-900">{category.title}</h3>
                  </div>

                  <div className={single ? "flex flex-col items-center gap-6" : "flex flex-col gap-6"}>
                    {/* PICTURES: landscape ang kahon, buo pa rin ang picture sa loob */}
                    <div
                      className={`grid gap-5 ${
                        single ? "w-full max-w-3xl grid-cols-1" : category.photos.length === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
                      }`}
                    >
                      {category.photos.map((photo, i) => (
                        <figure key={i}>
                          <button
                            type="button"
                            onClick={() => setPreview(photo)}
                            className={`group relative block ${single ? "aspect-video" : "aspect-[4/3]"} w-full overflow-hidden rounded-2xl bg-slate-900 shadow-lg ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500`}
                            aria-label={`View larger: ${photo.caption}`}
                          >
                            {/* Malabong gamit ang parehong picture para sa gilid (pang-punan lang) */}
                            {PHOTO_FIT === "contain" && (
                              <img
                                src={photo.src}
                                alt=""
                                aria-hidden="true"
                                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
                              />
                            )}
                            <img
                              src={photo.src}
                              alt={photo.alt}
                              loading="lazy"
                              className={`relative h-full w-full ${PHOTO_FIT === "contain" ? "object-contain" : "object-cover"}`}
                            />
                          </button>
                          <figcaption className="mt-2 text-center text-xs font-semibold text-slate-600 md:text-sm">{photo.caption}</figcaption>
                        </figure>
                      ))}
                    </div>

                    {/* DESCRIPTION */}
                    <p className={`text-sm leading-relaxed text-slate-600 ${single ? "max-w-3xl text-center" : "max-w-3xl"}`}>
                      {category.description}
                    </p>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popup: buong picture */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label={preview.alt}
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-900"
            aria-label="Close photo"
          >
            <FiX />
          </button>
          <figure className="flex max-h-full max-w-5xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={preview.src} alt={preview.alt} className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain" />
            <figcaption className="mt-3 text-center text-sm font-semibold text-white">{preview.caption}</figcaption>
          </figure>
        </div>
      )}
    </MainLayout>
  );
};

export default About;
