/** OB/GYN gravida & parity helpers (parity = viable≥28wks + loss before 28wks). */

export interface ParityParts {
  viable: number;
  loss: number;
}

export function parseParityNotation(value: unknown): ParityParts | null {
  if (value === undefined || value === null || value === '') return null;
  const match = String(value).trim().match(/^(\d+)\+(\d+)$/);
  if (!match) return null;
  return {
    viable: parseInt(match[1], 10),
    loss: parseInt(match[2], 10),
  };
}

export function formatParityNotation(viable: number, loss: number): string {
  return `${viable ?? 0}+${loss ?? 0}`;
}

export function formatGravidaParityDisplay(
  gravida: number | null | undefined,
  parityViable: number | null | undefined,
  parityLoss?: number | null | undefined,
): string | null {
  if (gravida == null) return null;
  const viable = parityViable ?? 0;
  const loss = parityLoss ?? 0;
  return `Gravida ${gravida}, Para ${formatParityNotation(viable, loss)}`;
}

/** Read parity from API record (supports legacy integer-only parity). */
export function readParityFromRecord(record: {
  parity?: number | string | null;
  parityLoss?: number | null;
  parity_loss?: number | null;
}): ParityParts {
  const loss = record.parityLoss ?? record.parity_loss ?? 0;
  const parity = record.parity;

  if (typeof parity === 'string') {
    const parsed = parseParityNotation(parity);
    if (parsed) return parsed;
  }

  return {
    viable: typeof parity === 'number' ? parity : parseInt(String(parity ?? 0), 10) || 0,
    loss: loss ?? 0,
  };
}

export function validateGravidaParity(
  gravida: number,
  parityNotation: string,
): string | null {
  if (!Number.isFinite(gravida) || gravida < 1) {
    return 'Gravida must be at least 1 (total pregnancies including current)';
  }

  const parts = parseParityNotation(parityNotation);
  if (!parts) {
    return 'Parity must be in format viable+loss (e.g. 0+1). First number = pregnancies ≥28 weeks; second = losses before 28 weeks';
  }

  const { viable, loss } = parts;
  const priorOutcomes = viable + loss;

  if (priorOutcomes > gravida) {
    return 'Viable + loss cannot exceed gravida';
  }

  // Current pregnancy is counted in gravida but not yet in parity until outcomes are known.
  if (gravida < priorOutcomes + 1) {
    return 'Gravida must be at least viable + loss + 1 (includes current pregnancy). E.g. second pregnancy after miscarriage: Gravida 2, Parity 0+1';
  }

  return null;
}

export function toParityStorage(parityNotation: string): { parity: number; parityLoss: number } {
  const parts = parseParityNotation(parityNotation) ?? { viable: 0, loss: 0 };
  return { parity: parts.viable, parityLoss: parts.loss };
}
