/**
 * Format paise to Indian Rupee string.
 * e.g. 1234567 paise => "₹12,345.67"
 */
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return '₹' + formatIndianNumber(rupees);
}

/**
 * Format a number using Indian number system (lakh, crore).
 * e.g. 1234567.89 => "12,34,567.89"
 */
export function formatIndianNumber(num: number): string {
  const [intPart, decPart] = num.toFixed(2).split('.');
  const lastThree = intPart.slice(-3);
  const remaining = intPart.slice(0, -3);

  let formatted = lastThree;
  if (remaining.length > 0) {
    formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + formatted;
  }

  return formatted + '.' + decPart;
}
