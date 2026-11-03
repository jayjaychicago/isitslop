import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './lib/env.ts';
import { entries } from './routes/entries.ts';
import { verify } from './routes/verify.ts';
import { grade } from './routes/grade.ts';
import { appeals } from './routes/appeals.ts';
import { methodology } from './routes/methodology.ts';
import { github } from './routes/github.ts';
import { analytics } from './routes/analytics.ts';
import { google } from './routes/google.ts';
import { auth } from './routes/auth.ts';
import { feedback } from './routes/feedback.ts';
import { posts } from './routes/posts.ts';
import { contact } from './routes/contact.ts';
import { scheduledRefresh } from './scheduled.ts';
import { edgeCache } from './lib/edgecache.ts';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin, c) => (origin === c.env.PUBLIC_SITE_URL || /^http:\/\/localhost:\d+$/.test(origin) ? origin : c.env.PUBLIC_SITE_URL),
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}));

app.get('/', (c) =>
  c.json({
    name: 'isitslop api',
    docs: 'https://github.com/jayjaychicago/isitslop',
    endpoints: [
      'GET /health',
      'GET /methodology',
      'POST /feedback',
      'POST /contact                      the contact form (Turnstile, then email)',
      'GET /posts, GET /v1/posts/:slug   the blog; PUT/DELETE /v1/posts/:slug (operator) write it',
      'GET/POST /posts/:slug/comments     comments under a post (POST: signed in); DELETE /posts/:slug/comments/:id',
      'GET /score?url=example.com   (Authorization: Bearer API key) the current score of a URL, nothing else',
      'GET /entries?q=&limit=&offset=',
      'POST /claim {url}           (signed in) claim a repository; your GitHub account must have push access. Creates the entry.',
      'GET /entries/:id',
      'GET /preview?url=github.com/o/r   dry-run quality score, nothing stored',
      'POST /verify/start {url, method: dns|file|email, email?}   (signed in) start proving a site is yours',
      'GET /auth/github?return=/   sign in with GitHub (sets a session cookie)',
      'GET /me                     who am I and what do I own',
      'GET /github/repos           (signed in) repositories you can push to that the app can see',
      'POST /auth/logout',
      'POST /verify/check {verificationId, code?}   (signed in) on success the entry is created and owned by you',
      'GET /google/login?entry=     (signed in as owner) connect Google Analytics, read-only',
      'POST /entries/:id/analytics (Bearer owner key) {propertyId}   pick the GA4 property after sign-in',
      'DELETE /entries/:id/analytics (Bearer owner key)',
      'POST /entries/:id/grade  (signed in as owner, or Bearer owner key) {acceptTerms: true}',
      'POST /entries/:id/repo   (signed in as owner) {repoUrl}   link a repo to a site entry; your GitHub account must have push access',
      'DELETE /entries/:id       (Bearer owner key or admin)  remove the entry',
      'POST /entries/:id/appeals (Bearer owner key) {text}',
      'POST /appeals/:id/resolve (Bearer admin) {status, response}',
    ],
  }),
);
app.get('/health', (c) => c.json({ ok: true }));
app.get('/v1/health', (c) => c.json({ ok: true }));

// Public reads are cached at the edge for anonymous visitors (see lib/edgecache.ts).
for (const base of ['', '/v1']) {
  app.use(`${base}/entries`, edgeCache(60));
  app.use(`${base}/entries/:id`, edgeCache(60));
  app.use(`${base}/methodology`, edgeCache(600));
  app.use(`${base}/preview`, edgeCache(3600));
  app.use(`${base}/posts`, edgeCache(60));
  app.use(`${base}/posts/:slug`, edgeCache(60));
}

// Every route answers at the root and under /v1 (the OAuth callbacks are registered under /v1; the docs show the root).
for (const r of [methodology, entries, verify, grade, appeals, github, analytics, feedback, contact, posts, google, auth]) {
  app.route('/v1', r);
  app.route('/', r);
}

app.notFound((c) => c.json({ error: 'not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal error' }, 500);
});

/** Admin: run the refresh now (same as the cron). ?quality=1 forces a quality refresh. */
app.post('/admin/refresh', adminRefresh);
app.post('/v1/admin/refresh', adminRefresh);
async function adminRefresh(c: Context<{ Bindings: Env }>) {
  const auth = (c.req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!c.env.ADMIN_TOKEN || auth !== c.env.ADMIN_TOKEN) return c.json({ error: 'unauthorized' }, 401);
  const force = c.req.query('quality') === '1';
  return c.json(await scheduledRefresh(c.env, force ? new Date(Date.UTC(2000, 0, 1)) : new Date()));
}

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(scheduledRefresh(env));
  },
};
