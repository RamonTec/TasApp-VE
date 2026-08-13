import { describe, it, expect } from 'vitest';
import {
	MultiFuenteTasaRepository,
	MultiFuenteError
} from '../server/repositories/MultiFuenteTasaRepository';
import type { TasaBcv, TasaUsdt, TasaPersonalizada } from '../domain/entities/types';

const bcv: TasaBcv = {
	fuente: 'BCV',
	valor: 36.5,
	usd: 36.5,
	eur: 0,
	fuenteUsada: 've.dolarapi.com',
	fecha: '2024-01-01T00:00:00.000Z'
};

const usdt: TasaUsdt = {
	fuente: 'USDT',
	valor: 41,
	compra: 40.5,
	venta: 41.5,
	promedio: 41,
	muestras: 1,
	fecha: '2024-01-01T00:00:00.000Z'
};

const personalizada: TasaPersonalizada = {
	fuente: 'PERSONALIZADA',
	valor: 38,
	etiqueta: 'Manual',
	fecha: '2024-01-01T00:00:00.000Z'
};

function wait(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

describe('MultiFuenteTasaRepository', () => {
	it('usa VeDolarApi como primera fuente para BCV', async () => {
		const repo = new MultiFuenteTasaRepository(
			() => null,
			{ timeoutMsPorFuente: 1000 },
			async () => ({
				bcv: { ...bcv, fuenteUsada: 've.dolarapi.com' },
				usdt: null
			}),
			async () => {
				throw new Error('BCV directo no debió invocarse');
			},
			async () => {
				throw new Error('Binance no debió invocarse');
			}
		);
		const r = await repo.obtenerBcv();
		expect(r.fuenteUsada).toBe('ve.dolarapi.com');
	});

	it('cae a BCV directo si VeDolarApi no tiene dato BCV', async () => {
		const repo = new MultiFuenteTasaRepository(
			() => null,
			{ timeoutMsPorFuente: 1000 },
			async () => ({ bcv: null, usdt: null }),
			async () => bcv,
			async () => {
				throw new Error('Binance no debió invocarse');
			}
		);
		const r = await repo.obtenerBcv();
		expect(r.usd).toBe(36.5);
		expect(r.fuenteUsada).toBe('bcv.org.ve');
	});

	it('marca Binance como fuenteUsada cuando aplica', async () => {
		const repo = new MultiFuenteTasaRepository(
			() => null,
			{ timeoutMsPorFuente: 1000 },
			async () => ({ bcv, usdt: null }),
			async () => bcv,
			async () => usdt
		);
		const r = await repo.obtenerUsdt();
		expect(r.promedio).toBe(41);
		expect(r.fuenteUsada).toBe('Binance P2P');
	});

	it('lanza MultiFuenteError cuando todas las fuentes fallan y no hay personalizada', async () => {
		const repo = new MultiFuenteTasaRepository(
			() => null,
			{ timeoutMsPorFuente: 500 },
			async () => {
				throw new Error('VeDolarApi caído');
			},
			async () => {
				throw new Error('BCV caído');
			},
			async () => {
				throw new Error('Binance caído');
			}
		);

		await expect(repo.obtenerBcv()).rejects.toBeInstanceOf(MultiFuenteError);
		try {
			await repo.obtenerBcv();
		} catch (e) {
			expect((e as MultiFuenteError).intentos.length).toBe(2);
		}
	});

	it('lanza MultiFuenteError con mensaje "tasa manual" si hay personalizada', async () => {
		const repo = new MultiFuenteTasaRepository(
			() => personalizada,
			{ timeoutMsPorFuente: 500 },
			async () => {
				throw new Error('VeDolarApi caído');
			},
			async () => {
				throw new Error('BCV caído');
			},
			async () => {
				throw new Error('Binance caído');
			}
		);

		await expect(repo.obtenerBcv()).rejects.toThrow(/manual/i);
	});

	it('respeta timeout por fuente (no espera eternamente)', async () => {
		const repo = new MultiFuenteTasaRepository(
			() => null,
			{ timeoutMsPorFuente: 100 },
			async () => {
				await wait(5000);
				return { bcv, usdt: null };
			},
			async () => bcv,
			async () => usdt
		);
		const r = await repo.obtenerBcv();
		expect(r.usd).toBe(36.5);
	}, 10000);

	it('respeta habilitarBcv=false', async () => {
		const repo = new MultiFuenteTasaRepository(
			() => null,
			{ timeoutMsPorFuente: 1000, habilitarBcv: false },
			async () => {
				throw new Error('VeDolarApi forzado a fallar');
			},
			async () => {
				throw new Error('No debió invocarse BCV');
			},
			async () => usdt
		);

		await expect(repo.obtenerBcv()).rejects.toBeInstanceOf(MultiFuenteError);
	});

	it('obtenerPersonalizada retorna del getter inyectado', () => {
		const repo = new MultiFuenteTasaRepository(
			() => personalizada,
			{},
			async () => ({ bcv: null, usdt: null }),
			async () => bcv,
			async () => usdt
		);
		expect(repo.obtenerPersonalizada()).toBe(personalizada);
	});

	it('guardarPersonalizada lanza error (responsabilidad delega)', () => {
		const repo = new MultiFuenteTasaRepository(
			() => null,
			{},
			async () => ({ bcv: null, usdt: null }),
			async () => bcv,
			async () => usdt
		);
		expect(() => repo.guardarPersonalizada(38, 'x')).toThrow(/delega/i);
	});
});
