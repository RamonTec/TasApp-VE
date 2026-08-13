import type { Item, Moneda, Tasa } from './types.js';

export function crearItem(input: {
	nombre: string;
	precio: number;
	cantidad: number;
	moneda: Moneda;
}): Item {
	if (!input.nombre || input.nombre.trim().length === 0) {
		throw new Error('El nombre del item es obligatorio');
	}
	if (!Number.isFinite(input.precio) || input.precio < 0) {
		throw new Error('El precio debe ser un número positivo');
	}
	if (!Number.isInteger(input.cantidad) || input.cantidad < 1) {
		throw new Error('La cantidad debe ser un entero mayor o igual a 1');
	}
	const monedasValidas: Moneda[] = ['USD', 'EUR', 'USDT', 'VES'];
	if (!monedasValidas.includes(input.moneda)) {
		throw new Error(`Moneda inválida: ${input.moneda}`);
	}
	return {
		id: crypto.randomUUID(),
		nombre: input.nombre.trim(),
		precio: input.precio,
		cantidad: input.cantidad,
		moneda: input.moneda
	};
}

export function subtotalItem(item: Item): number {
	return item.precio * item.cantidad;
}

export function tasaEsValida(tasa: Tasa | null | undefined): tasa is Tasa {
	return tasa != null && Number.isFinite(tasa.valor) && tasa.valor > 0;
}
