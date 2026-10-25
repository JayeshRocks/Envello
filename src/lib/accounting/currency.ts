/**
 * Envello - Exact Currency Arithmetic Helpers
 * Eliminates IEEE 754 floating point errors by performing all financial operations in integer paise.
 * ₹1.00 = 100 paise.
 */

/**
 * Converts a rupee amount (number or string representation) into integer paise.
 * Safely parses decimals without binary floating point drift.
 * @example toPaise(1250.50) => 125050n
 */
export function toPaise(rupees: number | string): bigint {
  if (typeof rupees === 'string') {
    const cleaned = rupees.replace(/,/g, '').trim();
    if (!cleaned) return 0n;
    
    // Split integer and decimal parts
    const parts = cleaned.split('.');
    const integerPart = BigInt(parts[0] || '0');
    
    let decimalString = parts[1] || '';
    if (decimalString.length === 0) {
      decimalString = '00';
    } else if (decimalString.length === 1) {
      decimalString = decimalString + '0';
    } else if (decimalString.length > 2) {
      // Round to 2 decimal places if extra digits provided
      const extraDigit = parseInt(decimalString[2], 10);
      let twoDigits = parseInt(decimalString.slice(0, 2), 10);
      if (extraDigit >= 5) {
        twoDigits += 1;
      }
      decimalString = twoDigits.toString().padStart(2, '0');
    }
    
    const decimalPart = BigInt(decimalString);
    const sign = cleaned.startsWith('-') ? -1n : 1n;
    const absInteger = integerPart < 0n ? -integerPart : integerPart;
    
    return sign * (absInteger * 100n + decimalPart);
  }

  // Fallback for numeric input: round to nearest integer paise
  return BigInt(Math.round(rupees * 100));
}

/**
 * Converts integer paise into a JavaScript number for display formatting or charting.
 * @example toRupees(125050n) => 1250.5
 */
export function toRupees(paise: bigint | number): number {
  return Number(paise) / 100;
}

/**
 * Formats integer paise into standard Indian numbering system (e.g. ₹1,50,000.00).
 * Uses standard Intl.NumberFormat with Indian English locale.
 */
export function formatINR(paise: bigint | number, options?: { showPaise?: boolean }): string {
  const showPaise = options?.showPaise ?? true;
  const rupees = toRupees(paise);

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  });

  return formatter.format(rupees);
}

/**
 * Parses user input string from currency field into integer paise.
 */
export function parseINRInput(value: string): bigint {
  const sanitized = value.replace(/[₹\s,]/g, '');
  return toPaise(sanitized);
}
