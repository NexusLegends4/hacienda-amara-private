import { createClient } from "@supabase/supabase-js";
import { hasAal2Claim } from "./utils/auth.js";
import {
  countBookingsByMonth,
  DISPLAY_MONTHS,
  FORECAST_MONTHS,
  getForecastMonths,
  isMissingHistoricalBookingsTable,
  getRecentMonths,
  HISTORY_MONTHS,
  parseBookingForecast,
} from "./utils/booking-analytics.js";

const GROQ_MODEL = "llama-3.1-8b-instant";

const json = (body, status = 200) => Response.json(body, { status });

async function getStaffUser(request, supabaseUrl, serviceRoleKey) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken || !hasAal2Claim(accessToken)) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;

  const user = await response.json();
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  if (!profileResponse.ok) return null;

  const profiles = await profileResponse.json();
  return ["admin", "staff"].includes(profiles[0]?.role) ? user : null;
}

async function predictBookings(history, expectedMonths, apiKey) {
  if (!apiKey) {
    throw new Error("AI forecast is not configured on the server.");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You forecast monthly resort reservation requests from historical monthly counts. Treat the supplied counts as the only facts. Consider trend, seasonality, and sparse history; make conservative integer predictions, never claim certainty, and do not invent external causes. Return only JSON with this shape: {\"predictions\":[{\"month\":\"YYYY-MM\",\"bookings\":0,\"reason\":\"short explanation\"}],\"summary\":\"short overall explanation\"}. Include exactly one prediction for each requested month, in the supplied order.",
          },
          {
            role: "user",
            content: JSON.stringify({
              historicalMonthlyReservationRequests: history,
              monthsToForecast: expectedMonths,
              requestedForecastMonths: FORECAST_MONTHS,
            }),
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    console.error("Groq booking forecast failed:", response.status);
    throw new Error("AI forecast service is currently unavailable.");
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("AI forecast service returned an empty prediction.");
  }

  return parseBookingForecast(content, expectedMonths);
}

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Booking analytics is not configured on the server." }, 503);
  }

  try {
    const user = await getStaffUser(request, supabaseUrl, serviceRoleKey);
    if (!user) {
      return json({ error: "Staff or administrator access with MFA is required." }, 403);
    }

    const historicalMonths = getRecentMonths(new Date(), HISTORY_MONTHS);
    const firstMonth = historicalMonths[0];
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const records = [];
    const currentMonthStart = `${new Date().toISOString().slice(0, 7)}-01`;
    const pageSize = 1000;
    let historicalBookingsUnavailable = false;

    for (const source of [
      { table: "historical_bookings", dateColumn: "booking_date" },
      { table: "reservations", dateColumn: "check_in" },
    ]) {
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from(source.table)
          .select(source.dateColumn)
          .gte(source.dateColumn, `${firstMonth}-01`)
          .lt(source.dateColumn, currentMonthStart)
          .order(source.dateColumn, { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) {
          if (
            source.table === "historical_bookings" &&
            isMissingHistoricalBookingsTable(error)
          ) {
            historicalBookingsUnavailable = true;
            console.warn(
              "Historical bookings table is missing from the Supabase API schema cache.",
            );
            break;
          }
          throw error;
        }
        records.push(...data);
        if (data.length < pageSize) break;
      }
    }

    const fullHistory = countBookingsByMonth(records, historicalMonths);
    const completedHistory = fullHistory.slice(0, -1);
    const history = completedHistory.slice(-DISPLAY_MONTHS);
    const forecastMonths = getForecastMonths(new Date(), FORECAST_MONTHS);
    const hasHistoricalBookings = completedHistory.some((month) => month.bookings > 0);
    let forecast = {
      predictions: [],
      summary: "There is no reservation history yet, so an AI forecast cannot be generated.",
    };
    let forecastError = null;

    if (hasHistoricalBookings) {
      try {
        forecast = await predictBookings(
          completedHistory,
          forecastMonths,
          process.env.GROQ_API_KEY,
        );
      } catch (error) {
        console.error("Booking forecast unavailable:", error);
        forecast = null;
        forecastError = error?.message || "The AI forecast is temporarily unavailable.";
      }
    }

    return json({
      history,
      forecast,
      forecastError,
      historicalBookingsUnavailable,
      generatedAt: new Date().toISOString(),
      includesStatuses: ["pending", "confirmed", "cancelled"],
      basedOn: "Booking date (check_in). Only completed months are included in historical counts and AI training.",
    });
  } catch (error) {
    console.error("Booking analytics failed:", error);
    return json({ error: error?.message || "Unable to load booking analytics." }, 500);
  }
}
