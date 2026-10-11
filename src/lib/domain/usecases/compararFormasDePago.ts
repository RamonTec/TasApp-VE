/**
 * "¿En qué moneda me conviene pagar?"
 *
 * El vendedor pone un precio distinto según cómo pagues (ej. 50 $ en efectivo,
 * 60 $ a tasa BCV si pagas en Bs, 45 € en euros). Para compararlos se lleva cada
 * precio a dólares reales, lo que de verdad te cuesta:
 * - Dólares: tal cual.
 * - Bolívares: a tasa USDT, que es lo que obtienes (o pagas) al cambiar dólares por Bs.
 * - Euros: a la paridad €/$ del BCV (tasa euro BCV ÷ tasa dólar BCV).
 */
import type { TasasAplicables } from './conversion.js';

export type MedioDePago = 'USD' | 'VES' | 'EUR';

export interface PrecioPorMedio {
	readonly medio: MedioDePago;
	/** Precio en la moneda del medio (Bs para VES). */
	readonly monto: number;
}

export interface OpcionComparada {
	readonly medio: MedioDePago;
	readonly monto: number;
	/** Lo que realmente cuesta, en dólares. */
	readonly costoUsd: number;
	/** Dólares de más frente a la mejor opción (0 para la mejor). */
	readonly sobrecostoUsd: number;
	/** Ese sobrecosto como % del costo de la mejor opción. */
	readonly sobrecostoPct: number;
}

export interface ComparacionFormasDePago {
	/** Ordenadas de la más barata a la más cara. */
	readonly opciones: readonly OpcionComparada[];
	/** Las diferencias son menores al umbral: da igual cómo pagues. */
	readonly indiferente: boolean;
}

const UMBRAL_INDIFERENTE_PCT = 0.5;

function valida(n: number | null): n is number {
	return n !== null && Number.isFinite(n) && n > 0;
}

/** Dólares por cada unidad del medio de pago, o null si falta la tasa. */
export function dolaresPorUnidad(medio: MedioDePago, t: TasasAplicables): number | null {
	if (medio === 'USD') return 1;
	if (medio === 'VES') return valida(t.usdtPromedio) ? 1 / t.usdtPromedio : null;
	return valida(t.bcvEur) && valida(t.bcvUsd) ? t.bcvEur / t.bcvUsd : null;
}

/**
 * Compara los precios válidos que se puedan valorar con las tasas disponibles.
 * Devuelve null si quedan menos de dos opciones para comparar.
 */
export function compararFormasDePago(
	precios: readonly PrecioPorMedio[],
	tasas: TasasAplicables
): ComparacionFormasDePago | null {
	const valoradas = precios.flatMap((p) => {
		const factor = dolaresPorUnidad(p.medio, tasas);
		if (!valida(p.monto) || factor === null) return [];
		return [{ medio: p.medio, monto: p.monto, costoUsd: p.monto * factor }];
	});
	if (valoradas.length < 2) return null;

	valoradas.sort((a, b) => a.costoUsd - b.costoUsd);
	const mejor = valoradas[0].costoUsd;
	const opciones = valoradas.map(
		(o): OpcionComparada => ({
			...o,
			sobrecostoUsd: o.costoUsd - mejor,
			sobrecostoPct: ((o.costoUsd - mejor) / mejor) * 100
		})
	);
	const indiferente = opciones[opciones.length - 1].sobrecostoPct < UMBRAL_INDIFERENTE_PCT;
	return { opciones, indiferente };
}
