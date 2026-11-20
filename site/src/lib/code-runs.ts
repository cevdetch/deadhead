/**
 * Advice text split into prose and markup, so the markup can be set as code:
 * runs at odd indices are tags such as `<img src="/hero.jpg">`, runs at even
 * indices are prose. Joined back, the runs are the original text.
 */
export const codeRuns = (text: string): string[] => text.split(/(<[^<>]+>)/);
