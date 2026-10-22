export type Env = {
  DATABASE_URL: string;
  ADMIN_TOKEN: string;
  /** Single fixed key for the external score API (GET /v1/score). Proxied by the operator; self-service keys later. */
  API_KEY?: string;
  PUBLIC_SITE_URL: string;
  OAUTH_CALLBACK_ORIGIN: string;
  /** Comma-separated GitHub logins that may delete any entry while signed in. */
  ADMIN_GITHUB_LOGINS?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  SES_FROM?: string;
  GITHUB_TOKEN?: string;
  GITHUB_APP_CLIENT_ID?: string;
  GITHUB_APP_CLIENT_SECRET?: string;
  GITHUB_APP_SLUG?: string;
  /** The app's numeric id + private key (PEM) let the Worker act as the app itself for anonymous previews. */
  GITHUB_APP_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  /** Which installation to use (account login). Defaults to the first one. */
  GITHUB_APP_INSTALL_ACCOUNT?: string;
  TOKEN_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

export const TERMS_VERSION = '2026-10-22';
