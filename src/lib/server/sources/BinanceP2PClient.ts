import { ErrorRed, httpPost } from '../../infrastructure/http/client.js';
import type { TasaUsdt } from '../../domain/entities/types.js';

export const URL_BINANCE_P2P = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

/** Anuncios con menos USDT disponible que esto suelen ser residuos y distorsionan el precio. */
const MIN_USDT_DISPONIBLE = 10;
const ANUNCIOS_POR_LADO = 10;

export class ErrorBinanceP2P extends Error {
	constructor(message: string, public readonly causa?: unknown) {
		super(message);
		this.name = 'ErrorBinanceP2P';
	}
}

/** Binance envía los números como string ("1015.001"). */
type NumeroApi = number | string;

interface AnuncioP2P {
	adv?: {
		price?: NumeroApi;
		tradableQuantity?: NumeroApi;
	};
}

export interface RespuestaBinance {
	data?: AnuncioP2P[] | null;
	success?: boolean;
}

/**
 * Lado desde el punto de vista del usuario:
 * - BUY: el usuario compra USDT (paga Bs) → precio de compra.
 * - SELL: el usuario vende USDT (recibe Bs) → precio de venta.
 */
export type LadoP2P = 'BUY' | 'SELL';

function aNumero(v: NumeroApi | undefined): number {
	if (typeof v === 'number') return v;
	if (typeof v === 'string') return Number.parseFloat(v);
	return Number.NaN;
}

export function mediana(arr: readonly number[]): number {
	if (arr.length === 0) return 0;
	const sorted = [...arr].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Extrae los precios válidos de los mejores anuncios (Binance ya los ordena por precio). */
export function preciosValidos(respuesta: RespuestaBinance): number[] {
	if (!respuesta?.success || !Array.isArray(respuesta.data)) {
		throw new ErrorBinanceP2P('Respuesta inválida de Binance P2P');
	}
	const anuncios = respuesta.data
		.map((a) => ({
			precio: aNumero(a?.adv?.price),
			disponible: aNumero(a?.adv?.tradableQuantity)
		}))
		.filter((a) => Number.isFinite(a.precio) && a.precio > 0);

	// Si el filtro de volumen deja muy pocos, se usan todos los anuncios con precio.
	const conVolumen = anuncios.filter(
		(a) => !Number.isFinite(a.disponible) || a.disponible >= MIN_USDT_DISPONIBLE
	);
	const base = conVolumen.length >= 3 ? conVolumen : anuncios;
	return base.slice(0, ANUNCIOS_POR_LADO).map((a) => a.precio);
}

async function consultarLado(lado: LadoP2P): Promise<number[]> {
	const body = {
		fiat: 'VES',
		tradeType: lado,
		asset: 'USDT',
		rows: 20,
		page: 1,
		payTypes: [],
		publisherType: null
	};
	let respuesta: RespuestaBinance;
	try {
		respuesta = await httpPost<typeof body, RespuestaBinance>(URL_BINANCE_P2P, body, {
			timeoutMs: 8000,
			reintentos: 1
		});
	} catch (err) {
		if (err instanceof ErrorRed) {
			throw new ErrorBinanceP2P('Binance P2P no disponible', err);
		}
		throw new ErrorBinanceP2P('Error desconocido al consultar Binance P2P', err);
	}
	return preciosValidos(respuesta);
}

/** Construye la tasa a partir de los precios de cada lado. Pura, para poder testearla. */
export function construirTasaUsdt(
	preciosCompra: readonly number[],
	preciosVenta: readonly number[],
	fecha: string = new Date().toISOString()
): TasaUsdt {
	const compra = mediana(preciosCompra);
	const venta = mediana(preciosVenta);
	const lados = [compra, venta].filter((v) => v > 0);
	if (lados.length === 0) {
		throw new ErrorBinanceP2P('No hay anuncios disponibles en Binance P2P');
	}
	const promedio = lados.reduce((acc, v) => acc + v, 0) / lados.length;
	return {
		fuente: 'USDT',
		valor: promedio,
		compra: compra > 0 ? compra : promedio,
		venta: venta > 0 ? venta : promedio,
		promedio,
		muestras: preciosCompra.length + preciosVenta.length,
		fuenteUsada: 'Binance P2P',
		fecha
	};
}

export async function obtenerUsdtP2P(): Promise<TasaUsdt> {
	const [compra, venta] = await Promise.allSettled([consultarLado('BUY'), consultarLado('SELL')]);
	if (compra.status === 'rejected' && venta.status === 'rejected') {
		throw compra.reason instanceof Error
			? compra.reason
			: new ErrorBinanceP2P('Binance P2P no disponible', compra.reason);
	}
	return construirTasaUsdt(
		compra.status === 'fulfilled' ? compra.value : [],
		venta.status === 'fulfilled' ? venta.value : []
	);
}
