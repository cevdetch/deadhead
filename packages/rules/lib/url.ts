/**
 * An attribute URL as the URL parser reads it: leading and trailing C0 control
 * or space removed, and tab and newline removed anywhere.
 * https://url.spec.whatwg.org/#concept-basic-url-parser
 */
export const trimUrl = (value: string): string =>
  value.replace(/^[\u0000- ]+|[\u0000- ]+$/g, "").replace(/[\t\n\r]/g, "");

/** Whether the URL starts with a scheme (`https:`, `android-app:`), which makes it absolute. */
export const hasScheme = (value: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(trimUrl(value));
