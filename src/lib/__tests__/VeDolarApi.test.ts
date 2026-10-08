import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { obtenerTasasVeDolarApi, obtenerEurVeDolarApi } from '../server/sources/VeDolarApi';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

function makeResponse(body: unknown, status = 200, contentType = 'application/json'): Response {
	const headers = new Headers({ 'content-type': contentType });
	const init: ResponseInit = {
		status,
		statusText: 'OK',
		headers
	};
	return new Response(typeof body === 'string' ? body : JSON.stringify(body), init);
}

const originalFetch = globalThis.fetch;

describe('VeDolarApi', () => {
	beforeEach(() => {
		(globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
	});

	afterEach(() => {
		(globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
	});

	function mockFetch(impl: (url: string) => Promise<Response>) {
		(globalThis as unknown as { fetch: typeof fetch }).fetch = ((
			url: string | URL | Request,
			_init?: RequestInit
		) => impl(typeof url === 'string' ? url : url.toString())) as typeof fetch;
	}

	it('obtiene BCV oficial por campo fuente=oficial', async () => {
		const urls: string[] = [];
		mockFetch((url) => {
			urls.push(url);
			if (url.includes('/euros')) return Promise.resolve(makeResponse([]));
			return Promise.resolve(
				makeResponse([
					{ fuente: 'oficial', nombre: 'Dólar', promedio: 36.5, compra: 36.4, venta: 36.6 }
				])
			);
		});

		const r = await obtenerTasasVeDolarApi();
		expect(urls).toContain('https://ve.dolarapi.com/v1/dolares');
		expect(r.bcv).not.toBeNull();
		expect(r.bcv!.usd).toBe(36.5);
		expect(r.bcv!.eur).toBe(0);
		expect(r.bcv!.fuenteUsada).toBe('ve.dolarapi.com');
	});

	it('obtiene USDT (paralelo) por campo fuente=paralelo', async () => {
		mockFetch((url) => {
			if (url.includes('/euros')) {
				return Promise.resolve(makeResponse([]));
			}
			return Promise.resolve(
				makeResponse([
					{ fuente: 'oficial', nombre: 'Dólar', promedio: 36.5 },
					{ fuente: 'paralelo', nombre: 'Paralelo', promedio: 41.0 }
				])
			);
		});

		const r = await obtenerTasasVeDolarApi();
		expect(r.bcv).not.toBeNull();
		expect(r.usdt).not.toBeNull();
		expect(r.usdt!.promedio).toBe(41.0);
	});

	it('ignora entradas sin campo fuente conocido', async () => {
		mockFetch(() =>
			Promise.resolve(
				makeResponse([
					{ fuente: 'desconocida', nombre: 'Mystery', promedio: 100 },
					{ fuente: 'oficial', promedio: 36.5 }
				])
			)
		);

		const r = await obtenerTasasVeDolarApi();
		expect(r.bcv!.usd).toBe(36.5);
		expect(r.usdt).toBeNull();
	});

	it('maneja compra:null/venta:null reales de la API', async () => {
		mockFetch((url) => {
			if (url.includes('/euros')) {
				return Promise.resolve(
					makeResponse([{ moneda: 'EUR', fuente: 'oficial', compra: null, venta: null, promedio: 860.1 }])
				);
			}
			return Promise.resolve(
				makeResponse([
					{ moneda: 'USD', fuente: 'oficial', nombre: 'Dólar', compra: null, venta: null, promedio: 757.5406 },
					{ moneda: 'USD', fuente: 'paralelo', nombre: 'Paralelo', compra: null, venta: null, promedio: 857.45 }
				])
			);
		});

		const r = await obtenerTasasVeDolarApi();
		expect(r.bcv!.usd).toBe(757.5406);
		expect(r.bcv!.eur).toBe(860.1);
		expect(r.usdt!.promedio).toBe(857.45);
		expect(r.usdt!.compra).toBe(857.45);
		expect(r.usdt!.venta).toBe(857.45);
	});

	it('parsea respuesta real actual de ve.dolarapi.com', async () => {
		const leer = (f: string) => JSON.parse(readFileSync(resolve(AQUI, './fixtures', f), 'utf8'));
		mockFetch((url) =>
			Promise.resolve(
				makeResponse(
					leer(url.includes('/euros') ? 've-dolarapi-euros.json' : 've-dolarapi-dolares.json')
				)
			)
		);

		const r = await obtenerTasasVeDolarApi();
		expect(r.bcv).not.toBeNull();
		expect(r.bcv!.eur).toBeGreaterThan(r.bcv!.usd);
		expect(r.usdt!.fuenteUsada).toBe('ve.dolarapi.com (paralelo)');
		expect(r.usdt).not.toBeNull();
		expect(r.bcv!.usd).toBeGreaterThan(100);
		expect(r.usdt!.promedio).toBeGreaterThan(r.bcv!.usd);
	});

	it('lanza error si HTTP falla', async () => {
		mockFetch(() => Promise.resolve(makeResponse({}, 500)));

		await expect(obtenerTasasVeDolarApi()).rejects.toThrow();
	});

	it('obtenerEurVeDolarApi toma el euro oficial de la lista', async () => {
		mockFetch((url) => {
			expect(url).toBe('https://ve.dolarapi.com/v1/euros');
			return Promise.resolve(
				makeResponse([
					{ moneda: 'EUR', fuente: 'oficial', promedio: 39.2 },
					{ moneda: 'EUR', fuente: 'paralelo', promedio: 45 }
				])
			);
		});

		const eur = await obtenerEurVeDolarApi();
		expect(eur).toBe(39.2);
	});

	it('el BCV sigue disponible si /euros falla', async () => {
		mockFetch((url) =>
			Promise.resolve(
				url.includes('/euros')
					? makeResponse({}, 500)
					: makeResponse([{ fuente: 'oficial', promedio: 36.5 }])
			)
		);

		const r = await obtenerTasasVeDolarApi();
		expect(r.bcv!.usd).toBe(36.5);
		expect(r.bcv!.eur).toBe(0);
	});

	it('obtenerEurVeDolarApi retorna null si falla', async () => {
		mockFetch(() => Promise.resolve(makeResponse({}, 500)));

		const eur = await obtenerEurVeDolarApi();
		expect(eur).toBeNull();
	});

	it('devuelve null si la respuesta no tiene entradas válidas', async () => {
		mockFetch(() => Promise.resolve(makeResponse([])));

		const r = await obtenerTasasVeDolarApi();
		expect(r.bcv).toBeNull();
		expect(r.usdt).toBeNull();
	});

	it('usa venta si promedio falta', async () => {
		mockFetch(() =>
			Promise.resolve(
				makeResponse([{ fuente: 'oficial', nombre: 'Otro', venta: 36.7 }])
			)
		);

		const r = await obtenerTasasVeDolarApi();
		expect(r.bcv!.usd).toBe(36.7);
	});
});
