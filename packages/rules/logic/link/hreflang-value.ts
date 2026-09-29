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

/** Two-letter codes written back to back: a separator would cost the javascript: URL 3 bytes each. */
const pairs = (codes: string): ReadonlySet<string> => new Set(codes.match(/../g));

const LANGUAGES: ReadonlySet<string> = pairs(
  "aaabaeafakamanarasavayazbabebgbibmbnbobrbscacechcocrcscucvcydadedvdzeeeleneoeseteufa" +
  "fffifjfofrfygagdglgngugvhahehihohrhthuhyhziaidieigiiikioisitiujajvkakgkikjkkklkmknko" +
  "krkskukvkwkylalblglilnloltlulvmgmhmimkmlmnmrmsmtmynanbndnengnlnnnonrnvnyocojomorospa" +
  "piplpsptqurmrnrorurwsascsdsesgshsiskslsmsnsosqsrssstsusvswtatetgthtitktltntotrtstttw" +
  "tyugukuruzvevivowawoxhyiyozazhzu",
);

const REGIONS: ReadonlySet<string> = pairs(
  "adaeafagaialamaoaqarasatauawaxazbabbbdbebfbgbhbibjblbmbnbobqbrbsbtbvbwbybzcacccdcfcg" +
  "chcickclcmcncocrcucvcwcxcyczdedjdkdmdodzeceeegeheresetfifjfkfmfofrgagbgdgegfggghgigl" +
  "gmgngpgqgrgsgtgugwgyhkhmhnhrhthuidieiliminioiqirisitjejmjojpkekgkhkikmknkpkrkwkykzla" +
  "lblclilklrlsltlulvlymamcmdmemfmgmhmkmlmmmnmompmqmrmsmtmumvmwmxmymznancnenfngninlnonp" +
  "nrnunzompapepfpgphpkplpmpnprpsptpwpyqarerorsrurwsasbscsdsesgshsisjskslsmsnsosrssstsv" +
  "sxsysztctdtftgthtjtktltmtntotrtttvtwtzuaugumusuyuzvavcvevgvivnvuwfwsyeytzazmzw",
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
