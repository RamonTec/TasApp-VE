import { describe, it, expect } from 'vitest';
import {
	formatearVes,
	formatearUsd,
	formatearEur,
	formatearUsdt,
	formatearPorcentaje,
	formatearNumero,
	formatearTasa,
	formatearEntradaMonto,
	montoAEntrada,
	parsearMonto
} from '../shared/format';

describe('formateo monetario', () => {
	it('VES con separador de miles es-VE', () => {
		const out = formatearVes(1234.5);
		expect(out).toContain('Bs.');
		expect(out).toContain('1.234,50');
	});

	it('USD usa prefijo US$', () => {
		const out = formatearUsd(1000);
		expect(out).toContain('US$');
		expect(out).toContain('1.000,00');
	});

	it('EUR usa prefijo €', () => {
		const out = formatearEur(500);
		expect(out).toContain('€');
	});

	it('USDT usa prefijo USDT', () => {
		const out = formatearUsdt(50);
		expect(out).toContain('USDT');
	});

	it('formatearPorcentaje con signo + para positivos', () => {
		const out = formatearPorcentaje(5.5);
		expect(out).toContain('+');
		expect(out).toContain('5,50');
	});

	it('formatearPorcentaje sin signo para 0', () => {
		const out = formatearPorcentaje(0);
		expect(out).toBe('0,00%');
	});

	it('formatearPorcentaje con signo - para negativos', () => {
		const out = formatearPorcentaje(-3.2);
		expect(out).toContain('-');
	});

	it('tolera NaN', () => {
		expect(formatearVes(NaN)).toBe('Bs. 0,00');
		expect(formatearPorcentaje(NaN)).toBe('0,00%');
	});

	it('formatearNumero sin prefijo', () => {
		expect(formatearNumero(123.45)).toBe('123,45');
	});

	it('formatearTasa 4 decimales', () => {
		const out = formatearTasa(36.51234);
		expect(out).toContain('36,5123');
	});
});

describe('formatearEntradaMonto', () => {
	it.each([
		['', ''],
		['1234567', '1.234.567'],
		['1234567,891', '1.234.567,89'],
		['1.234', '1.234'],
		['abc12x', '12'],
		['-5', '5'],
		[',5', '0,5'],
		['12,', '12,'],
		['12,3,4', '12,34'],
		['007', '7'],
		['0,05', '0,05']
	])('"%s" → "%s"', (texto, esperado) => {
		expect(formatearEntradaMonto(texto)).toBe(esperado);
	});

	it('respeta el máximo de decimales', () => {
		expect(formatearEntradaMonto('36,51234', 4)).toBe('36,5123');
		expect(formatearEntradaMonto('36,5', 0)).toBe('36');
	});

	it('lo que formatea se puede volver a leer', () => {
		for (const t of ['1.234.567,89', '12,', '0,5', '1.000']) {
			expect(parsearMonto(formatearEntradaMonto(t))).toBe(
				Number(t.replace(/\./g, '').replace(',', '.').replace(/\.$/, ''))
			);
		}
	});
});

describe('montoAEntrada', () => {
	it('convierte un número al texto de entrada', () => {
		expect(montoAEntrada(1234.5)).toBe('1.234,5');
		expect(montoAEntrada(36.51234, 4)).toBe('36,5123');
		expect(montoAEntrada(NaN)).toBe('');
	});
});
