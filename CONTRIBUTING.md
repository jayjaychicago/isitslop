# Contributing

Read `foundation.md` first. It explains why this exists. Then:

## The one rule

**It must stay self-sustaining.** The API runs on free tiers. A contribution that adds a per-request cost (an LLM call, a paid data vendor, a metered API) will not be merged, however good the idea. Hosting in the tens of dollars a month is fine. A bill that grows with traffic is not.

## Changing a heuristic

All scoring lives in `api/src/heuristics/`.

- `critics.ts` holds the rules for product definition. Each rule is `{ id, description, weight, run }`. `run` receives the extracted page text and returns a score in [0, 1] plus evidence strings that are shown to the owner.
- `people.ts` holds the usage score. v0 is owner-attested; verified analytics connections are the obvious next step.
- `verdict.ts` combines the two.

When you add or change a rule:

1. Write the `description` for a non-programmer. It appears verbatim on the methodology page. If you cannot explain it in two sentences, it does not belong.
2. Add a case to `api/test/heuristics.test.ts`. The tests run with `npm test` and need no network.
3. Bump `HEURISTICS_VERSION` (or `PEOPLE_VERSION`). Existing grades keep the version they were computed with.
4. Open a PR. Say what kind of page the rule helps with and what kind it might hurt.

## Resolving appeals

Appeals are public. A maintainer resolves one with the admin token:

```sh
curl -X POST https://api.isitslop.org/v1/appeals/APPEAL_ID/resolve \
  -H "authorization: Bearer $ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"status":"accepted","response":"The who rule missed audience statements in <h2>. Fixed in 0.1.1, re-graded."}'
```

The response is public. Either fix the rule for everyone and re-grade, or explain why the rule stands. No private exceptions.

## Good first contributions

- Private GitHub repos (GitHub App or fine-grained token, owner-supplied).
- Verified analytics for the Usage score (GA4, PostHog, Plausible, Stripe) via owner-supplied read-only credentials.
- Better text extraction for JavaScript-rendered landing pages, without a headless browser if at all possible.
- Multilingual rules. Everything in v0 is English regexes.
- A badge endpoint (`/v1/entries/:id/badge.svg`) so owners can show their score.

## Style

Keep it crude and readable. Prefer a regex with a comment over a dependency. Prefer one file over three.
