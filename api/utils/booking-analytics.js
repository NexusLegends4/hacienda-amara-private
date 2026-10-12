export const HISTORY_MONTHS = 36;
export const DISPLAY_MONTHS = 12;
export const FORECAST_MONTHS = 3;

export function getRecentMonths(now = new Date(), count = HISTORY_MONTHS) {
  const currentMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(
        currentMonth.getUTCFullYear(),
        currentMonth.getUTCMonth() - count + index + 1,
        1,
      ),
    );
    return date.toISOString().slice(0, 7);
  });
}

export function getForecastMonths(now = new Date(), count = FORECAST_MONTHS) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + index + 1, 1),
    );
    return date.toISOString().slice(0, 7);
  });
}

export function countBookingsByMonth(records, months) {
  const counts = new Map(months.map((month) => [month, 0]));

  for (const record of records) {
    const date = record.booking_date || record.check_in || record.created_at;
    const month = date?.slice(0, 7);
    if (counts.has(month)) counts.set(month, counts.get(month) + 1);
  }

  return months.map((month) => ({ month, bookings: counts.get(month) }));
}

export function parseBookingForecast(content, expectedMonths) {
  const result = JSON.parse(content);

  if (
    !result ||
    !Array.isArray(result.predictions) ||
    result.predictions.length !== expectedMonths.length ||
    typeof result.summary !== "string" ||
    !result.summary.trim()
  ) {
    throw new Error("AI response does not match the expected forecast format.");
  }

  const predictions = result.predictions.map((prediction, index) => {
    if (
      prediction?.month !== expectedMonths[index] ||
      !Number.isInteger(prediction.bookings) ||
      prediction.bookings < 0 ||
      prediction.bookings > 10000 ||
      typeof prediction.reason !== "string" ||
      !prediction.reason.trim()
    ) {
      throw new Error("AI response contains an invalid monthly prediction.");
    }

    return {
      month: prediction.month,
      bookings: prediction.bookings,
      reason: prediction.reason.trim().slice(0, 240),
    };
  });

  return {
    predictions,
    summary: result.summary.trim().slice(0, 500),
  };
}
