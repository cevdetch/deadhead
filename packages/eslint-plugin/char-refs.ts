/**
 * Character references, decoded as the HTML tokenizer decodes them (HTML,
 * "Character reference state"). es-html-parser returns attribute values and
 * text as written; parse5 and the DOM return them decoded, and the three
 * adapters must agree.
 */
import { ENTITIES } from "./entities.ts";

/** Numeric references to C1 controls that the tokenizer reads as windows-1252. */
const C1: Readonly<Record<number, number>> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018,
  0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc,
  0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178,
};

/** The longest name in the table, 32 characters plus ";": no match runs past it. */
const LONGEST = 33;

const ALPHANUMERIC = /[A-Za-z0-9]/;
const DIGIT = /[0-9]/;
const HEX_DIGIT = /[0-9A-Fa-f]/;

/** A numeric reference's character: null, surrogates and out-of-range code points become U+FFFD. */
function fromCodePoint(code: number): string {
  if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return "\uFFFD";
  return String.fromCodePoint(C1[code] ?? code);
}

function decode(input: string, inAttribute: boolean): string {
  if (!input.includes("&")) return input;
  let out = "";
  let i = 0;
  while (i < input.length) {
    const amp = input.indexOf("&", i);
    if (amp === -1) return out + input.slice(i);
    out += input.slice(i, amp);
    i = amp + 1;

    if (input[i] === "#") {
      const hex = input[i + 1] === "x" || input[i + 1] === "X";
      const start = i + (hex ? 2 : 1);
      const digit = hex ? HEX_DIGIT : DIGIT;
      let end = start;
      while (end < input.length && digit.test(input[end] ?? "")) end++;
      // "&#" or "&#x" with no digits is not a reference: the "&" stays.
      if (end === start) {
        out += "&";
        continue;
      }
      out += fromCodePoint(Number.parseInt(input.slice(start, end), hex ? 16 : 10));
      i = input[end] === ";" ? end + 1 : end;
      continue;
    }

    // The longest name in the table that the input starts with.
    let end = i;
    while (end < input.length && end - i < LONGEST && ALPHANUMERIC.test(input[end] ?? "")) end++;
    const run = input.slice(i, end);
    let name = input[end] === ";" && Object.hasOwn(ENTITIES, `${run};`) ? `${run};` : "";
    for (let length = run.length; name === "" && length > 0; length--) {
      if (Object.hasOwn(ENTITIES, run.slice(0, length))) name = run.slice(0, length);
    }
    const next = input[i + name.length];
    // In an attribute, a legacy name without ";" before "=" or an alphanumeric
    // stays as written, so query strings like "?a=1&copy=2" survive.
    if (name === "" || (inAttribute && !name.endsWith(";") && next !== undefined && (next === "=" || ALPHANUMERIC.test(next)))) {
      out += "&";
      continue;
    }
    out += ENTITIES[name] ?? "";
    i += name.length;
  }
  return out;
}

/** An attribute value as the tokenizer reads it. */
export const decodeAttribute = (value: string): string => decode(value, true);

/** Text content (data or RCDATA) as the tokenizer reads it. */
export const decodeText = (value: string): string => decode(value, false);
