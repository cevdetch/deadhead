/**
 * The try page in the browser. All output is built with createElement and
 * textContent: snippets come from the visitor's HTML and must never be parsed
 * as markup.
 */
import { decodeHandoff } from "../../../packages/browser/handoff.ts";
import { compileForRun } from "../../../packages/cli/source.ts";
import { loadRuntimeRules } from "../../../packages/rules/load.ts";
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

let compiled: ReturnType<typeof compileForRun> | undefined;

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
  if (total === 0) status.textContent = "No findings.";
  else {
    status.replaceChildren(`${total} finding${total === 1 ? "" : "s"}`);
    for (const severity of ["harmful", "deprecated", "unnecessary"] as const) {
      if (view.counts[severity] > 0) status.append(badge(severity, `${view.counts[severity]} ${severity}`));
    }
    status.append(` · ${view.fixed} automatically fixed · ${view.remaining} remaining`);
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
      advice.append(finding.fixable ? " Automatic fix." : " Manual change.");
      if (finding.detail !== null) advice.append(el("br"), el("small", finding.detail));
      item.append(link, badge(finding.severity, `${finding.severity}${finding.possible ? ", possible" : ""}`), message, snippet, advice);
      list.append(item);
    }
    results.append(list);
  }
  fixedBox.hidden = view.fixed === 0;
  output.value = view.output;
}

const run = async (): Promise<void> => {
  try {
    compiled ??= compileForRun(await loadRuntimeRules(), {});
    render(lintHtml(input.value, compiled));
  }
  catch {
    results.replaceChildren();
    fixedBox.hidden = true;
    output.value = "";
    status.textContent = "Could not check this HTML. Try the CLI.";
  }
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void run();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    void run();
  }
});

file.addEventListener("change", async () => {
  const chosen = file.files?.[0];
  if (chosen === undefined) return;
  try {
    const text = await chosen.text();
    if (file.files?.[0] !== chosen) return;
    input.value = text;
    await run();
  } catch { status.textContent = "Could not read this file. Paste its HTML instead."; }
});

async function copyText(text: string, success: string, failure: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); status.textContent = success; }
  catch { status.textContent = failure; }
}

share.addEventListener("click", async () => {
  share.disabled = true;
  try {
    const fragment = await encodeShare(input.value);
    if (fragment.length > SHARE_LIMIT) {
      status.textContent = `This HTML is too long for a share link (${fragment.length} of ${SHARE_LIMIT} characters).`;
      return;
    }
    history.replaceState(null, "", fragment);
    await copyText(location.href, "Link copied. It holds the HTML.", "Could not copy the link. Copy it from the address bar.");
  } catch (error) {
    status.textContent = error instanceof RangeError ? error.message : "Could not create a link. Copy the HTML instead.";
  } finally { share.disabled = false; }
});

copy.addEventListener("click", async () => {
  await copyText(output.value, "HTML copied.", "Could not copy the HTML. Copy the text manually.");
});

input.addEventListener("input", () => (from.hidden = true), { once: true });

const fragment = location.hash;
const isHandoff = fragment.startsWith("#page=");
if (isHandoff) history.replaceState(null, "", location.pathname + location.search);
const handed = await decodeHandoff(fragment);
const shared = handed === null ? await decodeShare(fragment) : null;
if (handed !== null) {
  input.value = handed.html;
  from.textContent =
    handed.source === "raw"
      ? `Source HTML from ${handed.url}.`
      : `Rendered HTML from ${handed.url}. Source could not be fetched; scripts may have changed the markup.`;
  from.hidden = false;
} else if (shared !== null) input.value = shared;
const unreadable = (isHandoff || fragment.startsWith("#html=")) && handed === null && shared === null;
if (unreadable) status.textContent = "Could not read this link. Paste HTML or open a file.";
else await run();
