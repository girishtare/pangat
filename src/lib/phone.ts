/**
 * Phone numbers with a country code chosen from a list (owner, 14 Nov: "all
 * phone numbers to include country code from drop down, default India").
 * Numbers are stored in international form (+919876543210), as before.
 */
export interface Country {
  iso: string;
  name: string;
  code: string; // digits, no "+"
}

/** India first, then the countries families most often have relatives in, A to Z. */
export const COUNTRIES: Country[] = [
  { iso: "IN", name: "India", code: "91" },
  ...[
    { iso: "AU", name: "Australia", code: "61" },
    { iso: "AT", name: "Austria", code: "43" },
    { iso: "BH", name: "Bahrain", code: "973" },
    { iso: "BD", name: "Bangladesh", code: "880" },
    { iso: "BE", name: "Belgium", code: "32" },
    { iso: "CA", name: "Canada", code: "1" },
    { iso: "CN", name: "China", code: "86" },
    { iso: "DK", name: "Denmark", code: "45" },
    { iso: "FI", name: "Finland", code: "358" },
    { iso: "FR", name: "France", code: "33" },
    { iso: "DE", name: "Germany", code: "49" },
    { iso: "HK", name: "Hong Kong", code: "852" },
    { iso: "ID", name: "Indonesia", code: "62" },
    { iso: "IE", name: "Ireland", code: "353" },
    { iso: "IT", name: "Italy", code: "39" },
    { iso: "JP", name: "Japan", code: "81" },
    { iso: "KE", name: "Kenya", code: "254" },
    { iso: "KW", name: "Kuwait", code: "965" },
    { iso: "MY", name: "Malaysia", code: "60" },
    { iso: "MU", name: "Mauritius", code: "230" },
    { iso: "NP", name: "Nepal", code: "977" },
    { iso: "NL", name: "Netherlands", code: "31" },
    { iso: "NZ", name: "New Zealand", code: "64" },
    { iso: "NO", name: "Norway", code: "47" },
    { iso: "OM", name: "Oman", code: "968" },
    { iso: "PH", name: "Philippines", code: "63" },
    { iso: "PL", name: "Poland", code: "48" },
    { iso: "QA", name: "Qatar", code: "974" },
    { iso: "SA", name: "Saudi Arabia", code: "966" },
    { iso: "SG", name: "Singapore", code: "65" },
    { iso: "ZA", name: "South Africa", code: "27" },
    { iso: "KR", name: "South Korea", code: "82" },
    { iso: "ES", name: "Spain", code: "34" },
    { iso: "LK", name: "Sri Lanka", code: "94" },
    { iso: "SE", name: "Sweden", code: "46" },
    { iso: "CH", name: "Switzerland", code: "41" },
    { iso: "TH", name: "Thailand", code: "66" },
    { iso: "AE", name: "United Arab Emirates", code: "971" },
    { iso: "GB", name: "United Kingdom", code: "44" },
    { iso: "US", name: "United States", code: "1" },
  ],
];

export const DEFAULT_COUNTRY = "IN";

/**
 * A stored number split into its country and the rest, for the form:
 * "+919876543210" → IN, "9876543210". The longest matching code wins (+971
 * before +97…); +1 shows as the United States. Unknown codes and numbers
 * without "+" stay as typed, with India selected.
 */
export function splitPhone(stored: string | null | undefined): { iso: string; local: string } {
  const s = (stored ?? "").trim();
  if (!s.startsWith("+")) return { iso: DEFAULT_COUNTRY, local: s };
  const digits = s.slice(1).replace(/\D/g, "");
  const match = [...COUNTRIES]
    .filter((c) => digits.startsWith(c.code))
    .sort((a, b) => b.code.length - a.code.length || (a.iso === "US" ? -1 : b.iso === "US" ? 1 : 0))[0];
  if (!match) return { iso: DEFAULT_COUNTRY, local: s };
  const local = digits.slice(match.code.length);
  return { iso: match.iso, local: match.code === "91" && local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : local };
}

/**
 * The country picked plus the number typed, as one value for the server
 * (which checks it with normaliseMobile): "+91 9876543210". A number typed
 * with its own "+" or "00" wins over the list; a leading 0 (trunk prefix) is
 * dropped; an Indian number typed with 91 in front isn't doubled. Blank stays blank.
 */
export function joinPhone(iso: string, typed: string): string {
  const t = typed.trim();
  if (!t) return "";
  if (t.startsWith("+") || t.startsWith("00")) return t;
  const country = COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0];
  let digits = t.replace(/\D/g, "").replace(/^0+/, "");
  if (country.code === "91" && /^91[6-9]\d{9}$/.test(digits)) digits = digits.slice(2);
  return digits ? `+${country.code}${digits}` : "";
}
