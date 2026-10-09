import { describe, it, expect } from 'vitest';
import {
	equivalencias,
	recomendarPago,
	totalCompraEnBs
} from '../domain/usecases/calculadoraCompras';
import type { TasasAplicables } from '../domain/usecases/conversion';
import { crearItem } from '../domain/entities/item';

const tasas: TasasAplicables = { bcvUsd: 100, bcvEur: 120, usdtPromedio: 125, personalizada: null };

const item = (precio: number, moneda: 'USD' | 'EUR' | 'USDT' | 'VES', cantidad = 1) =>
	crearItem({ nombre: 'X', precio, cantidad, moneda });

describe('totalCompraEnBs', () => {
	it('suma dólares y euros a tasa BCV, Bs tal cual y USDT a tasa USDT', () => {
		const items = [item(2, 'USD', 3), item(1, 'EUR'), item(50, 'VES'), item(1, 'USDT')];
		expect(totalCompraEnBs(items, tasas)).toBeCloseTo(600 + 120 + 50 + 125);
	});

	it('lista vacía es 0', () => {
		expect(totalCompraEnBs([], tasas)).toBe(0);
	});

	it('devuelve null si falta la tasa que necesita un item', () => {
		expect(totalCompraEnBs([item(1, 'EUR')], { ...tasas, bcvEur: null })).toBeNull();
	});
});

describe('equivalencias', () => {
	it('expresa el total en $ BCV, € BCV y USDT', () => {
		const e = equivalencias(1000, tasas);
		expect(e.bs).toBe(1000);
		expect(e.dolarBcv).toBeCloseTo(10);
		expect(e.euroBcv).toBeCloseTo(1000 / 120);
		expect(e.usdt).toBeCloseTo(8);
	});

	it('deja en null las tasas que faltan', () => {
		expect(equivalencias(1000, { ...tasas, usdtPromedio: null }).usdt).toBeNull();
	});
});

describe('recomendarPago', () => {
	it('con USDT conviene cambiar a Bs cuando el USDT está por encima del BCV', () => {
		const r = recomendarPago('USDT', 1000, tasas)!;
		expect(r.mejor).toEqual({ forma: 'BS', costo: 8 });
		expect(r.alternativa).toEqual({ forma: 'DIRECTO', costo: 10 });
		expect(r.ahorro).toBeCloseTo(2);
		expect(r.ahorroPct).toBeCloseTo(20);
	});

	it('con divisas conviene pagar directo si el USDT está por debajo del BCV', () => {
		const r = recomendarPago('DIVISAS', 1000, { ...tasas, usdtPromedio: 90 })!;
		expect(r.mejor.forma).toBe('DIRECTO');
		expect(r.mejor.costo).toBeCloseTo(10);
	});

	it('con Bs conviene pagar en Bs antes que comprar divisas', () => {
		const r = recomendarPago('BS', 1000, tasas)!;
		expect(r.mejor).toEqual({ forma: 'BS', costo: 1000 });
		expect(r.alternativa?.costo).toBeCloseTo(1250);
	});

	it('sin tasa USDT solo hay una opción', () => {
		const r = recomendarPago('DIVISAS', 1000, { ...tasas, usdtPromedio: null })!;
		expect(r.mejor.forma).toBe('DIRECTO');
		expect(r.alternativa).toBeNull();
		expect(r.ahorro).toBe(0);
	});

	it('null con total 0', () => {
		expect(recomendarPago('USDT', 0, tasas)).toBeNull();
	});
});
