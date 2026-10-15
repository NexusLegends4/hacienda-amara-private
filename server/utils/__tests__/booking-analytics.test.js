import { describe, expect, it } from "vitest";
import {
  countBookingsByMonth,
  createHistoricalForecast,
  getForecastMonths,
  getRecentMonths,
  isBookingAnalyticsAdmin,
  isMissingHistoricalBookingsTable,
  parseBookingForecast,
} from "../booking-analytics";

describe("booking analytics helpers", () => {
  it("allows analytics only for administrator profiles", () => {
    expect(isBookingAnalyticsAdmin("admin")).toBe(true);
    expect(isBookingAnalyticsAdmin("staff")).toBe(false);
    expect(isBookingAnalyticsAdmin("client")).toBe(false);
    expect(isBookingAnalyticsAdmin(null)).toBe(false);
  });

  it("builds a continuous month series across year boundaries", () => {
    expect(getRecentMonths(new Date("2026-01-12T00:00:00Z"), 3)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });

  it("returns only future months for the forecast horizon", () => {
    expect(getForecastMonths(new Date("2026-12-12T00:00:00Z"), 3)).toEqual([
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
  });

  it("recognizes only the missing historical booking table schema-cache error", () => {
    expect(
      isMissingHistoricalBookingsTable({
        code: "PGRST205",
        message: "Could not find the table 'public.historical_bookings' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isMissingHistoricalBookingsTable({
        code: "PGRST205",
        message: "Could not find the table 'public.reservations' in the schema cache",
      }),
    ).toBe(false);
    expect(
      isMissingHistoricalBookingsTable({
        code: "42501",
        message: "permission denied",
      }),
    ).toBe(false);
  });

  it("counts records by month and includes empty months", () => {
    const months = ["2026-01", "2026-02", "2026-03"];
    const series = countBookingsByMonth(
      [
        { created_at: "2026-01-02T12:00:00Z" },
        { created_at: "2026-01-28T12:00:00Z" },
        { created_at: "2026-03-01T00:00:00Z" },
        { created_at: "2025-12-31T23:59:00Z" },
      ],
      months,
    );

    expect(series).toEqual([
      { month: "2026-01", bookings: 2 },
      { month: "2026-02", bookings: 0 },
      { month: "2026-03", bookings: 1 },
    ]);
  });

  it("counts imported and live bookings by their booking date", () => {
    const months = ["2026-02", "2026-03"];
    expect(
      countBookingsByMonth(
        [
          { booking_date: "2026-02-13" },
          { check_in: "2026-02-14" },
          { check_in: "2026-03-02" },
        ],
        months,
      ),
    ).toEqual([
      { month: "2026-02", bookings: 2 },
      { month: "2026-03", bookings: 1 },
    ]);
  });

  it("accepts valid predictions in the requested month order", () => {
    const forecast = parseBookingForecast(
      JSON.stringify({
        predictions: [
          { month: "2026-04", bookings: 4, reason: "Recent demand is steady." },
          { month: "2026-05", bookings: 5, reason: "Seasonal demand may rise." },
        ],
        summary: "A modest increase is likely.",
      }),
      ["2026-04", "2026-05"],
    );

    expect(forecast.predictions).toHaveLength(2);
    expect(forecast.summary).toBe("A modest increase is likely.");
  });

  it("creates historical estimates for each requested month", () => {
    const forecast = createHistoricalForecast(
      [
        { month: "2025-01", bookings: 10 },
        { month: "2025-02", bookings: 20 },
        { month: "2026-01", bookings: 14 },
        { month: "2026-02", bookings: 22 },
      ],
      ["2027-01", "2027-02", "2027-03"],
    );

    expect(forecast.predictions).toHaveLength(3);
    expect(forecast.predictions.map(({ month }) => month)).toEqual([
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
    expect(forecast.predictions.every(({ bookings }) => bookings >= 0)).toBe(true);
    expect(forecast.predictions[0].reason).toContain("matching calendar months");
    expect(forecast.predictions[2].reason).toContain("recent six-month average");
  });

  it("rejects invalid, unordered, or incomplete predictions", () => {
    expect(() =>
      parseBookingForecast(
        JSON.stringify({
          predictions: [
            { month: "2026-05", bookings: 4, reason: "Demand is stable." },
          ],
          summary: "Stable.",
        }),
        ["2026-04"],
      ),
    ).toThrow("invalid monthly prediction");

    expect(() =>
      parseBookingForecast(
        JSON.stringify({
          predictions: [{ month: "2026-04", bookings: -1, reason: "Bad value." }],
          summary: "Invalid count.",
        }),
        ["2026-04"],
      ),
    ).toThrow("invalid monthly prediction");

    expect(() => parseBookingForecast("not json", ["2026-04"])).toThrow();
  });
});
