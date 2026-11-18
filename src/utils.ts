export type OtpType =
  | "numeric"
  | "alpha"
  | "alphanumeric"
  | "hex"
  | "any"
  | RegExp
  | ((char: string) => boolean);

export type OtpTransform = "none" | "uppercase" | "lowercase" | ((char: string) => string);

const PATTERNS: Record<string, RegExp> = {
  numeric: /^[0-9]$/,
  alpha: /^[a-zA-Z]$/,
  alphanumeric: /^[a-zA-Z0-9]$/,
  hex: /^[0-9a-fA-F]$/,
};

/** Returns a predicate that tells whether a single character is allowed. */
export function createValidator(type: OtpType): (char: string) => boolean {
  if (typeof type === "function") return type;
  if (type instanceof RegExp) {
    const re = new RegExp(type.source, type.flags.replace(/[gy]/g, ""));
    return (c) => re.test(c);
  }
  if (type === "any") return (c) => c.length > 0 && !/\s/.test(c);
  const re = PATTERNS[type];
  if (!re) throw new Error(`react-native-otp-studio: unknown type "${String(type)}"`);
  return (c) => re.test(c);
}

export function createTransformer(transform: OtpTransform): (char: string) => string {
  if (typeof transform === "function") return transform;
  if (transform === "uppercase") return (c) => c.toUpperCase();
  if (transform === "lowercase") return (c) => c.toLowerCase();
  return (c) => c;
}

/** Transforms each character, keeps only valid ones and trims to `length`. */
export function sanitize(
  text: string,
  length: number,
  isValid: (c: string) => boolean,
  transform: (c: string) => string,
): string {
  let out = "";
  let count = 0;
  for (const raw of Array.from(text)) {
    if (count >= length) break;
    const c = transform(raw);
    if (isValid(c)) {
      out += c;
      count++;
    }
  }
  return out;
}

export function keyboardTypeFor(type: OtpType): "number-pad" | "default" {
  return type === "numeric" ? "number-pad" : "default";
}

/** Indexes after which a separator is drawn. */
export function groupBoundaries(groups: number[] | undefined, length: number): Set<number> | null {
  if (!groups) return null;
  const total = groups.reduce((a, b) => a + b, 0);
  if (total !== length) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn(`react-native-otp-studio: groups add up to ${total} but length is ${length}`);
    }
    return null;
  }
  const set = new Set<number>();
  let acc = 0;
  for (let g = 0; g < groups.length - 1; g++) {
    acc += groups[g];
    set.add(acc - 1);
  }
  return set;
}

declare const __DEV__: boolean | undefined;
