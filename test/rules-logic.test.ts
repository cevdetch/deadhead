import assert from "node:assert/strict";
import test from "node:test";

import { parseHtml } from "../packages/cli/adapter.ts";
import type { ElementPort, RuleContext } from "../packages/core/types.ts";

/** The first element matching `selector` in a parsed page. */
export const portOf = (html: string, selector: string): ElementPort => {
  const port = parseHtml(html).doc.querySelector(selector);
  assert.ok(port, `no element matches ${selector}`);
  return port;
};

/** Logic modules only read ctx.ruleId; report() is never called by match(). */
const ctx = { ruleId: "test", report: () => { throw new Error("unused"); } } as unknown as RuleContext;

/** robots-value's match() on one `<meta name=… content=…>` tag. */
const robotsTag = async (name: string, content: string): Promise<boolean> => {
  const { match } = await import("../packages/rules/logic/meta/robots-value.ts");
  return match(portOf(`<meta name="${name}" content="${content}">`, "meta"), ctx);
};
const robots = (content: string): Promise<boolean> => robotsTag("robots", content);

test("robots: Google's spaced name: value form is valid", async () => {
  assert.equal(await robots("max-snippet: 50"), false);
  assert.equal(await robots("noindex, max-image-preview: large"), false);
  assert.equal(await robots("unavailable_after: 2026-09-21"), false);
  assert.equal(await robots("unavailable_after: 25 Jun 2010 15:00:00 PST"), false);
});

test("robots: RFC 822 and RFC 850 dates keep their comma", async () => {
  assert.equal(await robots("unavailable_after: Sat, 25 Jun 2010 15:00:00 GMT"), false);
  assert.equal(await robots("unavailable_after: Saturday, 25-Jun-10 15:00:00 GMT"), false);
  assert.equal(await robots("noindex, unavailable_after: Sat, 25 Jun 2010 15:00:00 GMT, nofollow"), false);
  // The date fold takes an item when it opens with a digit, so a bad value after the date still trips.
  assert.equal(await robots("unavailable_after: Sat, 25 Jun 2010 15:00:00 GMT, max-snippet: lots"), true);
});

test("robots: unknown names and bad values still trip", async () => {
  assert.equal(await robots("no-index"), true);
  assert.equal(await robots("noindex, no-follow"), true);
  assert.equal(await robots("max-snippet: lots"), true);
  assert.equal(await robots("max-snippet"), true);
  assert.equal(await robots("noindex nofollow"), false);
});

test("robots: a token some crawler documents is live on a tag every crawler reads", async () => {
  // Bing and Yandex honor noarchive, Bing nocache, Yandex archive; Google ignores all three.
  assert.equal(await robots("noarchive"), false);
  assert.equal(await robots("nocache"), false);
  assert.equal(await robots("archive"), false);
  assert.equal(await robots("noindex, noarchive, nocache"), false);
  assert.equal(await robots("all"), false);
  assert.equal(await robots("index, follow"), false);
});

test("googlebot, googlebot-news: a token Google does not document trips", async () => {
  for (const name of ["googlebot", "googlebot-news", "GoogleBot"]) {
    assert.equal(await robotsTag(name, "noarchive"), true, `${name} noarchive`);
    assert.equal(await robotsTag(name, "nocache"), true, `${name} nocache`);
    assert.equal(await robotsTag(name, "archive"), true, `${name} archive`);
    assert.equal(await robotsTag(name, "noindex, nosnippet, max-image-preview: large"), false, `${name} Google rules`);
    // index and follow are the defaults Google names; an explicit default voids nothing.
    assert.equal(await robotsTag(name, "index, follow"), false, `${name} index, follow`);
  }
});

test("robots: a date folds its own comma and no more, so a token after it is still judged", async () => {
  assert.equal(await robots("unavailable_after: 2026-09-21, no-index"), true);
  assert.equal(await robots("unavailable_after: Sat, 25 Jun 2010 15:00:00 GMT, noodp"), true);
  assert.equal(await robotsTag("googlebot", "unavailable_after: 2026-09-21, noarchive"), true);
  assert.equal(await robots("unavailable_after: Jun 25, 2010, noindex"), false);
});

test("robots: a Google-only token is live on a tag every crawler reads", async () => {
  assert.equal(await robots("notranslate, indexifembedded, noimageindex"), false);
});

test("bingbot, yandex, applebot: checked against every crawler's tokens", async () => {
  for (const name of ["bingbot", "yandex", "applebot"]) {
    assert.equal(await robotsTag(name, "no-index"), true, `${name} no-index`);
    assert.equal(await robotsTag(name, "noodp"), true, `${name} noodp`);
    assert.equal(await robotsTag(name, "noindex, nofollow, noarchive, nocache, archive"), false, `${name} documented tokens`);
  }
});

test("retired names trip under every name", async () => {
  for (const name of ["robots", "googlebot", "googlebot-news", "bingbot", "yandex", "applebot"]) {
    for (const token of ["noodp", "noydir", "nositelinkssearchbox"]) {
      assert.equal(await robotsTag(name, `noindex, ${token}`), true, `${name} ${token}`);
    }
  }
});

for (const directive of [
  "prefetch-src", "plugin-types", "navigate-to", "referrer", "reflected-xss", "report-uri", "block-all-mixed-content",
]) {
  test(`csp-${directive}: trips on the directive name, never on a value or another directive`, async () => {
    const { match } = await import(`../packages/rules/logic/meta/csp-${directive}.ts`);
    const on = (content: string) =>
      match(portOf(`<meta http-equiv="Content-Security-Policy" content="${content}">`, "meta"), ctx);
    assert.equal(await on(`default-src 'self'; ${directive} x`), true);
    assert.equal(await on(`  ${directive.toUpperCase()}\tx ;`), true);
    assert.equal(await on(`default-src https://example.com/${directive}/`), false);
    assert.equal(await on(`default-src 'self'; ${directive}-extra x`), false);
    assert.equal(await on(""), false);
  });
}

// --- fixable(): the autofix runs only where removal is inert -----------------

/** fixable() of `ruleId` on the first element matching `selector` in `html`. */
const fixableOn = async (ruleId: string, html: string, selector: string): Promise<boolean> => {
  const { fixable } = (await import(`../packages/rules/logic/${ruleId}.ts`)) as {
    fixable: (element: ElementPort) => boolean;
  };
  return fixable(portOf(html, selector));
};

test("script-event-for: fixable unless the pair keeps the script from running", async () => {
  const on = (attrs: string) => fixableOn("attr/script-event-for", `<script ${attrs}></script>`, "script");
  assert.equal(await on('event="onclick"'), true);
  assert.equal(await on('for="button"'), true);
  assert.equal(await on('for=" Window " event="onload()"'), true);
  assert.equal(await on('for="WINDOW" event="\tOnLoad "'), true);
  assert.equal(await on('for="window" event="onclick"'), false);
  assert.equal(await on('for="button" event="onload"'), false);
  assert.equal(await on('for="window" event="onload();"'), false);
  // The for/event step applies to classic scripts only.
  assert.equal(await on('type="module" for="button" event="onclick"'), true);
  assert.equal(await on('type="application/json" for="button" event="onclick"'), true);
});

test("script-language: fixable when type overrides it or it already names JavaScript", async () => {
  const on = (attrs: string) => fixableOn("attr/script-language", `<script ${attrs}></script>`, "script");
  assert.equal(await on('language="javascript"'), true);
  assert.equal(await on('language="JavaScript1.2"'), true);
  assert.equal(await on('language=""'), true);
  assert.equal(await on('type="module" language="vbscript"'), true);
  assert.equal(await on('type="" language="vbscript"'), true);
  assert.equal(await on('language="vbscript"'), false);
  // Not stripped: "text/ javascript" is no essence match, so the block is inert today.
  assert.equal(await on('language=" javascript"'), false);
});

test("charset-obsolete: fixable on a, and on a link that loads no stylesheet", async () => {
  const link = (attrs: string) => fixableOn("attr/charset-obsolete", `<link charset="iso-8859-1" ${attrs}>`, "link");
  assert.equal(await fixableOn("attr/charset-obsolete", '<a href="page.html" charset="iso-8859-1">x</a>', "a"), true);
  assert.equal(await link('rel="alternate" href="feed.xml"'), true);
  assert.equal(await link('rel="icon" href="favicon.ico"'), true);
  assert.equal(await link('rel="stylesheet"'), true);
  // A stylesheet with no BOM, HTTP charset or @charset decodes by the attribute.
  assert.equal(await link('rel="stylesheet" href="a.css"'), false);
  assert.equal(await link('rel="alternate STYLESHEET" href="a.css"'), false);
  assert.equal(await link('rel="\tStyleSheet " href="a.css"'), false);
});

test("charset-obsolete: fixable on script unless it decodes an external classic script", async () => {
  const on = (attrs: string) => fixableOn("attr/charset-obsolete", `<script charset="iso-8859-1" ${attrs}></script>`, "script");
  assert.equal(await on(""), true);
  assert.equal(await on('type="module" src="a.js"'), true);
  assert.equal(await on('type="application/json" src="a.json"'), true);
  assert.equal(await on('language="vbscript" src="a.vbs"'), true);
  assert.equal(await on('src="a.js"'), false);
  assert.equal(await on('type=" TEXT/JavaScript " src="a.js"'), false);
  assert.equal(await on('type="" src="a.js"'), false);
});

test("name-obsolete: fixable on option, and on an a whose id is its name", async () => {
  const on = (html: string, tag: string) => fixableOn("attr/name-obsolete", html, tag);
  assert.equal(await on('<select><option name="red">Red</option></select>', "option"), true);
  assert.equal(await on('<a href="#x" name="x">x</a>', "a"), false);
  // The id step of the fragment lookup runs before the name fallback.
  assert.equal(await on('<a href="#x" id="x" name="x">x</a>', "a"), true);
  assert.equal(await on('<a href="#x" id="y" name="x">x</a>', "a"), false);
  assert.equal(await on('<a href="#x" id="X" name="x">x</a>', "a"), false);
  assert.equal(await on('<embed src="c.mp4" name="c">', "embed"), false);
  assert.equal(await on('<img src="c.png" alt="" name="c">', "img"), false);
});

test("navigation-keywords: fixable unless rel holds previous", async () => {
  const on = (rel: string) => fixableOn("link/navigation-keywords", `<link rel="${rel}" href="/">`, "link");
  assert.equal(await on("archives"), true);
  assert.equal(await on("alternate first"), true);
  assert.equal(await on("self edituri"), true);
  assert.equal(await on("previous"), false);
  assert.equal(await on("archives PREVIOUS"), false);
  assert.equal(await on("index\tPrevious"), false);
});

test("vendor-keywords: fixable unless rel holds edituri", async () => {
  const on = (rel: string) => fixableOn("link/vendor-keywords", `<link rel="${rel}" href="/">`, "link");
  assert.equal(await on("pavatar"), true);
  assert.equal(await on("alternate publisher"), true);
  assert.equal(await on("self previous"), true);
  assert.equal(await on("EditURI"), false);
  assert.equal(await on("p3pv1 edituri"), false);
  assert.equal(await on("fluid-icon\nEDITURI"), false);
});

test("document-info-keywords: fixable unless rel holds self", async () => {
  const on = (rel: string) => fixableOn("link/document-info-keywords", `<link rel="${rel}" href="/">`, "link");
  assert.equal(await on("logo"), true);
  assert.equal(await on("alternate translation"), true);
  assert.equal(await on("edituri previous"), true);
  assert.equal(await on("self"), false);
  assert.equal(await on("hub\tSELF"), false);
  assert.equal(await on("profile self"), false);
});

test("verification-names: fixable unless the name is verify-v1", async () => {
  const on = (name: string) => fixableOn("meta/verification-names", `<meta name="${name}" content="x">`, "meta");
  assert.equal(await on("y_key"), true);
  assert.equal(await on("BlogCatalog"), true);
  assert.equal(await on("verify-v1"), false);
  assert.equal(await on("Verify-V1"), false);
});

for (const tag of ["cursor", "solidcolor"]) {
  test(`${tag}: fixable only inside svg and without an id`, async () => {
    const on = (html: string) => fixableOn(`element/${tag}`, html, tag);
    assert.equal(await on(`<svg><defs><${tag}></${tag}></defs></svg>`), true);
    assert.equal(await on(`<svg><g><defs><${tag} x="1"></${tag}></defs></g></svg>`), true);
    assert.equal(await on(`<svg><defs><${tag} id="a"></${tag}></defs></svg>`), false);
    assert.equal(await on(`<svg><defs><${tag} id=""></${tag}></defs></svg>`), false);
    assert.equal(await on(`<p><${tag}>Text</${tag}></p>`), false);
    assert.equal(await on(`<${tag}></${tag}>`), false);
  });
}

test("apple-mobile-web-app-status-bar-style: fixable only for default or a missing content", async () => {
  const on = (attrs: string) =>
    fixableOn("meta/apple-mobile-web-app-status-bar-style", `<meta name="apple-mobile-web-app-status-bar-style"${attrs}>`, "meta");
  assert.equal(await on(""), true);
  assert.equal(await on(' content="default"'), true);
  assert.equal(await on(' content=" Default "'), true);
  assert.equal(await on(' content="black"'), false);
  assert.equal(await on(' content="black-translucent"'), false);
  assert.equal(await on(' content=""'), false);
});

test("http-equiv-unregistered-pragmas leaves every value another rule owns to that rule", async () => {
  const { match } = await import("../packages/rules/logic/meta/http-equiv-unregistered-pragmas.ts");
  for (const value of ["robots", "x-robots-tag", "cache-control", "x-ua-compatible", "permissions-policy", "feature-policy", "set-cookie", "x-dns-prefetch-control", "description", "pics-label", "content-script-type"]) {
    assert.equal(match(portOf(`<meta http-equiv="${value}" content="x">`, "meta"), ctx), false, value);
  }
  assert.equal(match(portOf('<meta http-equiv="x-made-up" content="x">', "meta"), ctx), true);
});

test("script-nomodule: classic scripts only, and no fix for an element a script can find by id", async () => {
  const { match, fixable } = await import("../packages/rules/logic/attr/script-nomodule.ts");
  const on = (attrs: string) => match(portOf(`<script nomodule ${attrs}></script>`, "script"), ctx);
  assert.equal(on('src="legacy.js"'), true);
  assert.equal(on('type="" src="legacy.js"'), true);
  assert.equal(on('type=" Text/JavaScript " src="legacy.js"'), true);
  assert.equal(on('language="javascript" src="legacy.js"'), true);
  // HTML skips none of these for nomodule; the attribute is inert there.
  assert.equal(on('type="module" src="app.js"'), false);
  assert.equal(on('type="importmap"'), false);
  assert.equal(on('type="application/json"'), false);
  assert.equal(on('language="vbscript"'), false);
  assert.equal(fixable(portOf('<script nomodule src="legacy.js"></script>', "script")), true);
  assert.equal(fixable(portOf('<script nomodule id="vite-legacy-polyfill" src="p.js"></script>', "script")), false);
});

test("twitter-card-names: layout, attribution and override tags stay; duplicates of Open Graph go", async () => {
  const { match, fixable } = await import("../packages/rules/logic/meta/twitter-card-names.ts");
  const og =
    '<meta property="og:title" content="Post"><meta property="og:description" content="About">' +
    '<meta property="og:image" content="/c.jpg"><meta property="og:url" content="/post">';
  /** The twitter:* tag in a page head, after `before`: [match, fixable]. */
  const on = (tag: string, before = og): [boolean, boolean] => {
    const element = portOf(`<!doctype html><html><head>${before}${tag}</head></html>`, 'meta[name^="twitter:"]');
    return [match(element, ctx), fixable(element)];
  };
  // No twitter:card value is reported: summary_large_image and player change the layout.
  for (const value of ["summary", "summary_large_image", "player", "app", "photo"]) {
    assert.deepEqual(on(`<meta name="twitter:card" content="${value}">`), [false, false], value);
  }
  for (const name of ["twitter:site", "twitter:creator", "twitter:creator:id", "twitter:label1", "twitter:data2", "twitter:player", "twitter:player:stream"]) {
    assert.deepEqual(on(`<meta name="${name}" content="x">`), [false, false], name);
  }
  // A differing value, or one with no counterpart, is an override X shows.
  assert.deepEqual(on('<meta name="twitter:title" content="Other">'), [false, false]);
  assert.deepEqual(on('<meta name="twitter:title" content="Post">', ""), [false, false]);
  assert.deepEqual(on('<meta name="twitter:url" content="/post">', ""), [false, false]);
  // Identical duplicates, twitter:url beside og:url, and twitter:domain carry the fix.
  assert.deepEqual(on('<meta name="twitter:title" content=" Post ">'), [true, true]);
  assert.deepEqual(on('<meta name="twitter:image:src" content="/c.jpg">'), [true, true]);
  assert.deepEqual(on('<meta name="twitter:url" content="/elsewhere">'), [true, true]);
  assert.deepEqual(on('<meta name="twitter:domain" content="example.com">', ""), [true, true]);
  // No documented reader, none ruled out: reported without a fix.
  assert.deepEqual(on('<meta name="twitter:app:id:iphone" content="1">'), [true, false]);
  assert.deepEqual(on('<meta name="twitter:made-up" content="x">'), [true, false]);
  // A top-level tag in a fragment has no parent to find its og:* counterpart in.
  const loose = portOf(`${og}<meta name="twitter:title" content="Post">`, 'meta[name^="twitter:"]');
  assert.equal(match(loose, ctx), false);
});
