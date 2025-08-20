/* global workbox */
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';

// Precache build assets
precacheAndRoute(self.__WB_MANIFEST || []);

// App shell
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages', networkTimeoutSeconds: 3 })
);

// Static assets
registerRoute(
  ({ request }) => ['style', 'script', 'image'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'static-assets' })
);

// API: products list/detail
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/products'),
  new StaleWhileRevalidate({ cacheName: 'api-products' })
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});


