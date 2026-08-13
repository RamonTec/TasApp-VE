import { describe, it, expect, beforeEach } from 'vitest';
import { HttpTasaRepository } from '../data/repositories/HttpTasaRepository';
import type { TasaBcv, TasaUsdt, TasaPersonalizada } from '../domain/entities/types';

describe('HttpTasaRepository', () => {
	let repo: HttpTasaRepository;

	beforeEach(() => {
		(globalThis as unknown as { window: { localStorage: Storage } }).window = {
			localStorage: new Map() as unknown as Storage
		};
		(globalThis as unknown as { localStorage: Storage }).localStorage = (
			globalThis as unknown as { window: { localStorage: Storage } }
		).window.localStorage;
		repo = new HttpTasaRepository();
	});

	const bcv: TasaBcv = {
		fuente: 'BCV',
		valor: 36.5,
		usd: 36.5,
		eur: 39.2,
		fecha: '2024-01-01T00:00:00.000Z'
	};

	const usdt: TasaUsdt = {
		fuente: 'USDT',
		valor: 41,
		compra: 40.5,
		venta: 41.5,
		promedio: 41,
		muestras: 10,
		fecha: '2024-01-01T00:00:00.000Z'
	};

	it('obtenerBcv llama a /api/tasas/bcv y parsea respuesta ok', async () => {
		const fetchMock = (url: string) => {
			expect(url).toBe('/api/tasas/bcv');
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ ok: true, data: bcv })
			});
		};
		(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const r = await repo.obtenerBcv();
		expect(r).toEqual(bcv);
	});

	it('obtenerUsdt llama a /api/tasas/usdt', async () => {
		const fetchMock = (url: string) => {
			expect(url).toBe('/api/tasas/usdt');
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ ok: true, data: usdt })
			});
		};
		(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const r = await repo.obtenerUsdt();
		expect(r).toEqual(usdt);
	});

	it('obtenerBcv lanza error si la respuesta HTTP falla', async () => {
		const fetchMock = () =>
			Promise.resolve({
				ok: false,
				status: 503,
				json: async () => ({ ok: false, error: 'BCV caído' })
			});
		(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		await expect(repo.obtenerBcv()).rejects.toThrowError(/503/);
	});

	it('obtenerBcv lanza error si la respuesta JSON tiene ok=false', async () => {
		const fetchMock = () =>
			Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ ok: false, error: 'Sin datos' })
			});
		(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		await expect(repo.obtenerBcv()).rejects.toThrowError(/Sin datos/);
	});

	it('guardar y recuperar personalizada desde localStorage', () => {
		const r1 = repo.guardarPersonalizada(38, 'Mi tasa');
		expect(r1.fuente).toBe('PERSONALIZADA');
		expect(r1.valor).toBe(38);
		expect(repo.obtenerPersonalizada()).not.toBeNull();
		const recovered = repo.obtenerPersonalizada() as TasaPersonalizada;
		expect(recovered.etiqueta).toBe('Mi tasa');
	});

	it('limpiarPersonalizada remueve del storage', () => {
		repo.guardarPersonalizada(38, 'X');
		repo.limpiarPersonalizada();
		expect(repo.obtenerPersonalizada()).toBeNull();
	});

	it('guardarPersonalizada usa "Personalizada" si etiqueta está vacía', () => {
		const r = repo.guardarPersonalizada(38, '   ');
		expect(r.etiqueta).toBe('Personalizada');
	});
});
