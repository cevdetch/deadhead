/**
 * Base85 for the bookmarklet's rule payload. Base64 adds a third to the
 * gzip bytes; this adds a quarter. The digits are printable ASCII without
 * `"`, `#`, `%` and `\`, so the text sits in a JS string inside a
 * `javascript:` URL with nothing escaped. Four bytes become five digits,
 * big-endian; a final group of n bytes becomes n + 1 digits, as in Ascii85.
 *
 * Import-free: the build encodes, the bookmarklet decodes, and the bundler
 * drops the half each side does not call.
 */

/** Codes skipped by the alphabet, ascending. */
const SKIPPED = [34, 35, 37, 92];

const digitCode = (digit: number): number => {
  let code = 33 + digit;
  for (const skipped of SKIPPED) if (code >= skipped) code++;
  return code;
};

export function encode85(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 4) {
    let n = (((bytes[i] ?? 0) << 24) | ((bytes[i + 1] ?? 0) << 16) | ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0)) >>> 0;
    const digits: number[] = [];
    for (let j = 0; j < 5; j++) {
      digits.unshift(n % 85);
      n = Math.floor(n / 85);
    }
    for (const digit of digits.slice(0, Math.min(4, bytes.length - i) + 1)) out += String.fromCharCode(digitCode(digit));
  }
  return out;
}

export function decode85(text: string): Uint8Array<ArrayBuffer> {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 5) {
    let n = 0;
    for (let j = 0; j < 5; j++) {
      // A short final group is padded with the top digit, 84 ("y"), which
      // rounds up so the kept bytes come out exact.
      const c = i + j < text.length ? text.charCodeAt(i + j) : 121;
      n = n * 85 + c - 33 - +(c > 34) - +(c > 35) - +(c > 37) - +(c > 92);
    }
    for (let k = 0; k < Math.min(4, text.length - i - 1); k++) out.push((n >>> (24 - 8 * k)) & 255);
  }
  return Uint8Array.from(out);
}
