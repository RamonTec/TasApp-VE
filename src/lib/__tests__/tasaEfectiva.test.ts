import { describe, it, expect } from 'vitest';
import {
	calcularTasaEfectiva,
	posicionEntreReferencias,
	type ReferenciaTasa
} from '../domain/usecases/tasaEfectiva';
import { parsearMonto } from '../shared/format';

const refs: ReferenciaTasa[] = [
	{ ref: 'BCV', etiqueta: 'BCV', valor: 875 },
	{ ref: 'USDT', etiqueta: 'USDT', valor: 1015 }
];

describe('calcularTasaEfectiva', () => {
	it('calcula la tasa implícita y la compara con cada referencia', () => {
		const r = calcularTasaEfectiva(10, 10500, refs)!;
		expect(r.tasa).toBe(1050);

		const bcv = r.comparaciones.find((c) => c.ref === 'BCV')!;
		expect(bcv.montoBsEnReferencia).toBe(8750);
		expect(bcv.diferenciaBs).toBe(1750);
		expect(bcv.diferenciaDivisa).toBeCloseTo(2);
		expect(bcv.diferenciaPorDolar).toBe(175);
		expect(bcv.porcentaje).toBeCloseTo(20);

		const usdt = r.comparaciones.find((c) => c.ref === 'USDT')!;
		expect(usdt.porcentaje).toBeCloseTo(3.448, 2);
		expect(r.veredicto).toBe('PAGAR_EN_DIVISAS');
	});

	it('recomienda pagar en Bs si la tasa está por debajo del USDT', () => {
		const r = calcularTasaEfectiva(10, 9500, refs)!;
		expect(r.veredicto).toBe('PAGAR_EN_BS');
		expect(r.comparaciones.find((c) => c.ref === 'USDT')!.diferenciaBs).toBe(-650);
	});

	it('es indiferente si la diferencia con el USDT es menor a 0,5 %', () => {
		expect(calcularTasaEfectiva(10, 10170, refs)!.veredicto).toBe('INDIFERENTE');
	});

	it('sin USDT no hay veredicto', () => {
		const r = calcularTasaEfectiva(10, 9000, [refs[0]])!;
		expect(r.veredicto).toBe('SIN_REFERENCIA');
		expect(r.comparaciones).toHaveLength(1);
	});

	it('ignora referencias inválidas', () => {
		const r = calcularTasaEfectiva(1, 900, [...refs, { ref: 'PERSONALIZADA', etiqueta: 'x', valor: 0 }])!;
		expect(r.comparaciones).toHaveLength(2);
	});

	it('devuelve null con montos vacíos o inválidos', () => {
		expect(calcularTasaEfectiva(0, 100, refs)).toBeNull();
		expect(calcularTasaEfectiva(10, 0, refs)).toBeNull();
		expect(calcularTasaEfectiva(Number.NaN, 100, refs)).toBeNull();
	});
});

describe('posicionEntreReferencias', () => {
	it('0 en BCV, 1 en USDT', () => {
		expect(posicionEntreReferencias(875, 875, 1015)).toBe(0);
		expect(posicionEntreReferencias(1015, 875, 1015)).toBe(1);
		expect(posicionEntreReferencias(945, 875, 1015)).toBeCloseTo(0.5);
	});

	it('null si las referencias no sirven', () => {
		expect(posicionEntreReferencias(900, 0, 1015)).toBeNull();
		expect(posicionEntreReferencias(900, 1000, 1000)).toBeNull();
	});
});

describe('parsearMonto', () => {
	it.each([
		['1.234,56', 1234.56],
		['1234,56', 1234.56],
		['1234.56', 1234.56],
		['1,234.56', 1234.56],
		['1.234', 1234],
		['1.234.567', 1234567],
		['1.234.567,8', 1234567.8],
		['10.5', 10.5],
		['0,99', 0.99],
		['.5', 0.5],
		[' 25 ', 25],
		['Bs. 10.500', 10500],
		['$ 12,50', 12.5]
	])('"%s" → %d', (texto, esperado) => {
		expect(parsearMonto(texto)).toBe(esperado);
	});

	it.each(['', 'abc', '1,2,3x', '--1'])('"%s" → NaN', (texto) => {
		expect(parsearMonto(texto)).toBeNaN();
	});
});
