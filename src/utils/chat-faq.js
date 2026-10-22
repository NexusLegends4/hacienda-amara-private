// Hacienda Amara Chat FAQ Dataset
// Structured data for bot responses - easy to maintain and extend

export const FAQ_CATEGORIES = {
  GENERAL: "General Information",
  BOOKING: "Booking & Reservations",
  RATES: "Rates & Packages",
  AMENITIES: "Amenities & Facilities",
  LOCATION: "Location & Directions",
  POLICIES: "Policies & Rules",
  PAYMENT: "Payment Options",
  CONTACT: "Contact & Social Media",
};

export const FAQ_ITEMS = [
  // General Information
  {
    id: "what-is-hacienda-amara",
    category: FAQ_CATEGORIES.GENERAL,
    keywords: [
      "what is hacienda amara",
      "about us",
      "about hacienda amara",
      "hacienda amara",
      "ano ang hacienda amara",
      "tungkol sa hacienda amara",
      "capacity",
      "guests allowed",
    ],
    question: "What is Hacienda Amara?",
    answer:
      "Hacienda Amara is a private resort and events place in Amityville, Brgy. San Jose, Rodriguez, Rizal, with an outdoor pool, jacuzzi/kiddie pool, air-conditioned barkada room, and event facilities. The barkada room sleeps up to 25 people. You can view our current amenities here: [About Us](/about)",
    quickReplies: ["View Amenities", "Check Rates", "See Location"],
  },
  {
    id: "guest-capacity",
    category: FAQ_CATEGORIES.GENERAL,
    keywords: [
      "how many guests",
      "guest limit",
      "capacity",
      "allowed guests",
      "maximum guests",
      "pax",
    ],
    question: "How many guests are allowed?",
    answer:
      "The barkada room sleeps up to 25 people. Rates are for 20 pax. Additional guests: ₱200/head. Kids 8 and below are FREE!",
    quickReplies: ["Check Rates", "Book Now", "View Amenities"],
  },

  // Booking & Reservations
  {
    id: "how-to-book",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: [
      "booking process",
      "how to book",
      "how do i book",
      "how can i book",
      "paano mag book",
      "reserve",
      "reservation process",
      "confirm booking",
      "paano mag book",
      "paano magbook",
      "paano mag reserve",
      "paano magreserve",
      "hot to book",
      "hot to reserve",
      "ho to book",
      "ho to reserve",
      "howto book",
      "howto reserve",
    ],
    question: "How do I book?",
    answer:
      "To book, please send your preferred date, time, and guest count. We'll check availability and send you the payment instructions. A down payment is required to secure your slot.",
    quickReplies: ["Check Availability", "View Rates", "Payment Options"],
  },
  {
    id: "availability-check",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: [
      "availability",
      "available po",
      "slot",
      "booking",
      "reserve po",
      "reservation",
      "availability",
      "is there availability",
      "may available",
      "available ba",
      "available kayo",
      "free slot",
    ],
    question: "Is [date] available?",
    answer:
      "Available po ba sa chosen date? I can help check that. For booking, please send your date, time, and guest count. Note: Prices are for 20 pax, additional pax at ₱200/head. Kids 8 and below are FREE.",
    quickReplies: ["Check Rates", "View Packages", "Contact Us"],
  },
  {
    id: "booking-early",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: [
      "how early should we book",
      "book early",
      "book as early as possible",
      "advance booking",
    ],
    question: "How early should I book?",
    answer:
      "It is recommended to book as early as possible, especially for peak dates, to secure your preferred schedule.",
    quickReplies: ["Check Availability", "View Rates"],
  },
  {
    id: "site-visit",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: [
      "visit or inspect the venue",
      "site visits",
      "site visit",
      "inspect the venue",
      "venue before booking",
      "visit the venue",
      "ocular",
      "tour",
    ],
    question: "Can I visit the venue before booking?",
    answer:
      "Yes, site visits can be arranged by appointment. Please contact us to schedule a visit.",
    quickReplies: ["Contact Us", "View Photos", "Check Rates"],
  },

  // Rates & Packages
  {
    id: "rates-2026",
    category: FAQ_CATEGORIES.RATES,
    keywords: [
      "rate",
      "rates",
      "package",
      "packages",
      "promo",
      "discount",
      "price",
      "presyo",
      "magkano",
      "2026 rates",
      "current rates",
    ],
    question: "What are the 2026 rates?",
    answer:
      "2026 Rates for 20 pax:\n• Day Time (9AM-6PM): ₱6,999 - ₱7,999\n• Night Time (9PM-6AM): ₱7,999 - ₱8,999\n• Overnight (21 hours): ₱14,999 - ₱17,999\n\nExtra guests: ₱200/head. Kids 8 & below are FREE!",
    quickReplies: ["View Packages", "Check Availability", "Book Now"],
  },
  {
    id: "day-night-overnight",
    category: FAQ_CATEGORIES.RATES,
    keywords: [
      "overnight",
      "day tour",
      "day time",
      "night time",
      "what packages",
      "package types",
    ],
    question: "What package types do you offer?",
    answer:
      "We offer three package types:\n• **Day Time** - 9AM to 6PM (9 hours)\n• **Night Time** - 9PM to 6AM (9 hours)\n• **Overnight** - 9AM to 6AM next day (21 hours)\n\nAll rates are for 20 pax. Additional guests: ₱200/head. Kids 8 and below are FREE!",
    quickReplies: ["View Rates", "Check Availability", "Book Now"],
  },
  {
    id: "extra-charges",
    category: FAQ_CATEGORIES.RATES,
    keywords: [
      "extra charges for additional hours",
      "additional hours",
      "overtime",
      "extend hours",
      "extension fee",
    ],
    question: "Are there extra charges for additional hours?",
    answer:
      "Yes, overtime usage may incur additional charges. Please inquire about extension rates when booking.",
    quickReplies: ["View Rates", "Contact Us"],
  },

  // Amenities & Facilities
  {
    id: "amenities-list",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: [
      "amenities",
      "facilities",
      "inclusions",
      "what's included",
      "what is included",
      "what are included",
      "inclusions list",
    ],
    question: "What amenities are included?",
    answer:
      "Our amenities include:\n• 4-foot outdoor pool\n• Jacuzzi/kiddie pool (2 free hours)\n• Air-conditioned barkada room with 2 queen beds and 3 bunk beds\n• JBL PartyBox Ultimate speaker with 2 wireless microphones\n• 12-seat dining table\n• Kitchen with refrigerator, hot/cold water dispenser, rice cooker, microwave, cookware, and 30 tableware sets\n• 2 bathrooms with heaters\n• Front gate and side parking\n• Games and WiFi (Converge and PointLink)\n\nPackages include 2 free jacuzzi hours for 9-hour stays or 4 hours for 21-hour stays. Heated pool is ₱1,000/hour. Gas stove is ₱300 for 9 hours or ₱400 for 21 hours; mineral water is 1 free gallon, then ₱50/gallon.\n\nMore details: [About Us](/about)",
    quickReplies: ["View Photos", "Check Rates", "Book Now"],
  },
  {
    id: "pool-details",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: [
      "pool",
      "swimming pool",
      "pool depth",
      "heated pool",
      "jacuzzi",
      "kiddie pool",
    ],
    question: "Tell me about the pool",
    answer:
      "Our pool is 4 feet deep, with a jacuzzi/kiddie pool (2 free hours included); heated pool use is ₱1,000/hour. The pool area is perfect for events and relaxation.",
    quickReplies: ["View Amenities", "Check Rates", "See Photos"],
  },
  {
    id: "room-details",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: [
      "room",
      "room po",
      "air-conditioned",
      "ac room",
      "barkada room",
      "beds",
      "sleeping",
    ],
    question: "What's in the barkada room?",
    answer:
      "The air-conditioned barkada room has 2 queen beds and 3 bunk beds, accommodating up to 25 guests comfortably.",
    quickReplies: ["View Amenities", "Check Capacity", "Book Now"],
  },
  {
    id: "kitchen-equipment",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: [
      "kitchen",
      "utensil",
      "cookware",
      "refrigerator",
      "microwave",
      "rice cooker",
      "stove",
      "gas stove",
    ],
    question: "What kitchen equipment is available?",
    answer:
      "The kitchen includes: refrigerator, hot/cold water dispenser, rice cooker, microwave, cookware, and 30 tableware sets. Gas stove is available for ₱300 (9 hours) or ₱400 (21 hours).",
    quickReplies: ["View Amenities", "Check Rates"],
  },
  {
    id: "sound-system",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: [
      "sound system",
      "speaker",
      "jbl",
      "microphone",
      "videoke",
      "karaoke",
      "lights",
      "lightings",
      "lighting",
    ],
    question: "Is there a sound system?",
    answer:
      "Yes! We have a JBL PartyBox Ultimate speaker with 2 wireless microphones included. Basic lighting may be included or available as add-ons for events.",
    quickReplies: ["View Amenities", "Event Setup", "Check Rates"],
  },
  {
    id: "wifi",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["wi-fi", "wifi", "internet", "connection"],
    question: "Is WiFi available?",
    answer: "Yes, WiFi is available through Converge and PointLink.",
    quickReplies: ["View Amenities", "Check Rates"],
  },
  {
    id: "parking",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["parking space", "parking", "park", "car", "vehicle"],
    question: "Is parking available?",
    answer: "Yes, parking is available at the front gate and on the side.",
    quickReplies: ["View Location", "Check Rates"],
  },
  {
    id: "generator",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["generator", "power backup", "electricity backup", "brownout"],
    question: "Do you have a generator?",
    answer: "Yes, electricity is included for standard use within the event. We have backup power arrangements.",
    quickReplies: ["View Amenities", "Check Rates"],
  },

  // Location & Directions
  {
    id: "location-address",
    category: FAQ_CATEGORIES.LOCATION,
    keywords: [
      "where is",
      "located",
      "location",
      "address",
      "venue",
      "exact location",
      "saan",
      "loc",
      "map",
      "mapa",
      "directions",
      "pumunta",
      "punta",
      "waze",
      "google maps",
      "how to get there",
    ],
    question: "Where is Hacienda Amara located?",
    answer:
      "Hacienda Amara is located at: B30 L12 Itneg Street Phase 3 Amityville, Brgy. San Jose, Rodriguez, Rizal, Philippines, 1860",
    quickReplies: ["Open Google Maps", "View on Waze", "See Facebook Page"],
    attachments: [
      {
        id: "location-qr",
        kind: "image",
        name: "Hacienda Amara Location QR",
        mimeType: "image/png",
        url: "https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=https%3A%2F%2Fwww.google.com%2Fmaps%2Fsearch%2F%3Fapi%3D1%26query%3DB30%20L12%20Itneg%20Street%20Phase%203%20Amityville%20Bgry.%20San%20Jose%2C%20Rodriguez%2C%20Rizal%2C%20Philippines%2C%201860",
      },
    ],
  },

  // Policies & Rules
  {
    id: "rules-policies",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: [
      "rules",
      "house rules",
      "mga rules",
      "policy",
      "policies",
      "guidelines",
      "bawal",
      "limitasyon",
      "pamantayan",
    ],
    question: "What are the house rules?",
    answer:
      "Para sa safety at cleanliness ng lahat, mayroon kaming mga Rules gaya ng: bawal ang food/drinks sa pool, may designated smoking area, at bawal ang glass bottles malapit sa tubig. Maaari niyo pong basahin ang kumpletong guidelines dito: [Rules](/rules)",
    quickReplies: ["View Full Rules", "Check Rates", "Book Now"],
  },
  {
    id: "check-in-out",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: [
      "check-in",
      "check out",
      "check out time",
      "checkin",
      "checkout",
      "time",
    ],
    question: "What are the check-in/check-out times?",
    answer:
      "Check-in and check-out times depend on your booked package:\n• Day Time: 9AM - 6PM\n• Night Time: 9PM - 6AM\n• Overnight: 9AM - 6AM (next day)\n\nPlease arrive on time to maximize your booking.",
    quickReplies: ["View Packages", "Book Now"],
  },
  {
    id: "food-drinks-policy",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: [
      "bring our own food",
      "bring our own drinks",
      "food and drinks",
      "bring food",
      "bring drinks",
      "outside food",
      "corkage",
    ],
    question: "Can we bring our own food and drinks?",
    answer:
      "Yes, bringing your own food and drinks is allowed, subject to certain guidelines. Corkage fees may apply for certain outside items, depending on the agreement. No glass bottles near the pool area.",
    quickReplies: ["View Rules", "Check Rates", "Event Setup"],
  },
  {
    id: "pets-policy",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: [
      "pets allowed",
      "pet friendly",
      "pet-friendly",
      "pets",
      "dog",
      "cat",
      "animals",
    ],
    question: "Are pets allowed?",
    answer:
      "Pets may be allowed depending on the event rules and prior approval. Please inquire when booking.",
    quickReplies: ["Contact Us", "View Rules"],
  },
  {
    id: "cancellation-reschedule",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: [
      "cancellation",
      "reschedule",
      "cancel",
      "rebook",
      "move date",
      "change date",
    ],
    question: "What is the cancellation/reschedule policy?",
    answer:
      "Cancellation and reschedule policies vary based on the booking. Please contact us for specific terms related to your reservation.",
    quickReplies: ["Contact Us", "View Rules"],
  },
  {
    id: "security-deposit",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: [
      "security deposit",
      "deposit",
      "damage deposit",
      "refundable deposit",
    ],
    question: "Is there a security deposit?",
    answer:
      "A security deposit may be required and is refundable based on venue condition after the event.",
    quickReplies: ["View Rules", "Payment Options", "Book Now"],
  },
  {
    id: "noise-curfew",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: ["noise", "curfew", "loud", "music", "party", "sound limit"],
    question: "Is there a noise curfew?",
    answer:
      "Please be mindful of noise levels, especially during night time packages. Specific curfew rules apply based on local ordinances and venue policies. See [Rules](/rules) for details.",
    quickReplies: ["View Rules", "Book Now"],
  },

  // Payment Options
  {
    id: "payment-options",
    category: FAQ_CATEGORIES.PAYMENT,
    keywords: [
      "where to pay",
      "how to pay",
      "saan ako magbabayad",
      "saan magbabayad",
      "saan ako mag babayad",
      "payment qr",
      "mode of payment",
      "payment details",
      "payment info",
      "payment instruction",
      "bayad",
      "pay",
      "gcash",
      "cash",
      "bank transfer",
      "down payment",
      "downpayment",
      "dp",
      "required down payment",
    ],
    question: "How do I pay?",
    answer:
      "We accept GCash, bank transfer, and cash payments. For booking, a down payment is required to secure your slot. The remaining balance should be settled before or on the event date.",
    quickReplies: ["View Payment Details", "Check Rates", "Book Now"],
  },
  {
    id: "down-payment",
    category: FAQ_CATEGORIES.PAYMENT,
    keywords: [
      "down payment amount",
      "how much down payment",
      "dp amount",
      "deposit amount",
    ],
    question: "How much is the down payment?",
    answer:
      "The down payment amount depends on the package and total cost. Please check the payment instructions for details: [Payment Instructions](/about#payment)",
    quickReplies: ["View Payment Details", "Check Rates", "Contact Us"],
  },
  {
    id: "full-payment",
    category: FAQ_CATEGORIES.PAYMENT,
    keywords: [
      "full payment",
      "remaining balance",
      "settled before",
      "settled on the event date",
      "balance payment",
    ],
    question: "When is the full payment due?",
    answer:
      "The remaining balance should be settled before or on the event date, based on the agreed terms.",
    quickReplies: ["View Payment Details", "Contact Us"],
  },

  // Contact & Social Media
  {
    id: "facebook-page",
    category: FAQ_CATEGORIES.CONTACT,
    keywords: [
      "facebook page",
      "fb page",
      "facebook link",
      "fb link",
      "facebook",
      "fb",
      "meta page",
      "social media",
    ],
    question: "What is your Facebook page?",
    answer:
      "Our official Facebook page: [Hacienda Amara](https://www.facebook.com/HaciendaAmara/)",
    quickReplies: ["Open Facebook", "View Location", "Check Rates"],
    attachments: [
      {
        id: "facebook-qr",
        kind: "image",
        name: "Hacienda Amara Facebook QR",
        mimeType: "image/png",
        url: "https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=https%3A%2F%2Fwww.facebook.com%2FHaciendaAmara%2F",
      },
    ],
  },
  {
    id: "contact-number",
    category: FAQ_CATEGORIES.CONTACT,
    keywords: [
      "contact us",
      "chat with us",
      "contact",
      "contact number",
      "phone number",
      "telephone",
      "mobile",
      "call",
      "text",
      "sms",
      "viber",
      "whatsapp",
    ],
    question: "What is your contact number?",
    answer:
      "For inquiries, you can message us here on chat, visit our Facebook page, or check our website. Our team will respond as soon as possible.",
    quickReplies: ["Open Facebook", "Chat with Us", "Check Rates"],
  },
  {
    id: "book-now",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: ["book now", "reserve now", "book this date", "i want to book", "reservation inquiry"],
    question: "How do I book?",
    answer:
      "To book, please send your preferred date, time, and guest count. We'll check availability and send you the payment instructions. A down payment is required to secure your slot.",
    quickReplies: ["Check Availability", "View Rates", "Payment Options"],
  },

  // Event Setup
  {
    id: "event-setup",
    category: FAQ_CATEGORIES.GENERAL,
    keywords: [
      "event setup",
      "birthday",
      "wedding",
      "debut",
      "tables",
      "chairs",
      "decorations",
      "stylist",
      "lights and sound",
      "stage",
      "coordinator",
      "fireworks",
      "overnight after event",
      "event coordinators",
      "coordinator",
      "coordination",
    ],
    question: "Do you help with event setup?",
    answer:
      "Yes, we can assist with birthdays, weddings, debuts, and event setup inquiries. We can also recommend event coordinators if needed. Please send your event date and desired setup so we can confirm what is included.",
    quickReplies: ["View Packages", "Check Availability", "Contact Us"],
  },
  {
    id: "decorations-policy",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: [
      "restrictions on decorations",
      "decorations",
      "decorate",
      "styling",
      "balloons",
      "flowers",
    ],
    question: "Are there restrictions on decorations?",
    answer:
      "Decorations are allowed, but we may have guidelines to protect the venue and ensure safety. Please discuss your decoration plans with us when booking.",
    quickReplies: ["View Rules", "Contact Us", "Event Setup"],
  },
  {
    id: "rehearsals",
    category: FAQ_CATEGORIES.GENERAL,
    keywords: [
      "rehearsals before the event",
      "rehearsal",
      "rehearse",
      "practice",
    ],
    question: "Can we do rehearsals before the event?",
    answer:
      "Rehearsals may be arranged depending on availability and schedule. Please inquire when booking.",
    quickReplies: ["Check Availability", "Contact Us"],
  },

  // Reviews & Photos
  {
    id: "guest-photos",
    category: FAQ_CATEGORIES.GENERAL,
    keywords: [
      "can i",
      "can we see photos/videos",
      "pictures",
      "videos",
      "photo",
      "video",
      "gallery",
      "reviews",
      "guest photos",
      "guest videos",
      "post review",
      "write a review",
      "share a review",
    ],
    question: "Can I see guest photos and videos?",
    answer:
      "Yes! Browse guest photos and videos, or share your own through a review: [Reviews](/reviews)",
    quickReplies: ["View Reviews", "Post Review", "Check Rates"],
  },

  // ===== Additional booking details =====
  {
    id: "setup-time",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: [
      "setup time",
      "set up time",
      "start setting up",
      "what time can we start",
      "early access",
      "access time",
    ],
    question: "What time can we start setting up?",
    answer:
      "Setup time depends on the agreed schedule and package, but we usually allow access before the event start time. Please confirm your setup schedule when booking.",
    quickReplies: ["How to Book", "Check Availability", "View Rules"],
  },
  {
    id: "guest-list",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: ["guest list", "guests list", "headcount", "list of guests"],
    question: "Do you need a guest list?",
    answer:
      "Yes, a guest list is helpful for planning and managing the event properly. Please send us your final headcount before the event date.",
    quickReplies: ["How to Book", "Check Rates"],
  },
  {
    id: "extend-event",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: [
      "extend the event duration",
      "extend event duration",
      "extend",
      "extension",
      "late checkout",
    ],
    question: "Can we extend our stay?",
    answer:
      "Extensions are possible depending on availability and may have additional fees. Please inform us early so we can hold the schedule for you.",
    quickReplies: ["View Rates", "Contact Us"],
  },
  {
    id: "overnight-after-event",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: ["overnight after event", "sleep over", "stay overnight", "overnight stay"],
    question: "Can we stay overnight after our event?",
    answer:
      "Yes! Our 21-hour Overnight package is perfect for events that run late. It includes extended access, plus 4 free jacuzzi hours.",
    quickReplies: ["View Rates", "Check Availability", "Book Now"],
  },
  {
    id: "cleaning",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: [
      "cleaning services",
      "cleanup",
      "cleaning after the event",
      "cleaning fee",
    ],
    question: "Is cleaning included?",
    answer:
      "Basic cleaning is included, but additional cleanup may be required for excessive mess. Please keep the venue tidy during your event.",
    quickReplies: ["View Rules", "Contact Us"],
  },
  {
    id: "damage",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: ["damage", "broken", "breakage", "liability", "responsibility"],
    question: "Who is responsible for damages?",
    answer:
      "The renter is responsible for any damage to the venue, furniture, or equipment during the stay. The security deposit covers these costs and is refundable based on the condition of the venue after the event.",
    quickReplies: ["View Rules", "Payment Options", "Contact Us"],
  },
  {
    id: "electricity",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: [
      "electricity included",
      "electricity",
      "power",
      "power supply",
      "lights and power",
    ],
    question: "Is electricity included?",
    answer:
      "Yes, electricity is included for standard use within the event. If you need extra power for heavy equipment, please let us know in advance.",
    quickReplies: ["View Amenities", "Check Rates"],
  },
  {
    id: "corkage",
    category: FAQ_CATEGORIES.POLICIES,
    keywords: ["corkage fee", "corkage", "outside drinks", "outside alcohol"],
    question: "Is there a corkage fee?",
    answer:
      "Corkage fees may apply for certain outside items, depending on the agreement. Please mention it during booking so we can include it in your total.",
    quickReplies: ["View Rules", "Payment Options", "How to Book"],
  },
  {
    id: "tv-netflix",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["tv", "netflix", "television", "screen", "projector"],
    question: "Is there a TV or projector?",
    answer:
      "We have a TV for your entertainment needs. For larger setups like projectors or staging, please discuss with us in advance so we can arrange it.",
    quickReplies: ["View Amenities", "Contact Us"],
  },
  {
    id: "videoke",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["videoke", "karaoke", "sing", "mic", "microphone"],
    question: "Is videoke available?",
    answer:
      "Yes! A JBL PartyBox Ultimate speaker with 2 wireless microphones is included, so you can sing to your heart's content.",
    quickReplies: ["View Amenities", "Check Rates", "Book Now"],
  },
  {
    id: "games",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["games", "billiards", "pool table", "shuffleboard", "sports", "basketball"],
    question: "What games are available?",
    answer:
      "We have assorted indoor games for guests to enjoy. Ask our staff about the available options during your stay.",
    quickReplies: ["View Amenities", "See Photos", "Check Rates"],
  },
  {
    id: "bathrooms",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["bathroom", "restroom", "toilet", "shower", "heater", "changing room"],
    question: "How many bathrooms are there?",
    answer:
      "We have 2 bathrooms with heaters, so taking a shower during your stay is comfortable even at night.",
    quickReplies: ["View Amenities", "Room Details", "Check Rates"],
  },
  {
    id: "dining-table",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["dining table", "table", "chairs", "seating", "12-seat", "pantry"],
    question: "How many can fit at the dining table?",
    answer:
      "We have a 12-seat dining table, plus a full set of 30 tableware for your guests.",
    quickReplies: ["View Amenities", "Event Setup", "Check Rates"],
  },
  {
    id: "drinking-water",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["drinking water", "mineral water", "water dispenser", "free gallon", "bottled water"],
    question: "Is drinking water provided?",
    answer:
      "Yes, 1 free gallon of mineral water is included. Additional gallons are ₱50 each. We also have a hot/cold water dispenser in the kitchen.",
    quickReplies: ["Kitchen Equipment", "View Rates"],
  },
  {
    id: "hours",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: ["opening hours", "business hours", "what time do you open", "what time do you close"],
    question: "What are your operating hours?",
    answer:
      "Our packages set the schedule for you:\n• Day Time: 9AM to 6PM\n• Night Time: 9PM to 6AM\n• Overnight: 9AM to 6AM the next day\n\nPlease arrive within your booked window.",
    quickReplies: ["View Rates", "Check Availability", "Book Now"],
  },
  {
    id: "how-to-reserve-alternatively",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: ["reservation inquiry", "inquire", "inquiry", "asking", "just want to ask"],
    question: "How can I reserve?",
    answer:
      "Send us your preferred date, time, and guest count here in chat, and we'll reply with availability and payment instructions. A down payment secures your slot.",
    quickReplies: ["Check Availability", "View Rates", "Payment Options"],
  },
  {
    id: "amenities-photos",
    category: FAQ_CATEGORIES.GENERAL,
    keywords: ["view photos", "view images", "see pictures", "look at the place", "venue photos"],
    question: "Can I see photos of the venue?",
    answer:
      "Absolutely! Browse guest photos and videos of Hacienda Amara on our Reviews page, or check out the About Us page for a full amenity tour.",
    quickReplies: ["Guest Reviews", "View Amenities", "Check Rates"],
  },
  {
    id: "packages-overview",
    category: FAQ_CATEGORIES.RATES,
    keywords: ["view packages", "packages available", "what packages", "package options", "inclusions per package"],
    question: "What packages do you offer?",
    answer:
      "We offer three packages:\n• Day Time (9AM-6PM, 9 hours) — ₱6,999 to ₱7,999\n• Night Time (9PM-6AM, 9 hours) — ₱7,999 to ₱8,999\n• Overnight (21 hours) — ₱14,999 to ₱17,999\n\nAll for 20 pax. Extra pax ₱200/head. Kids 8 & below are FREE!",
    quickReplies: ["View Rates", "Check Availability", "Book Now"],
  },
  {
    id: "pax-extra",
    category: FAQ_CATEGORIES.RATES,
    keywords: ["extra pax", "additional guests fee", "per head", "head", "additional guest", "extra guest", "extra guests", "kids free", "children"],
    question: "How much for extra guests?",
    answer:
      "Rates are for 20 pax. Additional pax are ₱200/head. Kids 8 years old and below are FREE!",
    quickReplies: ["View Rates", "Check Availability", "Book Now"],
  },
  {
    id: "heated-pool",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["heated pool", "warm pool", "pool heating", "1000 per hour", "jacuzzi hours", "free jacuzzi"],
    question: "Is the pool heated?",
    answer:
      "The jacuzzi/kiddie pool has 2 free hours included (4 hours for 21-hour stays). Heated pool use is ₱1,000/hour.",
    quickReplies: ["Pool Details", "View Rates", "Book Now"],
  },
  {
    id: "gas-stove",
    category: FAQ_CATEGORIES.AMENITIES,
    keywords: ["gas stove", "stove", "cooking", "luto", "bring lngk"],
    question: "Is there a gas stove for cooking?",
    answer:
      "Yes! A gas stove is available for ₱300 for 9-hour stays or ₱400 for 21-hour stays. The kitchen also has a rice cooker, microwave, and cookware.",
    quickReplies: ["Kitchen Equipment", "View Rates"],
  },
  {
    id: "exclusive-use",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: ["exclusive", "private", "privately", "whole venue", "whole property", "yours alone"],
    question: "Is the venue exclusive/private?",
    answer:
      "Yes, Hacienda Amara is a private venue. When you book, the whole property is reserved for your group only.",
    quickReplies: ["View Rates", "Check Availability", "Book Now"],
  },
  {
    id: "commitment-fee",
    category: FAQ_CATEGORIES.PAYMENT,
    keywords: ["commitment fee", "confirmation fee", "booking fee", "reservation fee", "to reserve"],
    question: "Is there a fee to reserve?",
    answer:
      "A down payment is required to secure your slot. The amount depends on the package and total cost, and the remaining balance is settled before or on the event date.",
    quickReplies: ["Payment Options", "View Rates", "Check Availability"],
  },
  {
    id: "refund-policy",
    category: FAQ_CATEGORIES.PAYMENT,
    keywords: ["refund", "refundable", "cancel booking refund", "money back", "deposit refund"],
    question: "Is the down payment refundable?",
    answer:
      "The security deposit is refundable based on the condition of the venue after the event. Down payment refunds depend on the cancellation terms agreed at booking time.",
    quickReplies: ["View Rules", "Contact Us", "Payment Options"],
  },
  {
    id: "gcash",
    category: FAQ_CATEGORIES.PAYMENT,
    keywords: ["gcash", "bdo", "bpi", "bank", "transfer", "credit card", "debit", "cash", "mode of payment"],
    question: "What payment methods do you accept?",
    answer:
      "We accept GCash, bank transfer, and cash. For booking, a down payment is required to secure your slot, and the remaining balance is settled before or on the event date.",
    quickReplies: ["View Payment Details", "Check Rates", "Book Now"],
  },
  {
    id: "national-booking",
    category: FAQ_CATEGORIES.BOOKING,
    keywords: ["from manila", "from nationwide", "anywhere in the philippines", "out of town", "travel", "commute", "jejous"],
    question: "Can I book from outside Rizal?",
    answer:
      "Yes! Many of our guests come from all over the Philippines. The venue is in Amityville, Brgy. San Jose, Rodriguez, Rizal, and we can guide you on the travel route.",
    quickReplies: ["See Location", "Check Availability", "View Rates"],
  },
  {
    id: "safe-clean",
    category: FAQ_CATEGORIES.GENERAL,
    keywords: ["is it safe", "accessible", "commute", "near", "how far", "travel time"],
    question: "Is the place safe and accessible?",
    answer:
      "Hacienda Amara is in a residential area in Rodriguez, Rizal, with a gate, side parking, and 2 heated bathrooms. Send us your origin and we can estimate travel time.",
    quickReplies: ["See Location", "View Amenities", "Contact Us"],
  },
  {
    id: "thank-you",
    category: FAQ_CATEGORIES.GENERAL,
    keywords: ["thank you", "thanks", "salamat", "great", "perfect", "ok", "okay", "yes", "no", "noted"],
    question: "Thanks!",
    answer:
      "You're welcome! Anything else I can help you with? Feel free to ask about availability, rates, amenities, location, or event setup.",
    quickReplies: ["Check Availability", "View Rates", "See Location"],
  },
];

// Quick reply button groups for common scenarios
export const QUICK_REPLY_GROUPS = {
  WELCOME: [
    "What is Hacienda Amara?",
    "Check Availability",
    "View Rates",
    "See Location",
  ],
  BOOKING_INQUIRY: [
    "How to Book",
    "Check Availability",
    "View Rates",
    "Payment Options",
  ],
  AMENITIES_INQUIRY: [
    "View Amenities",
    "Pool Details",
    "Room Details",
    "Kitchen Equipment",
  ],
  EVENT_INQUIRY: [
    "Event Setup",
    "Check Availability",
    "View Rates",
    "Contact Us",
  ],
  GENERAL_HELP: [
    "View Rules",
    "See Location",
    "Facebook Page",
    "Guest Reviews",
  ],
  PAYMENT_INQUIRY: [
    "View Payment Details",
    "View Rates",
    "How to Book",
    "Contact Us",
  ],
  LOCATION_INQUIRY: [
    "See Location",
    "Facebook Page",
    "Check Availability",
    "View Rates",
  ],
  RULES_INQUIRY: [
    "View Rules",
    "Check-in Time",
    "Site Visit",
    "Contact Us",
  ],
};

// Helper functions
export const findFaqByKeywords = (userMessage) => {
	const lowerText = String(userMessage || "").toLowerCase().trim();
	if (!lowerText) return null;

	let bestMatch = null;
	let bestLength = 0;

	for (const item of FAQ_ITEMS) {
		for (const keyword of item.keywords) {
			const normalized = keyword.toLowerCase();
			if (!normalized || !lowerText.includes(normalized)) continue;

			// Prefer the most specific match so generic words like "available"
			// never shadow a precise topic such as "parking" or "kitchen".
			if (normalized.length > bestLength) {
				bestLength = normalized.length;
				bestMatch = item;
			}
		}
	}

	return bestMatch;
};

export const getFaqByCategory = (category) => {
  return FAQ_ITEMS.filter((item) => item.category === category);
};

export const getAllCategories = () => {
  return Object.values(FAQ_CATEGORIES);
};

export const getQuickRepliesForContext = (context) => {
  return QUICK_REPLY_GROUPS[context] || QUICK_REPLY_GROUPS.WELCOME;
};

export const getRandomWelcomeQuickReplies = () => {
  return QUICK_REPLY_GROUPS.WELCOME;
};