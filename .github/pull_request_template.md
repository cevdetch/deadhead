## Summary

<!-- Explain the problem and the resulting behavior. Use Closes #N for a resolved issue, or Refs #N for related work. -->

## Validation

<!-- List the checks you ran and their results. Include any checks that could not run. -->

<details>
<summary>Rule changes: complete this checklist when adding or changing a rule</summary>

ruleId: <!-- namespace/name; must match the file path -->

- [ ] Frontmatter validates (`pnpm validate:rules`), and `ruleId` matches the file path
- [ ] At least two independent sources under `## Resources`
- [ ] `## Why avoid` (or `## Why use`) states the concrete consequence, not just "it's old"
- [ ] `## Use instead` has runnable markup, or explicitly says "delete it"
- [ ] `severity` is justified: `harmful` breaks something for users; `deprecated` is
      formally obsolete but inert; `unnecessary` works but is dead weight
- [ ] Fixtures pass in all three adapters (conformance suite)
- [ ] Each tag is carried by ≥2 rules
- [ ] If the rule has a fix op, `test/fix-golden.test.ts` covers it and the fix changes no behaviour

</details>

## Notes for the reviewer

<!-- Consequence summary, evidence assessment, anything uncertain. -->
