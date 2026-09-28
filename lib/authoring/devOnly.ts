/**
 * Authoring endpoints mutate the working tree, so they must not exist outside
 * development. This is the server-side half of that guarantee; the client half
 * is that the UI is compiled out. Neither is sufficient alone — hiding a button
 * does not protect a route.
 *
 * Plan B replaces this with an auth check when editing goes to the live site.
 */
export function devOnlyGuard(): Response | null {
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 });
  }
  return null;
}
