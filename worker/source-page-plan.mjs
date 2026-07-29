function cleanPathSegment(value) {
  return decodeURIComponent(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function normaliseSourceUrl(value) {
  const url = new URL(value);
  url.hash = '';
  url.search = '';
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString();
}

export function sourcePagePlan(selectedPages) {
  const usedRoutes = new Set();
  return selectedPages
    .filter((page) => typeof page?.url === 'string' && page.url)
    .map((page, index) => {
      const sourceUrl = normaliseSourceUrl(page.url);
      const pathname = new URL(sourceUrl).pathname;
      const manifestRoutePath =
        typeof page.routePath === 'string' &&
        /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/.test(page.routePath)
          ? page.routePath
          : undefined;
      const sourceSegments = pathname
        .split('/')
        .filter(Boolean)
        .map(cleanPathSegment)
        .filter(Boolean);
      const baseSegments = manifestRoutePath
        ? manifestRoutePath.split('/').filter(Boolean)
        : sourceSegments.length
          ? sourceSegments
          : [];
      let routeSegments = baseSegments;
      let routeKey = routeSegments.join('/');
      let duplicate = 2;
      while (usedRoutes.has(routeKey)) {
        const lastSegment = baseSegments.at(-1) || 'home';
        routeSegments = [...baseSegments.slice(0, -1), `${lastSegment}-${duplicate}`];
        routeKey = routeSegments.join('/');
        duplicate += 1;
      }
      usedRoutes.add(routeKey);
      const routePath = routeSegments.length ? `/${routeSegments.join('/')}` : '/';
      const publicPath = routePath === '/' ? '/' : `${routePath}/`;
      const outputPath = routeSegments.length
        ? `${routeSegments.join('/')}/index.html`
        : 'index.html';
      const sourcePath = routeSegments.length
        ? `app/${routeSegments.join('/')}/page.tsx`
        : 'app/page.tsx';
      return {
        index: index + 1,
        sourceUrl,
        title: typeof page.title === 'string' ? page.title : '',
        pageType: typeof page.pageType === 'string' ? page.pageType : '',
        routePath,
        publicPath,
        outputPath,
        sourcePath,
      };
    });
}
