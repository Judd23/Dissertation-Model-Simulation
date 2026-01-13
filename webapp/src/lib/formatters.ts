// Format a number to a specified number of decimal places
export function formatNumber(value: number, decimals = 3): string {
  return value.toFixed(decimals);
}
