import { describe, expect, it } from "vitest";
import {
  countBookingsByMonth,
  getForecastMonths,
  getRecentMonths,
  parseBookingForecast,
} from "../booking-analytics";

describe("booking analytics helpers", () => {
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

  it("counts bookings by created month and includes empty months", () => {
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
