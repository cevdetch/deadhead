import type { CheckFn } from "../../types.ts";

/**
 * The prefixes this rule claims, lowercased. Other prefixes share the
 * disease but stay out of scope.
 */
const PREFIXES: ReadonlySet<string> = new Set(["dc", "dcterms"]);

/** A DC-HTML namespace declaration opens its rel token with this. */
const SCHEMA = "schema.";

/** ASCII whitespace, as the HTML Standard defines it — not `String#split`. */
const SPACES = /[\t\n\f\r ]+/;

/**
 * No selector can pair `meta` names with `link` declarations, which is what
 * makes this a `kind: "document"` rule rather than an element rule with a
 * logic refinement.
 *
 * Each `DC.*` or `DCTERMS.*` meta name without a matching `schema.*`
 * declaration reports itself. The declaration has to carry an `href`, since
 * the namespace URI comes from that attribute; a bare rel binds nothing.
 * Prefix matching is ASCII case-insensitive in both directions.
 */
export const check: CheckFn = (doc, ctx) => {
  // The schema.DC link can sit in another partial of the page.
  if (!doc.isPage()) return [];
  const declared = new Set<string>();
  for (const element of doc.querySelectorAll("link[rel]")) {
    const rel = element.attr("rel");
    if (rel === undefined || !element.hasAttr("href")) continue;
    for (const token of rel.split(SPACES)) {
      const lower = token.toLowerCase();
      if (lower.startsWith(SCHEMA)) declared.add(lower.slice(SCHEMA.length));
    }
  }
  const findings = [];
  for (const element of doc.querySelectorAll("meta[name]")) {
    const name = element.attr("name");
    if (name === undefined) continue;
    const dot = name.indexOf(".");
    if (dot < 0) continue;
    const prefix = name.slice(0, dot).toLowerCase();
    if (!PREFIXES.has(prefix) || declared.has(prefix)) continue;
    findings.push(
      ctx.report(element, {
        detail: `no link rel="schema.${prefix.toUpperCase()}" declaration`,
      }),
    );
  }
  return findings;
};
