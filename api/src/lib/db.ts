import { neon } from '@neondatabase/serverless';

export type Sql = ReturnType<typeof neon>;

export function db(url: string): Sql {
  return neon(url);
}
