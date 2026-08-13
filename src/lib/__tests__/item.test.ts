import { describe, it, expect } from 'vitest';
import { crearItem, subtotalItem } from '../domain/entities/item';

describe('crearItem', () => {
	it('crea un item válido', () => {
		const item = crearItem({ nombre: 'Arroz', precio: 1.5, cantidad: 2, moneda: 'USD' });
		expect(item.nombre).toBe('Arroz');
		expect(item.precio).toBe(1.5);
		expect(item.cantidad).toBe(2);
		expect(item.moneda).toBe('USD');
		expect(item.id).toBeTypeOf('string');
		expect(item.id.length).toBeGreaterThan(0);
	});

	it('rechaza nombre vacío', () => {
		expect(() =>
			crearItem({ nombre: '', precio: 1, cantidad: 1, moneda: 'USD' })
		).toThrowError(/nombre/i);
	});

	it('rechaza nombre solo espacios', () => {
		expect(() =>
			crearItem({ nombre: '   ', precio: 1, cantidad: 1, moneda: 'USD' })
		).toThrowError(/nombre/i);
	});

	it('rechaza precio negativo', () => {
		expect(() =>
			crearItem({ nombre: 'X', precio: -1, cantidad: 1, moneda: 'USD' })
		).toThrowError(/precio/i);
	});

	it('rechaza precio NaN', () => {
		expect(() =>
			crearItem({ nombre: 'X', precio: NaN, cantidad: 1, moneda: 'USD' })
		).toThrowError(/precio/i);
	});

	it('rechaza cantidad 0', () => {
		expect(() =>
			crearItem({ nombre: 'X', precio: 1, cantidad: 0, moneda: 'USD' })
		).toThrowError(/cantidad/i);
	});

	it('rechaza cantidad fraccionaria', () => {
		expect(() =>
			crearItem({ nombre: 'X', precio: 1, cantidad: 2.5, moneda: 'USD' })
		).toThrowError(/cantidad/i);
	});

	it('rechaza moneda inválida', () => {
		expect(() =>
			crearItem({ nombre: 'X', precio: 1, cantidad: 1, moneda: 'XYZ' as never })
		).toThrowError(/moneda/i);
	});

	it('trimea el nombre', () => {
		const item = crearItem({ nombre: '  Yuca  ', precio: 1, cantidad: 1, moneda: 'USD' });
		expect(item.nombre).toBe('Yuca');
	});
});

describe('subtotalItem', () => {
	it('calcula precio * cantidad', () => {
		const item = crearItem({ nombre: 'X', precio: 2.5, cantidad: 3, moneda: 'USD' });
		expect(subtotalItem(item)).toBe(7.5);
	});
});
