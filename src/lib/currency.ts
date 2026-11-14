export const CURRENCY_CODE = "LKR";
export const CURRENCY_SYMBOL = "Rs. ";

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return "Rs. 0.00";
  return `Rs. ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCurrencyShort(amount: number | string | undefined | null): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return "Rs. 0";
  return `Rs. ${num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

