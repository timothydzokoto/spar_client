export type ValidationResult = {
  values: string[];
  errors: string[];
};

export type EffectiveDeckInfo = {
  size: number;
  enoughForRound: boolean;
  minimumRequired: number;
};

export function parseCSV(input: string): string[] {
  if (!input.trim()) {
    return [];
  }
  return input
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0);
}

export function validateRankTokens(input: string): ValidationResult {
  const values = parseCSV(input);
  const errors: string[] = [];
  const allowed = new Set(["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]);

  for (const token of values) {
    if (!allowed.has(token)) {
      errors.push(`Invalid excluded rank: ${token}`);
    }
  }

  return { values, errors };
}

export function validateCardTokens(input: string): ValidationResult {
  const values = parseCSV(input);
  const errors: string[] = [];
  const rankAllowed = new Set(["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]);
  const suitAllowed = new Set(["C", "D", "H", "S"]);

  for (const token of values) {
    if (token.length < 2) {
      errors.push(`Invalid excluded card: ${token}`);
      continue;
    }
    const suit = token.slice(-1);
    const rank = token.slice(0, -1);
    if (!rankAllowed.has(rank) || !suitAllowed.has(suit)) {
      errors.push(`Invalid excluded card: ${token}`);
    }
  }

  return { values, errors };
}

export function computeEffectiveDeckInfo(
  excludedRanks: string[],
  excludedCards: string[],
  playerCountForValidation: number,
): EffectiveDeckInfo {
  const excludedRankSet = new Set(excludedRanks);
  const excludedCardSet = new Set(excludedCards);
  const rankRemoved = excludedRankSet.size * 4;
  let cardRemoved = 0;

  for (const card of excludedCardSet) {
    const rank = card.slice(0, -1);
    if (!excludedRankSet.has(rank)) {
      cardRemoved += 1;
    }
  }

  const size = 52 - rankRemoved - cardRemoved;
  const minimumRequired = playerCountForValidation * 5;
  return {
    size,
    minimumRequired,
    enoughForRound: size >= minimumRequired,
  };
}
