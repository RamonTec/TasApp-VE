/**
 * "¿A qué tasa me están cobrando?"
 *
 * Dado un precio en divisas y el monto equivalente en bolívares que se paga (o se cobra),
 * calcula la tasa implícita (Bs por dólar) y la compara contra las tasas de referencia.
 */

export type ReferenciaComparable = 'BCV' | 'USDT' | 'PERSONALIZADA';

export interface ReferenciaTasa {
	readonly ref: ReferenciaComparable;
	readonly etiqueta: string;
	readonly valor: number;
}

export interface ComparacionReferencia {
	readonly ref: ReferenciaComparable;
	readonly etiqueta: string;
	readonly tasaReferencia: number;
	/** Diferencia de la tasa implícita respecto a la referencia, en %. Positivo = te cobran más caro. */
	readonly porcentaje: number;
	/** Bs de más (o de menos, si es negativo) por cada dólar. */
	readonly diferenciaPorDolar: number;
	/** Lo que costaría la compra en Bs usando la tasa de referencia. */
	readonly montoBsEnReferencia: number;
	/** Bs pagados de más (o de menos) respecto a pagar a la tasa de referencia. */
	readonly diferenciaBs: number;
	/** Esa misma diferencia expresada en dólares a la tasa de referencia. */
	readonly diferenciaDivisa: number;
}

export type Veredicto =
	/** La tasa es menor que el USDT: si tienes USDT/divisas, conviene cambiarlos y pagar en Bs. */
	| 'PAGAR_EN_BS'
	/** La tasa es mayor que el USDT: conviene pagar directamente en divisas. */
	| 'PAGAR_EN_DIVISAS'
	/** Prácticamente igual (diferencia menor a 0,5 %). */
	| 'INDIFERENTE'
	/** No hay tasa USDT para decidir. */
	| 'SIN_REFERENCIA';

export interface ResultadoTasaEfectiva {
	readonly montoDivisa: number;
	readonly montoBs: number;
	readonly tasa: number;
	readonly comparaciones: readonly ComparacionReferencia[];
	readonly veredicto: Veredicto;
}

const UMBRAL_INDIFERENTE_PCT = 0.5;

export function calcularTasaEfectiva(
	montoDivisa: number,
	montoBs: number,
	referencias: readonly ReferenciaTasa[]
): ResultadoTasaEfectiva | null {
	if (!Number.isFinite(montoDivisa) || !Number.isFinite(montoBs)) return null;
	if (montoDivisa <= 0 || montoBs <= 0) return null;

	const tasa = montoBs / montoDivisa;

	const comparaciones = referencias
		.filter((r) => Number.isFinite(r.valor) && r.valor > 0)
		.map((r): ComparacionReferencia => {
			const montoBsEnReferencia = montoDivisa * r.valor;
			const diferenciaBs = montoBs - montoBsEnReferencia;
			return {
				ref: r.ref,
				etiqueta: r.etiqueta,
				tasaReferencia: r.valor,
				porcentaje: ((tasa - r.valor) / r.valor) * 100,
				diferenciaPorDolar: tasa - r.valor,
				montoBsEnReferencia,
				diferenciaBs,
				diferenciaDivisa: diferenciaBs / r.valor
			};
		});

	return { montoDivisa, montoBs, tasa, comparaciones, veredicto: veredicto(comparaciones) };
}

function veredicto(comparaciones: readonly ComparacionReferencia[]): Veredicto {
	const usdt = comparaciones.find((c) => c.ref === 'USDT');
	if (!usdt) return 'SIN_REFERENCIA';
	if (Math.abs(usdt.porcentaje) < UMBRAL_INDIFERENTE_PCT) return 'INDIFERENTE';
	return usdt.porcentaje < 0 ? 'PAGAR_EN_BS' : 'PAGAR_EN_DIVISAS';
}

/**
 * Posición de la tasa implícita entre BCV (0) y USDT (1). Puede salir del rango
 * si la tasa está por debajo del BCV o por encima del USDT. Útil para una barra visual.
 */
export function posicionEntreReferencias(tasa: number, bcv: number, usdt: number): number | null {
	if (!(bcv > 0) || !(usdt > 0) || usdt === bcv) return null;
	return (tasa - bcv) / (usdt - bcv);
}
