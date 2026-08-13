import { ErrorRed, httpPost } from '../../infrastructure/http/client.js';
import type { TasaUsdt } from '../../domain/entities/types.js';

const URL_BINANCE_P2P = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/ads/search';

export class ErrorBinanceP2P extends Error {
	constructor(message: string, public readonly causa?: unknown) {
		super(message);
		this.name = 'ErrorBinanceP2P';
	}
}

interface AnuncioP2P {
	adv: {
		price: number;
		tradableQuantity: number;
		minSingleTransAmount: number;
		maxSingleTransAmount: number;
	};
	advertiser: { nickName: string; monthOrderCount: number; monthFinishRate: number };
}

interface RespuestaBinance {
	data: AnuncioP2P[];
	total: number;
	success: boolean;
}

function mediana(arr: number[]): number {
	if (arr.length === 0) return 0;
	const sorted = [...arr].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function promedio(arr: number[]): number {
	if (arr.length === 0) return 0;
	return arr.reduce((acc, v) => acc + v, 0) / arr.length;
}

interface AnuncioValido {
	precio: number;
	vendedor: string;
	transacciones: number;
}

function filtrarAnunciosValidos(data: AnuncioP2P[]): AnuncioValido[] {
	return data
		.filter((a) => a && a.adv && Number.isFinite(a.adv.price))
		.map((a) => ({
			precio: a.adv.price,
			vendedor: a.advertiser?.nickName ?? 'desconocido',
			transacciones: a.advertiser?.monthOrderCount ?? 0
		}));
}

export async function obtenerUsdtP2P(): Promise<TasaUsdt> {
	const body = {
		fiat: 'VES',
		tradeType: 'SELL',
		asset: 'USDT',
		rows: 20,
		page: 1,
		payTypes: [],
		classic: false,
		proMerchantAds: false,
		shieldMerchantAds: false,
		filterTinyAmount: false,
		additionalKycVerifyFilter: false,
		editionIdentifier: undefined
	};

	let respuesta: RespuestaBinance;
	try {
		respuesta = await httpPost<typeof body, RespuestaBinance>(
			URL_BINANCE_P2P,
			body,
			{ timeoutMs: 8000, reintentos: 1 }
		);
	} catch (err) {
		if (err instanceof ErrorRed) {
			throw new ErrorBinanceP2P('Binance P2P no disponible', err);
		}
		throw new ErrorBinanceP2P('Error desconocido al consultar Binance P2P', err);
	}

	if (!respuesta?.success || !Array.isArray(respuesta.data)) {
		throw new ErrorBinanceP2P('Respuesta inválida de Binance P2P');
	}

	const validos = filtrarAnunciosValidos(respuesta.data);
	if (validos.length === 0) {
		throw new ErrorBinanceP2P('No hay anuncios disponibles en Binance P2P');
	}

	const ordenados = validos.sort((a, b) => b.transacciones - a.transacciones);
	const principales = ordenados.slice(0, Math.min(10, ordenados.length));
	const precios = principales.map((p) => p.precio);

	const prom = promedio(precios);
	const med = mediana(precios);

	if (!Number.isFinite(prom) || prom <= 0) {
		throw new ErrorBinanceP2P('Tasa USDT calculada inválida');
	}

	return {
		fuente: 'USDT',
		valor: prom,
		compra: Math.min(...precios),
		venta: Math.max(...precios),
		promedio: med > 0 ? med : prom,
		muestras: principales.length,
		fecha: new Date().toISOString()
	};
}
