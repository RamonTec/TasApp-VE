import type {
	Diferencia,
	Item,
	Moneda,
	ResultadoConversion,
	TasaBcv,
	TasaPersonalizada,
	TasaUsdt,
	TotalesItem
} from '../entities/types.js';
import { subtotalItem } from '../entities/item.js';

export interface TasasAplicables {
	readonly bcvUsd: number | null;
	readonly bcvEur: number | null;
	readonly usdtPromedio: number | null;
	readonly personalizada: number | null;
}

export interface TasasDisponibles {
	readonly bcv: TasaBcv | null;
	readonly usdt: TasaUsdt | null;
	readonly personalizada: TasaPersonalizada | null;
}

export type TasaReferencia = 'BCV' | 'USDT' | 'PERSONALIZADA';

export function tasasAplicables(tasas: TasasDisponibles): TasasAplicables {
	return {
		bcvUsd: tasas.bcv?.usd ?? null,
		bcvEur: tasas.bcv?.eur ?? null,
		usdtPromedio: tasas.usdt?.promedio ?? null,
		personalizada: tasas.personalizada?.valor ?? null
	};
}

function tasaReferenciaVes(t: TasasAplicables, ref: TasaReferencia): number | null {
	if (ref === 'BCV') return t.bcvUsd;
	if (ref === 'USDT') return t.usdtPromedio;
	return t.personalizada;
}

function tasaDeCambio(
	desde: Moneda,
	hacia: Moneda,
	t: TasasAplicables,
	ref: TasaReferencia
): number | null {
	if (desde === hacia) return 1;

	const refVes = tasaReferenciaVes(t, ref);
	const tasaVes = (m: Moneda): number | null => {
		if (m === 'VES') return 1;
		if (m === 'USD') return refVes;
		if (m === 'USDT') return refVes;
		if (m === 'EUR') return t.bcvEur;
		return null;
	};

	const tOrigen = tasaVes(desde);
	const tDestino = tasaVes(hacia);
	if (tOrigen === null || tDestino === null || tOrigen <= 0 || tDestino <= 0) {
		return null;
	}
	return tOrigen / tDestino;
}

export interface ConversionInput {
	readonly monto: number;
	readonly desde: Moneda;
	readonly hacia: Moneda;
	readonly tasas: TasasAplicables;
	readonly fuenteAplicada?: TasaReferencia;
}

export function calcularConversion(input: ConversionInput): ResultadoConversion | null {
	if (!Number.isFinite(input.monto) || input.monto < 0) return null;
	const ref = input.fuenteAplicada ?? 'BCV';
	const tasa = tasaDeCambio(input.desde, input.hacia, input.tasas, ref);
	if (tasa === null || !Number.isFinite(tasa) || tasa <= 0) return null;
	return {
		monto: input.monto,
		desde: input.desde,
		hacia: input.hacia,
		tasaAplicada: tasa,
		fuenteAplicada: ref,
		total: input.monto * tasa
	};
}

export function calcularDiferenciaPorcentual(a: number, b: number): number {
	if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b)) return 0;
	return ((b - a) / a) * 100;
}

export function calcularDiferenciaEntreFuentes(
	bcv: number | null,
	usdt: number | null
): Diferencia | null {
	if (bcv === null || usdt === null) return null;
	if (bcv <= 0 || usdt <= 0) return null;
	const mayor: 'BCV' | 'USDT' = usdt > bcv ? 'USDT' : 'BCV';
	const menor: 'BCV' | 'USDT' = usdt > bcv ? 'BCV' : 'USDT';
	return {
		absoluta: Math.abs(usdt - bcv),
		porcentual: Math.abs(calcularDiferenciaPorcentual(bcv, usdt)),
		mayor,
		menor
	};
}

export interface TotalesInput {
	readonly items: readonly Item[];
	readonly tasas: TasasAplicables;
	readonly tasaActiva: TasaReferencia;
}

export function calcularTotalesItems(input: TotalesInput): TotalesItem {
	let totalUsd = 0;
	let totalUsdt = 0;
	let totalEur = 0;
	let totalVes = 0;
	let cantidadItems = 0;

	const refVes = tasaReferenciaVes(input.tasas, input.tasaActiva);

	for (const item of input.items) {
		const sub = subtotalItem(item);
		cantidadItems += item.cantidad;

		const tasa = tasaDeCambio(item.moneda, 'VES', input.tasas, input.tasaActiva);
		if (tasa !== null) {
			totalVes += sub * tasa;
		}

		switch (item.moneda) {
			case 'USD':
				totalUsd += sub;
				break;
			case 'EUR':
				totalEur += sub;
				break;
			case 'USDT':
				totalUsdt += sub;
				break;
			case 'VES':
				if (refVes !== null && refVes > 0) {
					totalUsd += sub / refVes;
					totalUsdt += sub / refVes;
				}
				break;
		}
	}

	return { totalUsd, totalUsdt, totalEur, totalVes, cantidadItems };
}

export function convertirItemAVes(
	item: Item,
	tasas: TasasAplicables,
	ref: TasaReferencia = 'BCV'
): number {
	const sub = subtotalItem(item);
	const t = tasaDeCambio(item.moneda, 'VES', tasas, ref);
	return t !== null ? sub * t : 0;
}

export function convertirItemA(
	item: Item,
	hacia: Moneda,
	tasas: TasasAplicables,
	ref: TasaReferencia = 'BCV'
): number {
	const sub = subtotalItem(item);
	const t = tasaDeCambio(item.moneda, hacia, tasas, ref);
	return t !== null ? sub * t : 0;
}
export interface Presupuesto {
	readonly monto: number;
	readonly moneda: Moneda;
}

export interface ResultadoPresupuesto {
	readonly ref: TasaReferencia;
	/** Total de la compra expresado en la moneda del presupuesto. */
	readonly totalEnMoneda: number;
	/** Lo que sobra (positivo) o falta (negativo), en la moneda del presupuesto. */
	readonly restante: number;
	readonly alcanza: boolean;
}

/**
 * Compara lo que tienes contra el total de la lista para cada tasa disponible.
 * Si los items y el presupuesto están en monedas distintas, la tasa cambia el resultado.
 */
export function calcularPresupuesto(
	items: readonly Item[],
	presupuesto: Presupuesto,
	tasas: TasasAplicables,
	refs: readonly TasaReferencia[] = ['BCV', 'USDT', 'PERSONALIZADA']
): ResultadoPresupuesto[] {
	if (!Number.isFinite(presupuesto.monto) || presupuesto.monto < 0) return [];

	const resultados: ResultadoPresupuesto[] = [];
	for (const ref of refs) {
		if (tasaReferenciaVes(tasas, ref) === null) continue;
		let total = 0;
		let completo = true;
		for (const item of items) {
			const t = tasaDeCambio(item.moneda, presupuesto.moneda, tasas, ref);
			if (t === null) {
				completo = false;
				break;
			}
			total += subtotalItem(item) * t;
		}
		if (!completo) continue;
		const restante = presupuesto.monto - total;
		resultados.push({ ref, totalEnMoneda: total, restante, alcanza: restante >= -1e-9 });
	}
	return resultados;
}
