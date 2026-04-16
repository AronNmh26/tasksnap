import { toLocalReadable } from "../src/core/utils/date";

describe("date utils", () => {
  it("returns a friendly fallback when no date is provided", () => {
    expect(toLocalReadable(null)).toBe("No due date");
    expect(toLocalReadable(undefined)).toBe("No due date");
  });

  it("formats a valid ISO date", () => {
    const iso = "2024-01-01T00:00:00.000Z";
    expect(toLocalReadable(iso)).toBe(new Date(iso).toLocaleString());
  });
});
