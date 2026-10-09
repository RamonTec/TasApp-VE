/**
 * Calculadora de compras: suma lo que vas a comprar y te dice cuánto es en cada
 * forma de pago, y cuál te conviene según lo que tengas en el bolsillo.
 *
 * Supuesto: los precios en $ o € se cobran a tasa BCV (lo habitual en comercios),
 * y vender USDT o dólares en efectivo para obtener Bs se hace a la tasa USDT.
 */
import type { Item, Moneda } from '../entities/types.js';
import { subtotalItem } from '../entities/item.js';
import type { TasasAplicables } from './conversion.js';

/** Bs por cada unidad de la moneda, al cobrar en el comercio. */
function bsPorUnidad(moneda: Moneda, t: TasasAplicables): number | null {
	if (moneda === 'VES') return 1;
	if (moneda === 'USD') return t.bcvUsd;
	if (moneda === 'EUR') return t.bcvEur;
	return t.usdtPromedio;
}

function valida(n: number | null): n is number {
	return n !== null && Number.isFinite(n) && n > 0;
}

/** Total de la compra en bolívares, o null si falta alguna tasa necesaria. */
export function totalCompraEnBs(items: readonly Item[], tasas: TasasAplicables): number | null {
	let total = 0;
	for (const item of items) {
		const t = bsPorUnidad(item.moneda, tasas);
		if (!valida(t)) return null;
		total += subtotalItem(item) * t;
	}
	return total;
}

export interface Equivalencias {
	readonly bs: number;
	readonly dolarBcv: number | null;
	readonly euroBcv: number | null;
	readonly usdt: number | null;
}

export function equivalencias(totalBs: number, tasas: TasasAplicables): Equivalencias {
	const dividir = (t: number | null) => (valida(t) ? totalBs / t : null);
	return {
		bs: totalBs,
		dolarBcv: dividir(tasas.bcvUsd),
		euroBcv: dividir(tasas.bcvEur),
		usdt: dividir(tasas.usdtPromedio)
	};
}

export type Tenencia = 'BS' | 'USDT' | 'DIVISAS';

export type FormaDePago =
	/** Pagar en bolívares (tienes Bs o cambias tus divisas/USDT a Bs). */
	| 'BS'
	/** Pagar directo en divisas o USDT, 1:1 con el precio en dólares BCV. */
	| 'DIRECTO';

export interface OpcionPago {
	readonly forma: FormaDePago;
	/** Cuánto te cuesta, en la moneda que tienes. */
	readonly costo: number;
}

export interface Recomendacion {
	readonly tenencia: Tenencia;
	readonly mejor: OpcionPago;
	readonly alternativa: OpcionPago | null;
	/** Lo que ahorras con la mejor opción, en la moneda que tienes. */
	readonly ahorro: number;
	/** Ese ahorro como % del costo de la alternativa. */
	readonly ahorroPct: number;
}

/**
 * Compara pagar convirtiendo a Bs contra pagar directo en divisas.
 * - Con Bs: pagas el total en Bs; pagar en divisas implicaría comprarlas a tasa USDT.
 * - Con USDT o dólares: o los vendes a tasa USDT y pagas en Bs, o pagas directo a tasa BCV.
 */
export function recomendarPago(
	tenencia: Tenencia,
	totalBs: number,
	tasas: TasasAplicables
): Recomendacion | null {
	if (!Number.isFinite(totalBs) || totalBs <= 0) return null;
	const { bcvUsd, usdtPromedio } = tasas;

	let opciones: OpcionPago[];
	if (tenencia === 'BS') {
		opciones = [{ forma: 'BS', costo: totalBs }];
		// Comprar los dólares para pagar directo: (total en $ BCV) × tasa USDT.
		if (valida(bcvUsd) && valida(usdtPromedio)) {
			opciones.push({ forma: 'DIRECTO', costo: (totalBs / bcvUsd) * usdtPromedio });
		}
	} else {
		if (!valida(bcvUsd)) return null;
		opciones = [{ forma: 'DIRECTO', costo: totalBs / bcvUsd }];
		if (valida(usdtPromedio)) opciones.push({ forma: 'BS', costo: totalBs / usdtPromedio });
	}

	const ordenadas = [...opciones].sort((a, b) => a.costo - b.costo);
	const mejor = ordenadas[0];
	const alternativa = ordenadas[1] ?? null;
	const ahorro = alternativa ? alternativa.costo - mejor.costo : 0;
	const ahorroPct = alternativa && alternativa.costo > 0 ? (ahorro / alternativa.costo) * 100 : 0;
	return { tenencia, mejor, alternativa, ahorro, ahorroPct };
}
