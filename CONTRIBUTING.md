# Contributing

Read `foundation.md` first. It explains why this exists. Then:

## The one rule

**It must stay self-sustaining.** The API runs on free tiers. A contribution that adds a per-request cost (an LLM call, a paid data vendor, a metered API) will not be merged, however good the idea. Hosting in the tens of dollars a month is fine. A bill that grows with traffic is not.

## Changing a heuristic

All scoring lives in `api/src/heuristics/`.

- `quality.ts` holds the quality signals and the GitHub collection code. Each rule is `{ id, description, weight, run }`. `run` receives `RepoFacts` (counts and dates collected from the GitHub API with the owner's token) and returns a score in [0, 1] plus evidence strings shown to the owner. If your rule needs a fact that is not collected yet, add it to `collectRepoFacts`.
- `popularity.ts` holds the popularity score: returning rate and reach from the connected analytics. `../lib/analytics.ts` holds the providers (PostHog, Plausible); adding one is one object with a `read` function that returns visitors and returning for 30 days.
- `verdict.ts` combines the two. Missing data is zero, never "unknown".

When you add or change a rule:

1. Write the `description` for a non-programmer. It appears verbatim on the methodology page. If you cannot explain it in two sentences, it does not belong.
2. Ask whether it can be bought. Stars, forks and watchers were rejected for that reason. A signal someone can fake for twenty dollars is worse than no signal.
3. Add a case to `api/test/heuristics.test.ts`. The tests run with `npm test` and need no network.
4. Bump `QUALITY_VERSION` (or `POPULARITY_VERSION`). Existing grades keep the version they were computed with.
4. Open a PR. Say what kind of page the rule helps with and what kind it might hurt.

## Scheduled refresh

`api/src/scheduled.ts` runs from the cron in `wrangler.toml` (daily 04:10 UTC): popularity for every graded entry with analytics connected, plus quality on the 1st. `POST /v1/admin/refresh` (admin token; `?quality=1` to force quality) runs the same thing on demand.

## Sessions and keys

The website signs owners in with GitHub (`api/src/routes/auth.ts`, cookie on `.isitslop.org`). Owner actions check the session, or an owner key for API use (`requireOwner` in `grade.ts`). `GET /v1/score` is behind one fixed `API_KEY` secret.

## Resolving appeals

Appeals are public. A maintainer resolves one with the admin token:

```sh
curl -X POST https://api.isitslop.org/v1/appeals/APPEAL_ID/resolve \
  -H "authorization: Bearer $ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"status":"accepted","response":"The contributors rule counted a release bot as a human. Fixed in 0.3.1, re-graded."}'
```

The response is public. Either fix the rule for everyone and re-grade, or explain why the rule stands. No private exceptions.

## Good first contributions

- More analytics providers for Popularity: Google Analytics, Fathom, Umami, Cloudflare Web Analytics.
- GitLab, Codeberg and self-hosted repositories. Everything in v0 is GitHub.
- Fraud resistance: cadence bots, sock-puppet contributors, issue farms.
- Pull request signals: reviewed merges from outside contributors.
- A badge endpoint (`/v1/entries/:id/badge.svg`) so owners can show their score.

## Style

Keep it crude and readable. Prefer a regex with a comment over a dependency. Prefer one file over three.
