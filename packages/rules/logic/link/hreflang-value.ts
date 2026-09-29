import type { MatchFn } from "../../types.ts";
import { asciiLowercase, stripAsciiWhitespace } from "../../lib/text.ts";

/**
 * The codes Google and Yandex read in `hreflang`: ISO 639-1 languages and
 * ISO 3166-1 alpha-2 regions. Both lists come from the IANA Language Subtag
 * Registry, File-Date 2026-09-17. Languages: the two-letter subtags not marked
 * deprecated (184). Regions: the two-letter subtags less the deprecated ones,
 * private use (AA, ZZ) and the ISO 3166-1 "exceptionally reserved" codes
 * (AC CP CQ DG EA EU EZ IC TA UN), leaving the 249 assigned codes. Update by
 * hand when ISO 3166-1 assigns or withdraws a code.
 * https://developers.google.com/search/docs/specialty/international/localized-versions
 * https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
 */
const LANGUAGES: ReadonlySet<string> = new Set(
  [
    "aa ab ae af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs cu cv",
    "cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho",
    "hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku",
    "kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn",
    "no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg sh si sk sl",
    "sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve",
    "vi vo wa wo xh yi yo za zh zu",
  ].join(" ").split(" "),
);

const REGIONS: ReadonlySet<string> = new Set(
  [
    "ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn bo",
    "bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj",
    "dk dm do dz ec ee eg eh er es et fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp",
    "gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg",
    "kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml",
    "mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe",
    "pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl",
    "sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug um",
    "us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw",
  ].join(" ").split(" "),
);

/** Language, optional ISO 15924 script, optional region: `en`, `zh-hant`, `en-gb`, `zh-hans-us`. */
const SHAPE = /^([a-z]{2})(?:-[a-z]{4})?(?:-([a-z]{2}))?$/;

/**
 * The selector is only a pre-filter. The value is trimmed and folded, since
 * Google reads it case-insensitively, then passes as `x-default` or as a
 * listed language with an optional script and listed region. Everything else
 * reports: `en_US`, a region alone, `en-UK`, `es-419`, extra subtags.
 */
export const match: MatchFn = (element) => {
  const value = asciiLowercase(stripAsciiWhitespace(element.attr("hreflang") ?? ""));
  if (value === "x-default") return false;
  const parts = SHAPE.exec(value);
  if (!parts) return true;
  const [, language = "", region] = parts;
  return !LANGUAGES.has(language) || (region !== undefined && !REGIONS.has(region));
};
