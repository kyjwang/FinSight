import { describe, expect, it } from "vitest";
import { compactNumber } from "./format";

describe("format", () => {
  it("formats high-volume market numbers compactly", () => {
    expect(compactNumber(288_300_000)).toBe("288.3M");
    expect(compactNumber(21_147_800_000)).toBe("21.1B");
  });
});
