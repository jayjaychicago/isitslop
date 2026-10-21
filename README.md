# isitslop

A sloppiness score for things on the internet, shaped like a Rotten Tomatoes score.

- **Critics**: is there a quality product definition? What it is, why it must exist, who it is for, what it is not.
- **People**: do the people who find it actually use it?

Heuristics only. No LLMs. Every rule is public and generated into the website's methodology page from the code.

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

## Try the rules on anything, without storing anything

```sh
curl "https://api.isitslop.org/v1/preview?url=example.com"
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The one hard rule: it must stay self-sustaining. No per-request costs, no LLM keys, no paid data.

## License

MIT. Operated by API Blaze, LLC.
