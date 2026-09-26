import React from "react";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";

const Rules = () => {
  const navigate = useNavigate();
  const sections = [
    {
      title: "Food & Beverages",
      rules: [
        "No Food and Drinks by the pool. We have provided tables outside and in the living room for your convenience.",
        "Strictly no food and drinks inside the bedrooms to maintain cleanliness and prevent pests.",
        "Glass bottles (alcohol or soft drinks) are not allowed near the pool. Please transfer drinks to the pitchers provided in the kitchen to prevent hazards from broken glass."
      ],
      icon: "🍽️"
    },
    {
      title: "Smoking Policy",
      rules: [
        "Smoking is strictly prohibited inside the living room, bedrooms, and kitchen.",
        "A designated smoking area is located near the gate. Please use the provided ash trays."
      ],
      icon: "🚬"
    },
    {
      title: "Safety & Pool Conduct",
      rules: [
        "Please be responsible and mindful of each other's safety.",
        "Children must always be accompanied by an adult when in or near the pool area.",
        "Refrain from diving or running around the pool deck to avoid accidents."
      ],
      icon: "🏊"
    },
    {
      title: "Amenities & Entertainment",
      rules: [
        "For Karaoke and electronic games: Do not use equipment when wet to avoid electric shock and damage.",
        "Take care of board games and card games. Avoid getting them wet or damaging the boxes.",
        "Ensure no pieces are missing and return all items to their proper place after use."
      ],
      icon: "🎤"
    },
    {
      title: "Property Care & Pets",
      rules: [
        "Please maintain cleanliness and avoid damaging furniture or appliances. Any damage or loss will be charged to the guest.",
        "Pets must be manageable. Owners are responsible for ensuring pets wear diapers at all times indoors.",
        "Ensure pets do not damage furniture or appliances (charges apply for any damage)."
      ],
      icon: "🐾"
    }
  ];

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-16">
          {/* Hero Section (Matches About Us UI) */}
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center justify-between">
            <div className="text-center lg:text-left max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                Rules & Guidelines
              </h1>
              <div className="py-8 space-y-6 text-slate-700 text-lg leading-relaxed text-left">
                <p className="font-semibold text-slate-900 text-xl">
                  To ensure a safe, clean, and enjoyable stay for everyone, we kindly ask our guests to follow these guidelines.
                </p>
                <p>
                  At Hacienda Amara, we strive to provide a relaxing environment. Following these simple rules helps us maintain the quality of our facilities for all our visitors to enjoy.
                </p>
                <div className="pt-4 flex justify-center lg:justify-start gap-4">
                  <button 
                    onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")} 
                    className="btn btn-black rounded-full px-10 border-black text-white hover:bg-slate-800 transition-all"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>

            {/* Important Reminders Card (Matches About Us card) */}
            <div className="card bg-white/70 w-full max-w-md shrink-0 shadow-2xl border border-black/5 backdrop-blur-xl rounded-[2.5rem]">
              <div className="card-body p-8 md:p-12 space-y-8">
                <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 uppercase tracking-tight">
                  <span className="text-3xl">⚠️</span> Reminders
                </h2>
                <div className="space-y-4">
                  <div className="bg-black/5 rounded-2xl p-5 border border-black/5">
                    <p className="font-black text-amber-900 uppercase text-[0.65rem] tracking-widest mb-2">Valuables</p>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      Please take care of your valuables. The management is not responsible for any loss or damage.
                    </p>
                  </div>
                  <div className="bg-black/5 rounded-2xl p-5 border border-black/5">
                    <p className="font-black text-amber-900 uppercase text-[0.65rem] tracking-widest mb-2">Damages</p>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      Any damage to the property, furniture, or appliances will be charged accordingly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Rules Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section, index) => (
              <div key={index} className="group rounded-[2.5rem] border border-black/5 bg-white/75 p-6 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl hover:scale-[1.02] sm:p-8">
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-4 border-b border-black/5 pb-4">
                    <span className="text-4xl transition-transform group-hover:scale-110">{section.icon}</span>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{section.title}</h2>
                  </div>
                  <ul className="list-disc list-outside ml-5 space-y-3 text-sm text-slate-600 font-medium leading-relaxed">
                    {section.rules.map((rule, rIndex) => (
                      <li key={rIndex}>{rule}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center py-10 text-slate-400 font-bold uppercase tracking-[0.2em] text-[0.65rem]">
            Thank you for your cooperation and have a wonderful stay!
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Rules;