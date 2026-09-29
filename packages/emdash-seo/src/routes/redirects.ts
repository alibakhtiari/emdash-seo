import type { RedirectRule } from '../types.js';

export function matchRedirect(
  pathname: string,
  rules: RedirectRule[]
): { destination: string; statusCode: number } | null {
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;

  for (const rule of rules) {
    if (rule.status !== 'active') continue;

    const pattern = rule.pattern.trim();

    if (rule.comparison === 'exact') {
      const normPattern = pattern.endsWith('/') && pattern !== '/' ? pattern.slice(0, -1) : pattern;
      if (normalizedPath === normPattern || pathname === pattern) {
        return { destination: rule.destination, statusCode: rule.statusCode };
      }
    } else if (rule.comparison === 'prefix') {
      if (pathname.startsWith(pattern)) {
        const remaining = pathname.slice(pattern.length);
        const target = rule.destination.endsWith('/')
          ? `${rule.destination}${remaining.replace(/^\//, '')}`
          : `${rule.destination}${remaining}`;
        return { destination: target, statusCode: rule.statusCode };
      }
    } else if (rule.comparison === 'regex') {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(pathname)) {
          const destination = pathname.replace(regex, rule.destination);
          return { destination, statusCode: rule.statusCode };
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
