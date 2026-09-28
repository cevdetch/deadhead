import interDataUrl from "../assets/fonts/inter-700-normal.ttf?inline";
import monoDataUrl from "../assets/fonts/jetbrains-mono-500-normal.ttf?inline";
// Read-only import: the file stays maintainer-owned under `public/` (copied
// verbatim to `dist/`); this only inlines its bytes for rasterizing below.
// `icon.svg` is the static variant of the mark — `logo.svg`'s blink frame
// would never render in a PNG anyway.
import iconSvg from "../../public/icon.svg?raw";
import satori from "satori";
import { html } from "satori-html";
import sharp from "sharp";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const INK = "#191a17";
const MUTED = "#64665e";
const PAPER = "#fdfdfb";
const RULE = "#e3e3dc";
const ACCENT = "#2f6f4f";

const SEVERITY_COLORS = {
  harmful: "#b0242b",
  deprecated: "#8a5b14",
  unnecessary: "#56576a",
} as const;

export type OgSeverity = keyof typeof SEVERITY_COLORS;

export interface OgBadge {
  label: string;
  severity: OgSeverity;
}

export interface OgInput {
  eyebrow: string;
  title: string;
  badge?: OgBadge | undefined;
}

const toArrayBuffer = (buf: Buffer): ArrayBuffer => {
  const copy: Uint8Array = new Uint8Array(buf.byteLength);
  copy.set(buf);
  return copy.buffer as ArrayBuffer;
};

const decodeFont = (dataUrl: string): ArrayBuffer =>
  toArrayBuffer(Buffer.from(dataUrl.split(",", 2)[1] ?? "", "base64"));

// `color-mix` isn't parseable by satori, so the OG badge's tint is spelled
// as rgba by hand: 10% severity color over paper.
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// The mark, rasterized once per build (satori draws `<img>` from data URLs
// but cannot parse raw SVG elements). 160px source for a ~44px draw keeps
// edges crisp on retina unfurlers.
const iconDataUrl: string = await sharp(Buffer.from(iconSvg))
  .resize(160, 160)
  .png()
  .toBuffer()
  .then((buf: Buffer) => `data:image/png;base64,${buf.toString("base64")}`);

const fonts = [
  { name: "Inter", data: decodeFont(interDataUrl), weight: 700 as const, style: "normal" as const },
  {
    name: "JetBrains Mono",
    data: decodeFont(monoDataUrl),
    weight: 500 as const,
    style: "normal" as const,
  },
];

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
};

const decodeEntities = (s: string): string =>
  s.replace(/&(amp|lt|gt);/g, (m: string, e: string) => ENTITIES[e] ?? m);

// satori-html escapes `&<>` in interpolations and satori never decodes, so
// walk the vnode tree and restore the characters. Generic passthrough keeps
// the `html` return type satori expects.
const decodeVNodeText = <T>(node: T): T => {
  if (typeof node === "string") return decodeEntities(node) as T;
  if (Array.isArray(node)) return node.map(decodeVNodeText) as T;
  if (typeof node === "object" && node !== null && "props" in node) {
    const props = node.props as Record<string, unknown>;
    if ("children" in props) {
      return {
        ...node,
        props: { ...props, children: decodeVNodeText(props.children) },
      } as T;
    }
  }
  return node;
};

export async function generateOG(input: OgInput): Promise<Buffer> {
  const badge = input.badge;
  // Outline pill with a whisper of fill: the severity color draws the
  // border and a 10% tint, never a solid background.
  // Tint over solid fill: the card echoes the page it represents, and the
  // hue still reads at feed-thumbnail size without depending on
  // white-on-color legibility.
  //
  // The pill lives in the footer row, GitHub-card style: title block above
  // stays a clean eyebrow + headline, metadata sits on the bottom line with
  // the domain. No-badge pages keep a zero-size cell (style, not markup, is
  // conditional — interpolated HTML strings would render as literal text)
  // so `space-between` still parks the domain on the right.
  const badgeColor = badge ? SEVERITY_COLORS[badge.severity] : "";
  const badgeStyle = badge
    ? `display:flex;border:3px solid ${badgeColor};background:${hexToRgba(badgeColor, 0.1)};border-radius:6px;padding:8px 20px;font-family:'JetBrains Mono',monospace;font-size:30px;color:${badgeColor};`
    : "display:flex;";
  const badgeLabel = badge ? badge.label : "";

  // Interpolations are raw on purpose: satori-html escapes `&`, `<`, `>` in
  // interpolated values (ultrahtml's escapeHTML set — quotes pass through),
  // and satori renders vnode text verbatim without decoding. A manual escape
  // pass here would double-escape (`"` rendering as `&quot;` on the card),
  // so the decode below reverses exactly satori-html's three entities.
  const tree = html`<div style="display:flex;flex-direction:column;justify-content:space-between;width:100%;height:100%;padding:80px;background:${PAPER};font-family:Inter,sans-serif;">
      <div style="display:flex;flex-direction:column;">
        <div style="display:flex;align-items:center;">
          <img src="${iconDataUrl}" style="width:44px;height:44px;margin-right:18px;" />
          <div style="font-family:'JetBrains Mono',monospace;font-size:28px;color:${ACCENT};">deadhead</div>
        </div>
        <div style="display:flex;height:2px;background:${RULE};margin-top:20px;"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:28px;overflow:hidden;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:30px;color:${MUTED};">${input.eyebrow}</div>
        <div style="font-size:68px;line-height:1.12;font-weight:700;color:${INK};max-height:320px;overflow:hidden;">${input.title}</div>
      </div>
      <div style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;">
        <div style="${badgeStyle}">${badgeLabel}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:26px;color:${MUTED};">deadhead.cevdet.ch</div>
      </div>
    </div>`;
  const svg = await satori(decodeVNodeText(tree), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}
