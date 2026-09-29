import type { RedirectRule } from '../types.js';

export function matchRedirect(
  pathname: string,
  rules: RedirectRule[]
): { destination: string; statusCode: number; to: string } | null {
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;

  for (const rule of rules) {
    if (rule.status && rule.status !== 'active') continue;

    const pattern = (rule.pattern || rule.from || '').trim();
    const destination = rule.destination || rule.to || '';
    const comparison = rule.comparison || rule.matchType || 'exact';
    const statusCode = rule.statusCode || 301;

    if (!pattern || !destination) continue;

    if (comparison === 'exact') {
      const normPattern = pattern.endsWith('/') && pattern !== '/' ? pattern.slice(0, -1) : pattern;
      if (normalizedPath === normPattern || pathname === pattern) {
        return { destination, statusCode, to: destination };
      }
    } else if (comparison === 'prefix') {
      const cleanPrefix = pattern.endsWith('/*') ? pattern.slice(0, -2) : pattern;
      if (pathname.startsWith(cleanPrefix)) {
        const remaining = pathname.slice(cleanPrefix.length);
        const target = destination.endsWith('/')
          ? `${destination}${remaining.replace(/^\//, '')}`
          : `${destination}${remaining}`;
        return { destination: target, statusCode, to: target };
      }
    } else if (comparison === 'regex') {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(pathname)) {
          const resolvedDest = pathname.replace(regex, destination);
          return { destination: resolvedDest, statusCode, to: resolvedDest };
        }
      } catch {
        // Ignore invalid regex
      }
    }
  }

  return null;
}

export function createRedirectResponse(destination: string, statusCode = 301): Response {
  return new Response(null, {
    status: statusCode,
    headers: {
      Location: destination,
      'Cache-Control': statusCode === 301 ? 'public, max-age=86400, s-maxage=604800' : 'no-cache',
    },
  });
}
