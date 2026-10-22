# isitslop

A sloppiness score for things on the internet. It asks two plain questions:

- **Quality**: is this real, maintained work by more than one person over time? Read from the GitHub repository with the owner's own login. Three signals, all of which take time: a year of pushes, other humans committing, issues being filed. Nothing that can be scaffolded in an afternoon counts: no README, license, CI, tests, stars or forks.
- **Popularity**: do the people who find it actually use it? Read from the owner's connected analytics (Google Analytics, PostHog or Plausible in v0): unique visitors in 30 days and how many came back on another day. Nothing is typed in.

The verdict is two words, one per axis: **Fringe** or **Popular**, **Slop** or **Craft**. Nothing connected is unknown, not zero. Connected and empty is zero.

Built for founders and open source maintainers who want an honest, public answer to "was it worth building?", and for the contributors who think the rules could be better. It exists because AI made the "what" cheap: anyone can ship a spec in an afternoon, so the thing that separates a product from slop is the definition behind it, and nobody was measuring that.

Heuristics only. No LLMs. Every rule is public and generated into the website's methodology page from the code. The API is a Cloudflare Worker written in TypeScript with Hono, the index is Neon Postgres, the website is Next.js on Vercel. Owners sign in with GitHub through the Is It Slop GitHub App, claim their repositories, link their sites, and connect Google Analytics; repositories are read with the owner's own access, so private repos work and nobody shares a rate limit. A private repository's URL is never published. It is not a security scanner, an SEO tool, or a replacement for talking to users.

Live at [isitslop.org](https://isitslop.org). API at [api.isitslop.org](https://api.isitslop.org). Read [foundation.md](foundation.md) first: it is the "why" for this repo.

## Layout

```
foundation.md   the founding brief; read it before changing anything
api/            Cloudflare Worker (Hono + Neon Postgres). The score lives here.
website/        Next.js on Vercel. Thin client over the API.
```

## Run it locally

API:

```sh
cd api
npm install
cp .dev.vars.example .dev.vars        # fill in a Postgres URL (Neon free tier works)
psql "$DATABASE_URL" -f schema.sql
npm test                              # heuristics unit tests, no network
npm run dev                           # http://localhost:8787
```

Website:

```sh
cd website
npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:8787/v1' > .env.local
npm run dev                           # http://localhost:3000
```

Note the API base URL includes `/v1`.

## Look up a score

```sh
curl -H "X-API-Key: $ISITSLOP_API_KEY" "https://api.isitslop.org/v1/score?url=apiblaze.com"
# {"found":true,"quality":79,"popularity":0,"verdict":"fringe_craft","label":"Fringe Craft",...}
```

Keys are issued per consumer. Reading the index and entry pages needs no key. Grades refresh themselves: popularity every day, quality on the first of the month (a Cloudflare cron in `api/src/scheduled.ts`).

## Try the quality rules on any public repo, without storing anything

```sh
curl "https://api.isitslop.org/v1/preview?url=github.com/honojs/hono"
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The one hard rule: it must stay self-sustaining. No per-request costs, no LLM keys, no paid data.

## License

MIT. Operated by API Blaze, LLC.
