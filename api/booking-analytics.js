import { createClient } from "@supabase/supabase-js";
import { hasStaffVerificationClaim } from "./utils/auth.js";
import {
  assessForecastHistory,
  countBookingsByMonth,
  createHistoricalForecast,
  DISPLAY_MONTHS,
  FORECAST_MONTHS,
  getForecastMonths,
  isMissingHistoricalBookingsTable,
  isMissingForecastSnapshotsTable,
  getRecentMonths,
  HISTORY_MONTHS,
  isBookingAnalyticsAdmin,
  parseBookingForecast,
  selectForecastComparisons,
} from "./utils/booking-analytics.js";

const GROQ_MODEL = "llama-3.1-8b-instant";
const SNAPSHOT_PAGE_SIZE = 1000;

const json = (body, status = 200) => Response.json(body, { status });

async function getAdminUser(request, supabaseUrl, anonKey, serviceRoleKey) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return { error: "Your sign-in session is missing. Sign in again.", status: 401 };
  }
  if (!hasStaffVerificationClaim(accessToken)) {
    return {
      error: "Your administrator session has not completed MFA verification. Sign out, sign in again, and complete the authenticator or email-code step.",
      status: 403,
    };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    console.warn("Booking Analytics session validation failed:", userError?.code || "unknown error");
    return { error: "Supabase rejected your sign-in session. Sign in again.", status: 401 };
  }

  const user = userData.user;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error(
      "Unable to verify Booking Analytics profile role:",
      profileError.code || "unknown error",
      profileError.message,
    );
    return { error: "Unable to verify your administrator profile. Try again later.", status: 503 };
  }

  if (!isBookingAnalyticsAdmin(profile?.role)) {
    return { error: "This account does not have the administrator role required for Booking Analytics.", status: 403 };
  }
  return { user };
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

async function updateAndReadForecastComparisons(supabase, completedHistory, currentMonthStart) {
  const history = completedHistory.slice(-DISPLAY_MONTHS);
  if (!history.length) return { comparisons: [], unavailable: false, setupRequired: false };

  const snapshots = [];
  try {
    for (let offset = 0; ; offset += SNAPSHOT_PAGE_SIZE) {
      const { data, error } = await supabase
        .from("booking_forecast_snapshots")
        .select("forecast_date, target_month, predicted_bookings, forecast_source, actual_bookings")
        .gte("target_month", `${history[0].month}-01`)
        .lt("target_month", currentMonthStart)
        .order("forecast_date", { ascending: false })
        .range(offset, offset + SNAPSHOT_PAGE_SIZE - 1);
      if (error) throw error;
      snapshots.push(...(data || []));
      if (!data || data.length < SNAPSHOT_PAGE_SIZE) break;
    }

    const monthlyCounts = new Map(history.map(({ month, bookings }) => [month, bookings]));
    const monthsToUpdate = new Set();
    for (const snapshot of snapshots) {
      const month = String(snapshot.target_month || "").slice(0, 7);
      if (monthlyCounts.has(month) && snapshot.actual_bookings !== monthlyCounts.get(month)) {
        monthsToUpdate.add(month);
      }
    }

    for (const month of monthsToUpdate) {
      const { error } = await supabase
        .from("booking_forecast_snapshots")
        .update({
          actual_bookings: monthlyCounts.get(month),
          actual_updated_at: new Date().toISOString(),
        })
        .eq("target_month", `${month}-01`);
      if (error) throw error;
    }

    const evaluatedSnapshots = snapshots.map((snapshot) => {
      const month = String(snapshot.target_month || "").slice(0, 7);
      return monthlyCounts.has(month)
        ? { ...snapshot, actual_bookings: monthlyCounts.get(month) }
        : snapshot;
    });
    return {
      comparisons: selectForecastComparisons(evaluatedSnapshots, DISPLAY_MONTHS),
      unavailable: false,
    };
  } catch (error) {
    if (isMissingForecastSnapshotsTable(error)) {
      return { comparisons: [], unavailable: true, setupRequired: true };
    }
    console.error("Unable to update forecast comparisons:", error?.message || error);
    return { comparisons: [], unavailable: true, setupRequired: false };
  }
}

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Booking analytics is not configured on the server." }, 503);
  }

  try {
    const adminAuth = await getAdminUser(request, supabaseUrl, anonKey, serviceRoleKey);
    if (adminAuth.error) {
      return json({ error: adminAuth.error }, adminAuth.status);
    }

    const now = new Date();
    const historicalMonths = getRecentMonths(now, HISTORY_MONTHS);
    const firstMonth = historicalMonths[0];
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const records = [];
    const currentMonthStart = `${now.toISOString().slice(0, 7)}-01`;
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
    const readiness = assessForecastHistory(completedHistory);
    const forecastMonths = getForecastMonths(now, FORECAST_MONTHS);
    const comparisonResult = await updateAndReadForecastComparisons(
      supabase,
      completedHistory,
      currentMonthStart,
    );
    let forecast = {
      predictions: [],
      summary: readiness.sufficient
        ? "A forecast could not be generated right now."
        : `Forecasting is paused until at least ${readiness.minimumMonths} completed months include ${readiness.minimumActiveMonths} months with bookings and ${readiness.minimumBookings} total bookings. Current data: ${readiness.completedMonths} months, ${readiness.activeMonths} active months, ${readiness.bookings} bookings.`,
    };
    let forecastError = null;
    let forecastSource = "none";

    if (readiness.sufficient) {
      if (!process.env.GROQ_API_KEY) {
        forecast = createHistoricalForecast(completedHistory, forecastMonths);
        forecastError = "GROQ_API_KEY is not configured; showing a historical trend estimate instead.";
        forecastSource = "historical";
      } else {
        try {
          forecast = await predictBookings(
            completedHistory,
            forecastMonths,
            process.env.GROQ_API_KEY,
          );
          forecastSource = "ai";
        } catch (error) {
          console.error("Booking forecast unavailable:", error);
          forecast = createHistoricalForecast(completedHistory, forecastMonths);
          forecastError = `${error?.message || "The AI forecast is temporarily unavailable."} Showing a historical trend estimate instead.`;
          forecastSource = "historical";
        }
      }
    }

    let forecastTrackingUnavailable = comparisonResult.unavailable;
    let forecastTrackingSetupRequired = comparisonResult.setupRequired;
    if (forecast.predictions.length > 0) {
      const forecastDate = now.toISOString().slice(0, 10);
      const rows = forecast.predictions.map((prediction) => ({
        forecast_date: forecastDate,
        target_month: `${prediction.month}-01`,
        predicted_bookings: prediction.bookings,
        forecast_source: forecastSource,
        reason: prediction.reason,
      }));
      const { error: snapshotError } = await supabase
        .from("booking_forecast_snapshots")
        .upsert(rows, {
          onConflict: "forecast_date,target_month",
          ignoreDuplicates: true,
        });
      if (snapshotError) {
        if (isMissingForecastSnapshotsTable(snapshotError)) {
          forecastTrackingUnavailable = true;
          forecastTrackingSetupRequired = true;
        } else {
          console.error("Unable to save booking forecast snapshots:", snapshotError.message);
          forecastTrackingUnavailable = true;
        }
      }
    }

    return json({
      history,
      forecast,
      forecastError,
      forecastSource,
      historicalBookingsUnavailable,
      forecastReadiness: readiness,
      forecastComparisons: comparisonResult.comparisons,
      forecastTrackingUnavailable,
      forecastTrackingSetupRequired,
      generatedAt: now.toISOString(),
      includesStatuses: ["pending", "confirmed", "cancelled"],
      basedOn: "Booking date (check_in). Only completed months are included in historical counts and AI training.",
    });
  } catch (error) {
    console.error("Booking analytics failed:", error);
    return json({ error: error?.message || "Unable to load booking analytics." }, 500);
  }
}
