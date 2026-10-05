/**
 * The try page in the browser. All output is built with createElement and
 * textContent: snippets come from the visitor's HTML and must never be parsed
 * as markup.
 */
import { compileForRun } from "../../../packages/cli/source.ts";
import { loadRules } from "../../../packages/rules/load.ts";
import { decodeShare, encodeShare, lintHtml, SHARE_LIMIT, type LintView } from "../lib/playground.ts";

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`try page: #${id} is missing`);
  return element as T;
};

const form = $<HTMLFormElement>("try-form");
const input = $<HTMLTextAreaElement>("try-input");
const file = $<HTMLInputElement>("try-file");
const share = $<HTMLButtonElement>("try-share");
const status = $<HTMLParagraphElement>("try-status");
const results = $<HTMLElement>("try-results");
const fixedBox = $<HTMLDetailsElement>("try-fixed");
const output = $<HTMLTextAreaElement>("try-output");
const copy = $<HTMLButtonElement>("try-copy");

const compiled = compileForRun(await loadRules(), {});

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};

function render(view: LintView): void {
  results.replaceChildren();
  const total = view.findings.length;
  const { harmful, deprecated, unnecessary } = view.counts;
  if (total === 0) status.textContent = "No findings.";
  else {
    status.replaceChildren(
      `${total} finding${total === 1 ? "" : "s"}: ${harmful} harmful, ${deprecated} deprecated, ${unnecessary} unnecessary. `,
      el("code", "--fix"),
      ` removes ${view.fixed}.`,
    );
  }
  if (total > 0) {
    const list = el("ol");
    for (const finding of view.findings) {
      const item = el("li");
      const head = el("p");
      const where = finding.line === null ? "" : `${finding.line}:${finding.col} `;
      head.append(el("strong", `${where}${finding.severity}${finding.possible ? " (possible)" : ""}`), " ");
      const link = el("a");
      link.href = finding.url;
      link.append(el("code", finding.ruleId));
      head.append(link, ` ${finding.message}`);
      const snippet = el("pre");
      snippet.append(el("code", finding.snippet));
      const advice = el("p", finding.replacement);
      if (finding.fixable) advice.append(" Fixed by ", el("code", "--fix"), ".");
      if (finding.detail !== null) advice.append(el("br"), el("small", finding.detail));
      item.append(head, snippet, advice);
      list.append(item);
    }
    results.append(list);
  }
  fixedBox.hidden = view.fixed === 0;
  output.value = view.output;
}

const run = (): void => render(lintHtml(input.value, compiled));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  run();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    run();
  }
});

file.addEventListener("change", async () => {
  const chosen = file.files?.[0];
  if (chosen === undefined) return;
  input.value = await chosen.text();
  run();
});

share.addEventListener("click", async () => {
  const fragment = await encodeShare(input.value);
  if (fragment.length > SHARE_LIMIT) {
    status.textContent = `This HTML is too long to share in a link (${fragment.length} of ${SHARE_LIMIT} characters after compression).`;
    return;
  }
  history.replaceState(null, "", fragment);
  await navigator.clipboard.writeText(location.href);
  status.textContent = "Link copied. It holds the HTML itself; nothing is stored anywhere.";
});

copy.addEventListener("click", async () => {
  await navigator.clipboard.writeText(output.value);
  status.textContent = "Fixed HTML copied.";
});

const shared = await decodeShare(location.hash);
if (shared !== null) input.value = shared;
run();
