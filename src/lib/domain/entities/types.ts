export type Moneda = 'USD' | 'EUR' | 'USDT' | 'VES';

export const MONEDAS: readonly Moneda[] = ['USD', 'EUR', 'USDT', 'VES'] as const;

export type FuenteTasa = 'BCV' | 'USDT' | 'PERSONALIZADA';

export interface Tasa {
	readonly fuente: FuenteTasa;
	readonly valor: number;
	readonly fecha: string;
	readonly fuenteUsada?: string;
}

export interface TasaBcv extends Tasa {
	readonly fuente: 'BCV';
	readonly usd: number;
	readonly eur: number;
}

export interface TasaUsdt extends Tasa {
	readonly fuente: 'USDT';
	readonly compra: number;
	readonly venta: number;
	readonly promedio: number;
	readonly muestras: number;
}

export interface TasaPersonalizada extends Tasa {
	readonly fuente: 'PERSONALIZADA';
	readonly etiqueta: string;
	readonly fuenteUsada?: never;
}

export type CualquierTasa = TasaBcv | TasaUsdt | TasaPersonalizada;

export interface Item {
	readonly id: string;
	readonly nombre: string;
	readonly precio: number;
	readonly cantidad: number;
	readonly moneda: Moneda;
}

export interface TotalesItem {
	readonly totalUsd: number;
	readonly totalUsdt: number;
	readonly totalEur: number;
	readonly totalVes: number;
	readonly cantidadItems: number;
}

export interface ResultadoConversion {
	readonly monto: number;
	readonly desde: Moneda;
	readonly hacia: Moneda;
	readonly tasaAplicada: number;
	readonly fuenteAplicada: FuenteTasa;
	readonly total: number;
}

export interface Diferencia {
	readonly absoluta: number;
	readonly porcentual: number;
	readonly mayor: FuenteTasa;
	readonly menor: FuenteTasa;
}

export type OrigenTasaActiva = 'BCV' | 'USDT_PROMEDIO' | 'PERSONALIZADA';

export class ErrorDominio extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'ErrorDominio';
	}
}
