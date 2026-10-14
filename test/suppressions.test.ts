import assert from "node:assert/strict";
import test from "node:test";

import { parseSuppressions } from "../packages/core/suppressions.ts";
import { parseHtml } from "../packages/cli/adapter.ts";

const suppressions = (source: string) => parseSuppressions(parseHtml(source).comments);

const at = (source: string) => {
  const s = suppressions(source);
  return (ruleId: string, line: number) => s.isSuppressed(ruleId, line);
};

test("disable-next-line suppresses only the following line", () => {
  const is = at(["a", "<!-- deadhead-disable-next-line meta/x -->", "c", "d"].join("\n"));
  assert.equal(is("meta/x", 2), false, "not the comment's own line");
  assert.equal(is("meta/x", 3), true);
  assert.equal(is("meta/x", 4), false);
  assert.equal(is("meta/y", 3), false, "a different rule is untouched");
});

test("a bare disable-next-line suppresses every rule", () => {
  const is = at(["a", "<!-- deadhead-disable-next-line -->", "c"].join("\n"));
  assert.equal(is("anything/at-all", 3), true);
});

test("disable runs until enable", () => {
  const is = at(
    [
      "1",
      "<!-- deadhead-disable meta/x -->",
      "3",
      "4",
      "<!-- deadhead-enable -->",
      "6",
    ].join("\n"),
  );
  assert.equal(is("meta/x", 1), false);
  assert.equal(is("meta/x", 3), true);
  assert.equal(is("meta/x", 4), true);
  assert.equal(is("meta/x", 6), false);
  assert.equal(is("meta/other", 3), false);
});

test("an unclosed disable runs to the end of the file", () => {
  const is = at(["1", "<!-- deadhead-disable -->", "3"].join("\n"));
  assert.equal(is("meta/x", 3), true);
  assert.equal(is("meta/x", 9999), true);
});

test("enable with ids closes only those blocks", () => {
  const is = at(
    [
      "<!-- deadhead-disable meta/x, meta/y -->",
      "2",
      "<!-- deadhead-enable meta/x -->",
      "4",
    ].join("\n"),
  );
  assert.equal(is("meta/x", 2), true);
  assert.equal(is("meta/x", 4), false);
  assert.equal(is("meta/y", 4), true, "meta/y was never re-enabled");
});

test("rule ids may be comma- or space-separated", () => {
  const is = at(["<!-- deadhead-disable-next-line meta/x meta/y -->", "2"].join("\n"));
  assert.equal(is("meta/x", 2), true);
  assert.equal(is("meta/y", 2), true);
});

test("ordinary comments are not directives", () => {
  const is = at(["<!-- disable meta/x -->", "<!-- TODO: deadhead-disable -->", "3"].join("\n"));
  assert.equal(is("meta/x", 2), false);
  assert.equal(is("meta/x", 3), false);
});

test("line numbers survive multi-line comments before the directive", () => {
  const is = at(
    ["<!--", "a banner", "comment", "-->", "<!-- deadhead-disable-next-line meta/x -->", "6"].join(
      "\n",
    ),
  );
  assert.equal(is("meta/x", 6), true);
  assert.equal(is("meta/x", 5), false);
});

test("a finding with no line can never be suppressed", () => {
  const s = suppressions("<!-- deadhead-disable -->");
  assert.equal(s.isSuppressed("meta/x", null), false);
});

test("ids lists every rule id named in a directive with its line", () => {
  const s = suppressions(
    ["<!-- deadhead-disable-next-line meta/a -->", "x", "<!-- deadhead-disable meta/b -->", "<!-- deadhead-enable meta/b -->"].join("\n"),
  );
  assert.deepEqual(s.ids(), [
    { line: 1, id: "meta/a" },
    { line: 3, id: "meta/b" },
    { line: 4, id: "meta/b" },
  ]);
});
