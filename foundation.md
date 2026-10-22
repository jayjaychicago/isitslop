# isitslop.org — Foundation

This file is the founding brief for the project. It is the "why". Everything else in this repo is an attempt at the "what", and the "what" is expected to be replaced by smarter people over time. The "why" should change rarely, and only deliberately.

## The original brief (verbatim, from the founder)

> Create a beautiful website using vercel for isitslop.org which i own and create an api that uses only heuristics to produce a sloppiness score akin to the roten tomatoe score (critics and people where critics is "lack of quality product definition because in a world where ai can deliver any spec (what you want to build), the only hard thing left is good definition (why it needs to get built)" and people is "do people finding it use it". Note that this is going to begin super crudely and the idea is to create an isitslop github repo for the API that will be open for contributors to change overtime with a main rule for it to be self-sustaining (so I cannot provide an LLM api key that I pay for for it to work) relatively (happy to pay for some hosting fees). isitslop.org should allow to search and add URLs (that's the index although what is graded can be github repos even private ones, analytics conversion rates, ...) and the current summary of what the sloppiness metric is composed of. There should be tos and privacy terms. The API and website should allow to check for the domain ownership so that the domain owner can be verified (email?) before getting a grade so that only the owner can submit for a grade and there should be super strong terms in there saying that submitting for a grade means they agree to the outcome and won't sue us into oblivion because they don't like it. It should allow domain owners to submit appeals though. Make this prompt a foundation.MD Ask me however many questions you need to plan this. Keep shit real simple. Smarter people will come with better ideas on how to do this later on

## The thesis

AI can now deliver almost any spec. "What to build" has become cheap. The only hard thing left is **definition**: knowing, and saying clearly, *why* something needs to exist, for whom, and what it deliberately is not.

Slop is what you get when the definition is missing. It ships, it even looks fine, and nobody needed it.

So the score has two halves:

| Half | Question it answers | How v0 measures it |
|---|---|---|
| **Quality** | Is this real, maintained work by more than one person over time? | GitHub repository signals that are expensive to fake, read with the owner's own login. Stars and forks are not used. |
| **Popularity** | Do the people who find it actually use it? | Read from the owner's connected analytics: unique visitors in 30 days and how many came back on another day. Never typed in. |

The first attempt at Quality was regex heuristics over landing-page text (does it say what, why, who). It was dropped on day two as complexity without relevance. Repository history is harder to fake than prose.

The verdict is two words, one per axis. Quality below the cut is **Slop**, above it is **Craft**. Popularity below the cut is **Fringe**, above it is **Popular**. So a thing is Fringe Slop, Popular Slop, Fringe Craft or Popular Craft. Nothing connected is **Unknown**, not zero. Connected and empty (no history, no visitors) is zero.

## Rules that do not change without a very good reason

1. **Self-sustaining.** The API must run on free or near-free infrastructure with no per-request cost owed by the maintainers. No LLM API keys. No paid data vendors. If a heuristic needs money to run, it does not get merged. Hosting fees in the tens of dollars a month are acceptable; a bill that scales with usage is not.
2. **Heuristics only, and legible.** Every point in a score must trace back to a named rule a human can read in `api/src/heuristics/`. `GET /v1/methodology` is generated from the code, so the website always shows exactly what the score is made of today.
2b. **Hard to buy.** A signal that can be purchased (stars, forks, followers, traffic) is not a signal. Prefer things that cost time: months of commits, other people's issues, releases.
3. **Only owners get graded.** A URL can be added to the index by anyone. A grade is only produced when the verified owner asks for one and accepts the terms. Nobody gets graded against their will.
4. **Submitting means accepting the outcome.** The terms are blunt on purpose. You asked, you got an answer, the answer is an opinion produced by public rules, and you cannot sue over it.
5. **Appeals exist.** Owners can appeal. Appeals and their outcomes are public on the entry page. Appeals are resolved by maintainers, or by changing the heuristic for everyone if the appeal exposes a bad rule. Nobody gets a private exception.
6. **Keep it simple.** Prefer a crude rule that is easy to read over a clever one that is not. This is v0. Smarter people will come.

## What is in the index

The index is a list of URLs. v0 supports:

- Websites (any `https://` URL; the domain is what gets verified). A site links the repo it is built from, and Quality is read from that repo.
- GitHub repositories (`https://github.com/owner/repo`), public or private.

One thing is one entry: a product with a site and a repo is one entry with the repo linked, not two entries. Connected analytics are out of scope for v0 and left as an open contribution.

## How v0 verifies ownership

| Target | Methods |
|---|---|
| Website | DNS TXT record `_isitslop.<domain>`, or a file at `/.well-known/isitslop.txt`, or an email code sent to `admin@`, `webmaster@`, `postmaster@` or `hostmaster@` the domain. |
| GitHub repo | Sign in with a GitHub account that has push access, through the isitslop GitHub App. |

On success the owner receives a one-time **owner key**. It is shown once, stored hashed, and used as a bearer token for grading and appeals. A site owner also connects GitHub so the linked repo can be read with their token (encrypted at rest, refreshed automatically, deleted on disconnect).

## How v0 scores Quality

From the repository, with the owner's token. Three signals, weights 60/25/15: a year of pushes (share of the last 52 weeks with commits, times age, with full credit only at twelve months and nothing under one), other humans with two or more commits, and the number of issues ever filed. Who filed them and whether they were closed is popularity, not quality. Nothing that can be scaffolded in an afternoon counts: README, license, CI, tests and releases were all tried on day two and removed because a day-old repo was scoring 23. Archived repos are capped at 20. The exact rules are in `api/src/heuristics/quality.ts` and on the methodology page.

## How v0 scores Popularity

The owner connects their analytics (Google Analytics, PostHog or Plausible in v0) with a read-only key, stored encrypted. At grading time the API reads two numbers for the last 30 days: unique visitors, and how many of them were seen on two or more different days. Coming back is the cheapest honest definition of "using it". Returning rate carries most of the weight; reach (log of visitors) adds the rest so that two friends visiting daily does not look like a product. No analytics connected, or no visitors, is a popularity of zero. Self-reported numbers were tried on day one and removed on day two: a number the owner types is not a measurement.

## Architecture (v0)

```
website/   Next.js on Vercel          -> isitslop.org
api/       Cloudflare Worker (Hono)   -> api.isitslop.org
           Neon Postgres (free tier)  -> the index
           AWS SES                    -> verification email only
           GitHub App "is-it-slop"    -> owners sign in; repos are read with their token
           PostHog / Plausible API    -> owners connect; visitors are read with their key
```

The website is a thin client over the public API. Anything the website can do, `curl` can do.

## Legal

Operated by API Blaze, LLC, a Michigan limited liability company. Terms and privacy policy live in `website/src/app/terms` and `website/src/app/privacy`. Changes to the terms bump `TERMS_VERSION` in the API, and owners re-accept on their next grade request.

## How to contribute

Read `CONTRIBUTING.md`. The short version: add or change a heuristic in `api/src/heuristics/`, write its rationale in the rule's `description`, bump `HEURISTICS_VERSION`, open a PR. Old grades keep the version they were computed with.
