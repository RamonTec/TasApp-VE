import { describe, it, expect } from 'vitest';
import {
	calcularConversion,
	calcularDiferenciaEntreFuentes,
	calcularDiferenciaPorcentual,
	calcularTotalesItems,
	convertirItemAVes,
	tasasAplicables
} from '../domain/usecases/conversion';
import { crearItem } from '../domain/entities/item';
import type { TasaBcv, TasaPersonalizada, TasaUsdt } from '../domain/entities/types';

const bcv: TasaBcv = {
	fuente: 'BCV',
	valor: 36.5,
	usd: 36.5,
	eur: 39.2,
	fecha: '2024-01-01T00:00:00.000Z'
};

const usdt: TasaUsdt = {
	fuente: 'USDT',
	valor: 41.0,
	compra: 40.5,
	venta: 41.5,
	promedio: 41.0,
	muestras: 10,
	fecha: '2024-01-01T00:00:00.000Z'
};

const personalizada: TasaPersonalizada = {
	fuente: 'PERSONALIZADA',
	valor: 38.0,
	etiqueta: 'Mi tasa',
	fecha: '2024-01-01T00:00:00.000Z'
};

describe('tasasAplicables', () => {
	it('normaliza desde TasasDisponibles', () => {
		const out = tasasAplicables({ bcv, usdt, personalizada });
		expect(out.bcvUsd).toBe(36.5);
		expect(out.bcvEur).toBe(39.2);
		expect(out.usdtPromedio).toBe(41.0);
		expect(out.personalizada).toBe(38.0);
	});

	it('tolera valores nulos', () => {
		const out = tasasAplicables({ bcv: null, usdt: null, personalizada: null });
		expect(out.bcvUsd).toBeNull();
		expect(out.bcvEur).toBeNull();
		expect(out.usdtPromedio).toBeNull();
		expect(out.personalizada).toBeNull();
	});
});

describe('calcularConversion', () => {
	const tasas = tasasAplicables({ bcv, usdt, personalizada });

	it('USD -> VES usando BCV', () => {
		const r = calcularConversion({ monto: 10, desde: 'USD', hacia: 'VES', tasas, fuenteAplicada: 'BCV' });
		expect(r).not.toBeNull();
		expect(r!.total).toBeCloseTo(365, 5);
		expect(r!.tasaAplicada).toBe(36.5);
	});

	it('VES -> USD usando BCV', () => {
		const r = calcularConversion({ monto: 365, desde: 'VES', hacia: 'USD', tasas });
		expect(r!.total).toBeCloseTo(10, 5);
	});

	it('USDT -> VES usando USDT', () => {
		const r = calcularConversion({ monto: 10, desde: 'USDT', hacia: 'VES', tasas, fuenteAplicada: 'USDT' });
		expect(r!.total).toBeCloseTo(410, 5);
		expect(r!.tasaAplicada).toBe(41.0);
	});

	it('USD -> USDT con BCV usa refVes BCV (tasa 1)', () => {
		const r = calcularConversion({ monto: 100, desde: 'USD', hacia: 'USDT', tasas });
		expect(r!.total).toBeCloseTo(100, 5);
	});

	it('USD -> USDT con USDT usa refVes USDT (tasa 1)', () => {
		const r = calcularConversion({ monto: 100, desde: 'USD', hacia: 'USDT', tasas, fuenteAplicada: 'USDT' });
		expect(r!.total).toBeCloseTo(100, 5);
	});

	it('USD -> VES con USDT usa tasa USDT (no BCV)', () => {
		const r = calcularConversion({ monto: 10, desde: 'USD', hacia: 'VES', tasas, fuenteAplicada: 'USDT' });
		expect(r!.total).toBeCloseTo(410, 5);
	});

	it('USD -> VES con PERSONALIZADA usa tasa personalizada', () => {
		const r = calcularConversion({ monto: 10, desde: 'USD', hacia: 'VES', tasas, fuenteAplicada: 'PERSONALIZADA' });
		expect(r!.total).toBeCloseTo(380, 5);
	});

	it('misma moneda devuelve tasa 1', () => {
		const r = calcularConversion({ monto: 100, desde: 'USD', hacia: 'USD', tasas });
		expect(r!.total).toBe(100);
		expect(r!.tasaAplicada).toBe(1);
	});

	it('rechaza monto negativo', () => {
		const r = calcularConversion({ monto: -10, desde: 'USD', hacia: 'VES', tasas });
		expect(r).toBeNull();
	});

	it('devuelve null si tasa origen es 0', () => {
		const r = calcularConversion({
			monto: 10,
			desde: 'EUR',
			hacia: 'USD',
			tasas: { ...tasas, bcvEur: 0 }
		});
		expect(r).toBeNull();
	});
});

describe('calcularDiferenciaPorcentual', () => {
	it('caso positivo', () => {
		expect(calcularDiferenciaPorcentual(100, 110)).toBeCloseTo(10, 5);
	});
	it('caso negativo', () => {
		expect(calcularDiferenciaPorcentual(100, 90)).toBeCloseTo(-10, 5);
	});
	it('cero', () => {
		expect(calcularDiferenciaPorcentual(100, 100)).toBe(0);
	});
	it('rechaza base cero', () => {
		expect(calcularDiferenciaPorcentual(0, 10)).toBe(0);
	});
});

describe('calcularDiferenciaEntreFuentes', () => {
	it('detecta USDT por encima', () => {
		const r = calcularDiferenciaEntreFuentes(36.5, 41.0);
		expect(r).not.toBeNull();
		expect(r!.absoluta).toBeCloseTo(4.5, 5);
		expect(r!.mayor).toBe('USDT');
		expect(r!.menor).toBe('BCV');
		expect(r!.porcentual).toBeGreaterThan(0);
	});

	it('detecta BCV por encima', () => {
		const r = calcularDiferenciaEntreFuentes(41.0, 36.5);
		expect(r!.mayor).toBe('BCV');
	});

	it('devuelve null si alguna tasa es null', () => {
		expect(calcularDiferenciaEntreFuentes(null, 41)).toBeNull();
		expect(calcularDiferenciaEntreFuentes(36, null)).toBeNull();
	});

	it('devuelve null si alguna tasa es <= 0', () => {
		expect(calcularDiferenciaEntreFuentes(0, 41)).toBeNull();
		expect(calcularDiferenciaEntreFuentes(36, -1)).toBeNull();
	});
});

describe('convertirItemAVes', () => {
	const tasas = tasasAplicables({ bcv, usdt, personalizada });

	it('convierte item USD a VES con BCV', () => {
		const item = crearItem({ nombre: 'Café', precio: 5, cantidad: 2, moneda: 'USD' });
		expect(convertirItemAVes(item, tasas)).toBeCloseTo(10 * 36.5, 5);
	});

	it('item en VES se mantiene', () => {
		const item = crearItem({ nombre: 'X', precio: 100, cantidad: 1, moneda: 'VES' });
		expect(convertirItemAVes(item, tasas)).toBeCloseTo(100, 5);
	});

	it('item USDT con BCV usa tasa BCV (no USDT)', () => {
		const item = crearItem({ nombre: 'X', precio: 10, cantidad: 1, moneda: 'USDT' });
		expect(convertirItemAVes(item, tasas)).toBeCloseTo(10 * 36.5, 5);
	});

	it('item USDT con ref USDT usa tasa USDT', () => {
		const item = crearItem({ nombre: 'X', precio: 10, cantidad: 1, moneda: 'USDT' });
		expect(convertirItemAVes(item, tasas, 'USDT')).toBeCloseTo(10 * 41.0, 5);
	});
});

describe('calcularTotalesItems', () => {
	const tasas = tasasAplicables({ bcv, usdt, personalizada });

	it('suma items en USD a USD y VES', () => {
		const items = [
			crearItem({ nombre: 'A', precio: 10, cantidad: 2, moneda: 'USD' }),
			crearItem({ nombre: 'B', precio: 5, cantidad: 3, moneda: 'USD' })
		];
		const t = calcularTotalesItems({ items, tasas, tasaActiva: 'BCV' });
		expect(t.totalUsd).toBeCloseTo(35, 5);
		expect(t.totalVes).toBeCloseTo(35 * 36.5, 5);
		expect(t.cantidadItems).toBe(5);
	});

	it('mezcla monedas: totalVes usa tasaActiva BCV para todo', () => {
		const items = [
			crearItem({ nombre: 'A', precio: 10, cantidad: 1, moneda: 'USD' }),
			crearItem({ nombre: 'B', precio: 50, cantidad: 1, moneda: 'USDT' })
		];
		const t = calcularTotalesItems({ items, tasas, tasaActiva: 'BCV' });
		expect(t.totalUsd).toBeCloseTo(10, 3);
		expect(t.totalUsdt).toBeCloseTo(50, 3);
		expect(t.totalVes).toBeCloseTo(10 * 36.5 + 50 * 36.5, 3);
	});

	it('mezcla monedas: totalVes con tasaActiva USDT usa 41 para todo', () => {
		const items = [
			crearItem({ nombre: 'A', precio: 10, cantidad: 1, moneda: 'USD' }),
			crearItem({ nombre: 'B', precio: 50, cantidad: 1, moneda: 'USDT' })
		];
		const t = calcularTotalesItems({ items, tasas, tasaActiva: 'USDT' });
		expect(t.totalVes).toBeCloseTo(10 * 41.0 + 50 * 41.0, 3);
	});

	it('cuenta items sumando cantidades', () => {
		const items = [
			crearItem({ nombre: 'A', precio: 1, cantidad: 4, moneda: 'USD' }),
			crearItem({ nombre: 'B', precio: 1, cantidad: 6, moneda: 'VES' })
		];
		const t = calcularTotalesItems({ items, tasas, tasaActiva: 'BCV' });
		expect(t.cantidadItems).toBe(10);
	});
});
