import type { TasaBcv, TasaPersonalizada, TasaUsdt } from '../../domain/entities/types';
import { ErrorFuenteVeDolarApi, obtenerTasasVeDolarApi } from '../sources/VeDolarApi';
import { ErrorScrapingBcv, scrapearBcv } from '../sources/BCVScraper';
import { ErrorBinanceP2P, obtenerUsdtP2P } from '../sources/BinanceP2PClient';
import type { TasaRepository } from '../../data/repositories/TasaRepository';

export interface ConfigMultiFuente {
	readonly timeoutMsPorFuente?: number;
	readonly habilitarVeDolarApi?: boolean;
	readonly habilitarBcv?: boolean;
	readonly habilitarBinance?: boolean;
}

type FuenteBcvAsync = () => Promise<TasaBcv>;
type FuenteUsdtAsync = () => Promise<TasaUsdt>;

export interface IntentoFuente {
	readonly fuente: string;
	readonly exito: boolean;
	readonly error?: string;
}

async function conTimeout<T>(p: Promise<T>, ms: number, etiqueta: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | null = null;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`${etiqueta} excedió ${ms}ms`)), ms);
	});
	try {
		return (await Promise.race([p, timeout])) as T;
	} finally {
		if (timer) clearTimeout(timer);
	}
}

export class MultiFuenteError extends Error {
	constructor(
		message: string,
		public readonly intentos: readonly IntentoFuente[]
	) {
		super(message);
		this.name = 'MultiFuenteError';
	}
}

export class MultiFuenteTasaRepository implements TasaRepository {
	private readonly timeout: number;

	constructor(
		private readonly personalizado: () => TasaPersonalizada | null,
		private readonly cfg: ConfigMultiFuente = {},
		private readonly fetchVeDolarApi: () => Promise<{ bcv: TasaBcv | null; usdt: TasaUsdt | null }> = obtenerTasasVeDolarApi,
		private readonly fetchBcvDirecto: FuenteBcvAsync = scrapearBcv,
		private readonly fetchBinance: FuenteUsdtAsync = obtenerUsdtP2P
	) {
		this.timeout = cfg.timeoutMsPorFuente ?? 7000;
	}

	async obtenerBcv(): Promise<TasaBcv> {
		const intentos: IntentoFuente[] = [];
		const cfg = this.cfg;

		if (cfg.habilitarVeDolarApi !== false) {
			const r = await this.intentar(() =>
				conTimeout(this.fetchVeDolarApi(), this.timeout, 'VeDolarApi').then((x) => x.bcv),
				've.dolarapi.com',
				intentos,
				ErrorFuenteVeDolarApi,
				(v) => v !== null,
				'sin dato BCV'
			);
			if (r) return r;
		}

		if (cfg.habilitarBcv !== false) {
			const r = await this.intentar(
				() => conTimeout(this.fetchBcvDirecto(), this.timeout, 'BCVScraper'),
				'bcv.org.ve',
				intentos,
				ErrorScrapingBcv,
				(v) => v !== null,
				'sin dato BCV'
			);
			if (r) return { ...r, fuenteUsada: 'bcv.org.ve' };
		}

		const personalizada = this.personalizado();
		if (personalizada) {
			intentos.push({ fuente: 'manual', exito: true });
			throw new MultiFuenteError(
				'No se pudo obtener tasa BCV de fuentes automáticas. Use la tasa manual.',
				intentos
			);
		}

		throw new MultiFuenteError(
			`Todas las fuentes fallaron. ${intentos.map((i) => `${i.fuente}: ${i.error ?? 'sin dato'}`).join(' | ')}`,
			intentos
		);
	}

	async obtenerUsdt(): Promise<TasaUsdt> {
		const intentos: IntentoFuente[] = [];
		const cfg = this.cfg;

		// Binance P2P es la referencia real del USDT; dolarapi (paralelo promedio) es respaldo.
		if (cfg.habilitarBinance !== false) {
			const r = await this.intentar(
				() => conTimeout(this.fetchBinance(), this.timeout, 'BinanceP2P'),
				'binance',
				intentos,
				ErrorBinanceP2P,
				(v) => v !== null,
				'sin dato USDT'
			);
			if (r) return { ...r, fuenteUsada: 'Binance P2P' };
		}

		if (cfg.habilitarVeDolarApi !== false) {
			const r = await this.intentar(() =>
				conTimeout(this.fetchVeDolarApi(), this.timeout, 'VeDolarApi').then((x) => x.usdt),
				've.dolarapi.com',
				intentos,
				ErrorFuenteVeDolarApi,
				(v) => v !== null,
				'sin dato USDT'
			);
			if (r) return r;
		}

		const personalizada = this.personalizado();
		if (personalizada) {
			intentos.push({ fuente: 'manual', exito: true });
			throw new MultiFuenteError(
				'No se pudo obtener tasa USDT de fuentes automáticas. Use la tasa manual.',
				intentos
			);
		}

		throw new MultiFuenteError(
			`Todas las fuentes USDT fallaron. ${intentos.map((i) => `${i.fuente}: ${i.error ?? 'sin dato'}`).join(' | ')}`,
			intentos
		);
	}

	private async intentar<T>(
		operacion: () => Promise<T>,
		etiqueta: string,
		intentos: IntentoFuente[],
		_ctorError: new (...args: never[]) => Error,
		validador: (v: T) => boolean,
		mensajeFalloVacio: string
	): Promise<T | null> {
		try {
			const v = await operacion();
			if (validador(v)) {
				intentos.push({ fuente: etiqueta, exito: true });
				return v;
			}
			intentos.push({ fuente: etiqueta, exito: false, error: mensajeFalloVacio });
			return null;
		} catch (err) {
			intentos.push({
				fuente: etiqueta,
				exito: false,
				error: err instanceof Error ? err.message : String(err)
			});
			return null;
		}
	}

	obtenerPersonalizada(): TasaPersonalizada | null {
		return this.personalizado();
	}

	guardarPersonalizada(_valor: number, _etiqueta: string): TasaPersonalizada {
		throw new Error(
			'MultiFuenteTasaRepository no persiste tasa personalizada; use el repositorio delegado.'
		);
	}

	limpiarPersonalizada(): void {
		throw new Error('MultiFuenteTasaRepository no maneja personalizada directamente.');
	}
}
