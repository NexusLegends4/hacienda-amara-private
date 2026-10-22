import { createClient } from "@supabase/supabase-js";
import { hasStaffVerificationClaim } from "../server/utils/auth.js";
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
} from "../server/utils/booking-analytics.js";

const GROQ_MODEL = "openai/gpt-oss-20b";
const SNAPSHOT_PAGE_SIZE = 1000;

// Detects a table the current database role is not allowed to read, which
// happens when the analytics queries fall back from the service-role key to
// the administrator's own session.
const isForbiddenTableError = (error) => {
  const code = error?.code || "";
  const message = error?.message || "";
  return (
    code === "42501" ||
    code === "PGRST301" ||
    /permission denied|not authorized|row-level security/i.test(message)
  );
};

const json = (body, status = 200) => Response.json(body, { status });

function getUrlHost(value) {
  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}

function getTokenIssuerHost(accessToken) {
  try {
    const [, payload] = accessToken.split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return new URL(claims.iss).host;
  } catch {
    return "unreadable";
  }
}

async function getAdminUser(request, supabaseUrl, anonKey) {
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
    console.warn("Booking Analytics session validation failed:", {
      errorCode: userError?.code || "unknown",
      errorStatus: userError?.status || "unknown",
      supabaseHost: getUrlHost(supabaseUrl),
      tokenIssuerHost: getTokenIssuerHost(accessToken),
    });
    return { error: "Supabase rejected your sign-in session. Sign in again.", status: 401 };
  }

  const user = userData.user;
  // Read the profile with the caller's own session so no service-role key is
  // required for the role check.
  const profileClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: profile, error: profileError } = await profileClient
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
  return { user, accessToken };
}

// Builds the database client used for the analytics queries. The service-role
// key is preferred because it reaches the service-role-only tables. When it is
// absent, malformed, or issued for a different Supabase project, the
// administrator's own session is used instead so the analytics page keeps
// working with the data the row-level security policies already expose.
async function createAnalyticsClient(supabaseUrl, anonKey, serviceRoleKey, accessToken) {
  const looksUsable = Boolean(
    serviceRoleKey &&
      (serviceRoleKey.startsWith("eyJ") || serviceRoleKey.startsWith("sb_secret_")),
  );

  if (looksUsable) {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await serviceClient.from("reservations").select("id").limit(1);
    if (!error) return serviceClient;
    console.warn(
      "Booking Analytics service-role key is unusable, falling back to the administrator session:",
      error.code || "unknown",
      error.message,
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
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
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey) {
    return json({ error: "Booking analytics is not configured on the server." }, 503);
  }

  try {
    const adminAuth = await getAdminUser(request, supabaseUrl, anonKey);
    if (adminAuth.error) {
      return json({ error: adminAuth.error }, adminAuth.status);
    }

    const now = new Date();
    const historicalMonths = getRecentMonths(now, HISTORY_MONTHS);
    const firstMonth = historicalMonths[0];
    // Prefer the service-role key because it can read the service-role-only
    // tables. When it is missing or belongs to another project, fall back to
    // the administrator's own session so the page still works with the
    // reservations the row-level security policies already allow.
    const supabase = await createAnalyticsClient(supabaseUrl, anonKey, serviceRoleKey, adminAuth.accessToken);
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
            (isMissingHistoricalBookingsTable(error) || isForbiddenTableError(error))
          ) {
            historicalBookingsUnavailable = true;
            console.warn(
              "Historical bookings could not be read for Booking Analytics:",
              error.code || "unknown",
              error.message,
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



