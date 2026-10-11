import { describe, it, expect } from 'vitest';
import {
	compararFormasDePago,
	dolaresPorUnidad
} from '../domain/usecases/compararFormasDePago';
import type { TasasAplicables } from '../domain/usecases/conversion';

const tasas: TasasAplicables = { bcvUsd: 100, bcvEur: 112, usdtPromedio: 125, personalizada: null };

describe('dolaresPorUnidad', () => {
	it('dólar 1:1, Bs a tasa USDT, euro a paridad BCV', () => {
		expect(dolaresPorUnidad('USD', tasas)).toBe(1);
		expect(dolaresPorUnidad('VES', tasas)).toBeCloseTo(1 / 125);
		expect(dolaresPorUnidad('EUR', tasas)).toBeCloseTo(1.12);
	});

	it('null si falta la tasa necesaria', () => {
		expect(dolaresPorUnidad('VES', { ...tasas, usdtPromedio: null })).toBeNull();
		expect(dolaresPorUnidad('EUR', { ...tasas, bcvEur: null })).toBeNull();
	});
});

describe('compararFormasDePago', () => {
	it('ordena de más barata a más cara (50 $ · 60 $ BCV en Bs · 45 €)', () => {
		const r = compararFormasDePago(
			[
				{ medio: 'USD', monto: 50 },
				{ medio: 'VES', monto: 60 * 100 },
				{ medio: 'EUR', monto: 45 }
			],
			tasas
		);
		expect(r?.opciones.map((o) => o.medio)).toEqual(['VES', 'USD', 'EUR']);
		// 6.000 Bs / 125 = 48 $ · 50 $ · 45 € × 1,12 = 50,40 $
		expect(r?.opciones[0].costoUsd).toBeCloseTo(48);
		expect(r?.opciones[0].sobrecostoUsd).toBe(0);
		expect(r?.opciones[2].sobrecostoUsd).toBeCloseTo(2.4);
		expect(r?.opciones[2].sobrecostoPct).toBeCloseTo((2.4 / 48) * 100);
		expect(r?.indiferente).toBe(false);
	});

	it('ignora precios vacíos o sin tasa y pide al menos dos', () => {
		expect(
			compararFormasDePago(
				[
					{ medio: 'USD', monto: 50 },
					{ medio: 'EUR', monto: Number.NaN }
				],
				tasas
			)
		).toBeNull();
		expect(
			compararFormasDePago(
				[
					{ medio: 'USD', monto: 50 },
					{ medio: 'VES', monto: 6000 }
				],
				{ ...tasas, usdtPromedio: null }
			)
		).toBeNull();
	});

	it('marca indiferente si las diferencias son mínimas', () => {
		const r = compararFormasDePago(
			[
				{ medio: 'USD', monto: 50 },
				{ medio: 'VES', monto: 50 * 125 + 10 }
			],
			tasas
		);
		expect(r?.indiferente).toBe(true);
	});
});
