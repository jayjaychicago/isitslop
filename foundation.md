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
| **Definition** | Does the thing say clearly what it is, why it needs to exist, who it is for, and what it is not? | Text heuristics over the landing page or README. No LLM. |
| **Usage** | Do the people who find it actually use it? | Conversion and return rates attested by the verified owner. |

In the code and the API these halves are still called `critics` and `people`. That is an implementation detail, not editorial. On the website and in writing, say Definition and Usage.

A thing is **Not Slop** when both halves are good. It is **Slop** when either half is bad. Everything else is **Mixed**. No usage data is not "unknown": a thing nobody uses is slop, however well defined, so missing usage counts as zero.

## Rules that do not change without a very good reason

1. **Self-sustaining.** The API must run on free or near-free infrastructure with no per-request cost owed by the maintainers. No LLM API keys. No paid data vendors. If a heuristic needs money to run, it does not get merged. Hosting fees in the tens of dollars a month are acceptable; a bill that scales with usage is not.
2. **Heuristics only, and legible.** Every point in a score must trace back to a named rule a human can read in `api/src/heuristics/`. `GET /v1/methodology` is generated from the code, so the website always shows exactly what the score is made of today.
3. **Only owners get graded.** A URL can be added to the index by anyone. A grade is only produced when the verified owner asks for one and accepts the terms. Nobody gets graded against their will.
4. **Submitting means accepting the outcome.** The terms are blunt on purpose. You asked, you got an answer, the answer is an opinion produced by public rules, and you cannot sue over it.
5. **Appeals exist.** Owners can appeal. Appeals and their outcomes are public on the entry page. Appeals are resolved by maintainers, or by changing the heuristic for everyone if the appeal exposes a bad rule. Nobody gets a private exception.
6. **Keep it simple.** Prefer a crude rule that is easy to read over a clever one that is not. This is v0. Smarter people will come.

## What is in the index

The index is a list of URLs. v0 supports:

- Websites (any `https://` URL; the domain is what gets verified).
- Public GitHub repositories (`https://github.com/owner/repo`; the README is what gets graded).

Private repos and connected analytics are explicitly out of scope for v0 and left as open contributions.

## How v0 verifies ownership

| Target | Methods |
|---|---|
| Website | DNS TXT record `_isitslop.<domain>`, or a file at `/.well-known/isitslop.txt`, or an email code sent to `admin@`, `webmaster@`, `postmaster@` or `hostmaster@` the domain. |
| Public GitHub repo | A file named `.isitslop` in the repo root on the default branch. |

On success the owner receives a one-time **owner key**. It is shown once, stored hashed, and used as a bearer token for grading and appeals.

## How v0 scores Usage

The owner reports three numbers for the last 30 days: visitors, visitors who took the core action ("activated"), and activated users who came back at least once. Conversion carries most of the weight; return is a sanity check so a high-converting page nobody returns to does not pass. The page shows the numbers as **self-reported**. Fewer than 100 visitors, or no numbers at all, is a usage score of zero: nobody is using it. Verified analytics connections (GA4, PostHog, Plausible, Stripe) are the obvious next contribution.

## Architecture (v0)

```
website/   Next.js on Vercel          -> isitslop.org
api/       Cloudflare Worker (Hono)   -> api.isitslop.org
           Neon Postgres (free tier)  -> the index
           AWS SES                    -> verification email only
```

The website is a thin client over the public API. Anything the website can do, `curl` can do.

## Legal

Operated by API Blaze, LLC, a Michigan limited liability company. Terms and privacy policy live in `website/src/app/terms` and `website/src/app/privacy`. Changes to the terms bump `TERMS_VERSION` in the API, and owners re-accept on their next grade request.

## How to contribute

Read `CONTRIBUTING.md`. The short version: add or change a heuristic in `api/src/heuristics/`, write its rationale in the rule's `description`, bump `HEURISTICS_VERSION`, open a PR. Old grades keep the version they were computed with.
