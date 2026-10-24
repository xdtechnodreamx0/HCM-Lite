export const CURRENCY = "PKR" as const;

export function toPaisa(rupees: number) {
  if (!Number.isFinite(rupees)) {
    throw new Error("Invalid money amount");
  }
  return Math.round(rupees * 100);
}

export function fromPaisa(paisa: number) {
  return paisa / 100;
}

export function percentOfPaisa(paisa: number, percent: number) {
  return Math.round((paisa * percent) / 100);
}

export function formatPkr(paisa: number) {
  const rupees = fromPaisa(paisa);
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function roundPaisa(value: number) {
  return Math.round(value);
}
