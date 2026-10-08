import { httpGet, ErrorHttp } from '../../infrastructure/http/client';
import type { TasaBcv, TasaUsdt } from '../../domain/entities/types';

const URL_VE_DOLAR_API = 'https://ve.dolarapi.com/v1/dolares';
const URL_VE_DOLAR_API_EUR = 'https://ve.dolarapi.com/v1/euros';

export class ErrorFuenteVeDolarApi extends Error {
	constructor(message: string, public readonly causa?: unknown) {
		super(message);
		this.name = 'ErrorFuenteVeDolarApi';
	}
}

const ETIQUETA_FUENTE = 've.dolarapi.com';

interface DolarEntradaRaw {
	moneda?: string;
	fuente?: string;
	nombre?: string;
	compra?: number | null;
	venta?: number | null;
	promedio?: number | null;
	fechaActualizacion?: string;
}


function esNumeroFinitoPositivo(n: unknown): n is number {
	return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function numeroPositivoO(n: unknown, fallback: number | null | undefined): number | null {
	return esNumeroFinitoPositivo(n) ? n : fallback ?? null;
}

function interpretarBcv(entrada: DolarEntradaRaw | undefined, eur: number | null): TasaBcv | null {
	if (!entrada) return null;
	const usd = numeroPositivoO(entrada.promedio, numeroPositivoO(entrada.venta, entrada.compra));
	if (usd === null) return null;
	return {
		fuente: 'BCV',
		valor: usd,
		usd,
		eur: eur ?? 0,
		fuenteUsada: ETIQUETA_FUENTE,
		fecha: entrada.fechaActualizacion ?? new Date().toISOString()
	};
}

function interpretarUsdt(entrada: DolarEntradaRaw | undefined): TasaUsdt | null {
	if (!entrada) return null;
	const prom = numeroPositivoO(entrada.promedio, entrada.venta ?? null);
	if (prom === null) return null;
	const compra = numeroPositivoO(entrada.compra, prom) ?? prom;
	const venta = numeroPositivoO(entrada.venta, prom) ?? prom;
	return {
		fuente: 'USDT',
		valor: prom,
		compra,
		venta,
		promedio: prom,
		muestras: 1,
		fuenteUsada: `${ETIQUETA_FUENTE} (paralelo)`,
		fecha: entrada.fechaActualizacion ?? new Date().toISOString()
	};
}

function buscarPorFuente(
	lista: DolarEntradaRaw[] | undefined,
	fuenteEsperada: 'oficial' | 'paralelo'
): DolarEntradaRaw | undefined {
	if (!Array.isArray(lista)) return undefined;
	return lista.find((x) => (x.fuente ?? '').toLowerCase() === fuenteEsperada);
}

export async function obtenerTasasVeDolarApi(): Promise<{ bcv: TasaBcv | null; usdt: TasaUsdt | null }> {
	let respuesta: DolarEntradaRaw[];
	const eurPromesa = obtenerEurVeDolarApi();
	try {
		respuesta = await httpGet<DolarEntradaRaw[]>(URL_VE_DOLAR_API, {
			timeoutMs: 8000,
			reintentos: 1
		});
	} catch (err) {
		if (err instanceof ErrorHttp) {
			throw new ErrorFuenteVeDolarApi(`HTTP ${err.status} consultando ve.dolarapi.com`, err);
		}
		throw new ErrorFuenteVeDolarApi('No se pudo conectar con ve.dolarapi.com', err);
	}

	const bcvRaw = buscarPorFuente(respuesta, 'oficial');
	const usdtRaw = buscarPorFuente(respuesta, 'paralelo');

	return {
		bcv: interpretarBcv(bcvRaw, await eurPromesa),
		usdt: interpretarUsdt(usdtRaw)
	};
}

/** Euro oficial BCV. `/v1/euros` devuelve una lista igual que `/v1/dolares`. */
export async function obtenerEurVeDolarApi(): Promise<number | null> {
	try {
		const lista = await httpGet<DolarEntradaRaw[]>(URL_VE_DOLAR_API_EUR, {
			timeoutMs: 8000,
			reintentos: 1
		});
		const oficial = buscarPorFuente(lista, 'oficial');
		if (!oficial) return null;
		return numeroPositivoO(oficial.promedio, numeroPositivoO(oficial.venta, oficial.compra));
	} catch {
		return null;
	}
}
