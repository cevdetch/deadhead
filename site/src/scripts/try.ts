/**
 * The try page in the browser. All output is built with createElement and
 * textContent: snippets come from the visitor's HTML and must never be parsed
 * as markup.
 */
import { decodeHandoff } from "../../../packages/browser/handoff.ts";
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
const from = $<HTMLParagraphElement>("try-from");

const compiled = compileForRun(await loadRules(), {});

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};

/** A severity badge, colored by the site's `[data-severity]` styles. */
const badge = (severity: string, text: string): HTMLSpanElement => {
  const span = el("span", text);
  span.dataset["severity"] = severity;
  return span;
};

function render(view: LintView): void {
  results.replaceChildren();
  const total = view.findings.length;
  if (total === 0) status.textContent = "No findings. Nothing here for deadhead to report.";
  else {
    status.replaceChildren(`${total} finding${total === 1 ? "" : "s"}`);
    for (const severity of ["harmful", "deprecated", "unnecessary"] as const) {
      if (view.counts[severity] > 0) status.append(badge(severity, `${view.counts[severity]} ${severity}`));
    }
    status.append(" · ", el("code", "--fix"), ` removes ${view.fixed}`);
    const list = el("ol");
    list.className = "rules";
    for (const finding of view.findings) {
      const item = el("li");
      const link = el("a");
      link.href = finding.url;
      link.append(el("code", finding.ruleId));
      const message = el("p");
      if (finding.line !== null) message.append(el("code", `${finding.line}:${finding.col}`), " ");
      message.append(finding.message);
      const snippet = el("pre");
      snippet.append(el("code", finding.snippet));
      const advice = el("p", finding.replacement);
      if (finding.fixable) advice.append(" Fixed by ", el("code", "--fix"), ".");
      if (finding.detail !== null) advice.append(el("br"), el("small", finding.detail));
      item.append(link, badge(finding.severity, `${finding.severity}${finding.possible ? ", possible" : ""}`), message, snippet, advice);
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

input.addEventListener("input", () => (from.hidden = true), { once: true });

const handed = await decodeHandoff(location.hash);
if (handed !== null) {
  input.value = handed.html;
  from.textContent =
    handed.source === "raw"
      ? `HTML of ${handed.url}, as its server sent it.`
      : `HTML of ${handed.url}, read from the rendered DOM: the page blocked re-reading its source, so scripts may have added or changed markup.`;
  from.hidden = false;
  // The fragment holds the whole page: keep it out of the address bar and out of a copied link.
  history.replaceState(null, "", location.pathname + location.search);
} else {
  const shared = await decodeShare(location.hash);
  if (shared !== null) input.value = shared;
}
run();
