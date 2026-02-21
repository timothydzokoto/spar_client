import { describe, expect, it } from "vitest";
import { computeEffectiveDeckInfo, parseCSV, validateCardTokens, validateRankTokens } from "./gameRules";

describe("parseCSV", () => {
  it("normalizes and trims values", () => {
    expect(parseCSV(" as, kh , 10d ")).toEqual(["AS", "KH", "10D"]);
  });

  it("returns empty for blank input", () => {
    expect(parseCSV("   ")).toEqual([]);
  });
});

describe("validateRankTokens", () => {
  it("accepts valid ranks", () => {
    expect(validateRankTokens("2,3,10,J,Q,K,A")).toEqual({
      values: ["2", "3", "10", "J", "Q", "K", "A"],
      errors: [],
    });
  });

  it("reports invalid ranks", () => {
    const result = validateRankTokens("1,B,5");
    expect(result.values).toEqual(["1", "B", "5"]);
    expect(result.errors).toEqual(["Invalid excluded rank: 1", "Invalid excluded rank: B"]);
  });
});

describe("validateCardTokens", () => {
  it("accepts valid cards", () => {
    expect(validateCardTokens("AS,10D,KH")).toEqual({
      values: ["AS", "10D", "KH"],
      errors: [],
    });
  });

  it("reports invalid card tokens", () => {
    const result = validateCardTokens("A,1H,10X");
    expect(result.errors).toEqual([
      "Invalid excluded card: A",
      "Invalid excluded card: 1H",
      "Invalid excluded card: 10X",
    ]);
  });
});

describe("computeEffectiveDeckInfo", () => {
  it("handles rank + specific card exclusions without double counting", () => {
    const result = computeEffectiveDeckInfo(["2", "3", "A"], ["AS", "KH"], 4);
    expect(result).toEqual({
      size: 39,
      minimumRequired: 20,
      enoughForRound: true,
    });
  });

  it("flags too-small decks", () => {
    const result = computeEffectiveDeckInfo(["2", "3", "4", "5", "6", "7", "8", "9", "10"], [], 4);
    expect(result.minimumRequired).toBe(20);
    expect(result.size).toBe(16);
    expect(result.enoughForRound).toBe(false);
  });
});
