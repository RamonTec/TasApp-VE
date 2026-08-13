/// <reference types="@sveltejs/kit" />
/// <reference types="vite/client" />

const CACHE_VERSION = 'tasapp-ve-v1';
const CACHE_ASSETS = `${CACHE_VERSION}-assets`;
const CACHE_PAGES = `${CACHE_VERSION}-pages`;
const CACHE_API = `${CACHE_VERSION}-api`;

const PRECACHE_URLS = ['/', '/conversor', '/items', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_ASSETS);
			await cache.addAll(PRECACHE_URLS).catch(() => {
				/* fallar silenciosamente si alguno no está disponible */
			});
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			const stale = keys.filter((k) => !k.startsWith(CACHE_VERSION));
			await Promise.all(stale.map((k) => caches.delete(k)));
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	const url = new URL(req.url);

	if (req.method !== 'GET') return;

	if (url.origin !== self.location.origin) return;

	if (url.pathname.startsWith('/api/')) {
		event.respondWith(estrategiaNetworkFirst(req, CACHE_API, 5));
		return;
	}

	if (req.mode === 'navigate') {
		event.respondWith(estrategiaNetworkFirst(req, CACHE_PAGES, 50));
		return;
	}

	const esAsset = ['style', 'script', 'image', 'font'].includes(req.destination);
	if (esAsset) {
		event.respondWith(estrategiaCacheFirst(req, CACHE_ASSETS));
	}
});

async function estrategiaCacheFirst(req: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(req);
	if (cached) return cached;
	try {
		const res = await fetch(req);
		if (res.ok) cache.put(req, res.clone());
		return res;
	} catch {
		return cached ?? new Response('Offline', { status: 503 });
	}
}

async function estrategiaNetworkFirst(
	req: Request,
	cacheName: string,
	maxEntries: number
): Promise<Response> {
	const cache = await caches.open(cacheName);
	try {
		const res = await fetch(req);
		if (res.ok) {
			await limpiarCache(cache, maxEntries);
			await cache.put(req, res.clone());
		}
		return res;
	} catch {
		const cached = await cache.match(req);
		if (cached) return cached;
		return new Response('Sin conexión y sin caché', {
			status: 503,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}
}

async function limpiarCache(cache: Cache, maxEntries: number): Promise<void> {
	const keys = await cache.keys();
	if (keys.length <= maxEntries) return;
	const exceso = keys.slice(0, keys.length - maxEntries);
	await Promise.all(exceso.map((k) => cache.delete(k)));
}