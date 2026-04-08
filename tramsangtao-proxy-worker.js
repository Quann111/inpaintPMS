const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-max-age': '86400',
};

const addCors = (headers) => {
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return headers;
};

const isAllowedProxyTarget = (u) => {
  const host = u.hostname.toLowerCase();
  if (host === 'api.tramsangtao.com') return true;
  if (host === 'cdn.tramsangtao.com') return true;
  if (host.endsWith('.tramsangtao.com')) return true;
  if (host === 'storage.googleapis.com') return true;
  return false;
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: addCors(new Headers()) });
    }

    const url = new URL(request.url);

    if (url.pathname === '/proxy') {
      const target = url.searchParams.get('url') || '';
      let targetUrl;
      try {
        targetUrl = new URL(target);
      } catch {
        return new Response('Invalid url', { status: 400, headers: addCors(new Headers()) });
      }

      if (targetUrl.protocol !== 'https:' || !isAllowedProxyTarget(targetUrl)) {
        return new Response('Blocked', { status: 403, headers: addCors(new Headers()) });
      }

      const upstream = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
      });

      const headers = new Headers(upstream.headers);
      headers.delete('set-cookie');
      addCors(headers);
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    if (url.pathname.startsWith('/v1/')) {
      const upstreamUrl = new URL(`https://api.tramsangtao.com${url.pathname}${url.search}`);
      const upstream = await fetch(upstreamUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      });

      const headers = new Headers(upstream.headers);
      headers.delete('set-cookie');
      addCors(headers);
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    return new Response('Not found', { status: 404, headers: addCors(new Headers()) });
  },
};
