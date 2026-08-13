import { describe, it, expect } from 'vitest';
import {
	formatearVes,
	formatearUsd,
	formatearEur,
	formatearUsdt,
	formatearPorcentaje,
	formatearNumero,
	formatearTasa
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
