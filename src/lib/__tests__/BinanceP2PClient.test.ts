import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	URL_BINANCE_P2P,
	construirTasaUsdt,
	obtenerUsdtP2P,
	preciosValidos,
	type RespuestaBinance
} from '../server/sources/BinanceP2PClient';

const AQUI = dirname(fileURLToPath(import.meta.url));
const leer = (f: string): RespuestaBinance =>
	JSON.parse(readFileSync(resolve(AQUI, './fixtures', f), 'utf8'));

const originalFetch = globalThis.fetch;

function mockFetch(impl: (url: string, body: { tradeType: string }) => Response) {
	(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (
		url: string | URL | Request,
		init?: RequestInit
	) => impl(String(url), JSON.parse(String(init?.body ?? '{}')))) as typeof fetch;
}

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('BinanceP2PClient', () => {
	afterEach(() => {
		(globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
	});

	it('usa el endpoint adv/search', () => {
		expect(URL_BINANCE_P2P).toBe('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search');
	});

	it('parsea precios que llegan como string (respuesta real)', () => {
		const precios = preciosValidos(leer('binance-p2p-buy.json'));
		expect(precios.length).toBeGreaterThanOrEqual(3);
		for (const p of precios) {
			expect(Number.isFinite(p)).toBe(true);
			expect(p).toBeGreaterThan(100);
		}
	});

	it('descarta anuncios con muy poco USDT disponible', () => {
		const precios = preciosValidos({
			success: true,
			data: [
				{ adv: { price: '1.0', tradableQuantity: '0.5' } },
				{ adv: { price: '100', tradableQuantity: '50' } },
				{ adv: { price: '101', tradableQuantity: '50' } },
				{ adv: { price: '102', tradableQuantity: '50' } }
			]
		});
		expect(precios).toEqual([100, 101, 102]);
	});

	it('lanza error si la respuesta no es exitosa', () => {
		expect(() => preciosValidos({ success: false, data: null })).toThrow(/inválida/);
	});

	it('construye compra, venta y promedio con medianas por lado', () => {
		const t = construirTasaUsdt([100, 101, 200], [98, 99, 1], '2026-01-01T00:00:00.000Z');
		expect(t.compra).toBe(101);
		expect(t.venta).toBe(98);
		expect(t.promedio).toBe(99.5);
		expect(t.valor).toBe(99.5);
		expect(t.muestras).toBe(6);
		expect(t.fuenteUsada).toBe('Binance P2P');
	});

	it('funciona con un solo lado disponible', () => {
		const t = construirTasaUsdt([100], []);
		expect(t.compra).toBe(100);
		expect(t.venta).toBe(100);
	});

	it('lanza error si no hay precios en ningún lado', () => {
		expect(() => construirTasaUsdt([], [])).toThrow(/anuncios/);
	});

	it('consulta ambos lados y usa los fixtures reales', async () => {
		const lados: string[] = [];
		mockFetch((url, body) => {
			expect(url).toBe(URL_BINANCE_P2P);
			lados.push(body.tradeType);
			return json(leer(body.tradeType === 'BUY' ? 'binance-p2p-buy.json' : 'binance-p2p-sell.json'));
		});

		const t = await obtenerUsdtP2P();
		expect(lados.sort()).toEqual(['BUY', 'SELL']);
		expect(t.compra).toBeGreaterThan(100);
		expect(t.venta).toBeGreaterThan(100);
		expect(t.promedio).toBeCloseTo((t.compra + t.venta) / 2);
	});

	it('si un lado falla usa el otro', async () => {
		mockFetch((_url, body) =>
			body.tradeType === 'BUY' ? json(leer('binance-p2p-buy.json')) : json({}, 500)
		);
		const t = await obtenerUsdtP2P();
		expect(t.compra).toBe(t.venta);
	});

	it('lanza si ambos lados fallan', async () => {
		mockFetch(() => json({}, 500));
		await expect(obtenerUsdtP2P()).rejects.toThrow();
	});
});
