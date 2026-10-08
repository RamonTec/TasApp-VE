import type { TasaBcv, TasaPersonalizada, TasaUsdt } from '../../domain/entities/types';
import type { StoragePort } from '../../infrastructure/storage/LocalStorageAdapter.js';
import type { TasaRepository } from '../../data/repositories/TasaRepository.js';
import {
	MultiFuenteTasaRepository,
	MultiFuenteError
} from './MultiFuenteTasaRepository';

const KEY_CACHE_BCV = 'cache:bcv';
const KEY_CACHE_USDT = 'cache:usdt';
const KEY_PERSONALIZADA = 'tasa:personalizada';
const TTL_MS_BCV = 60 * 60 * 1000;
const TTL_MS_USDT = 5 * 60 * 1000;

interface CacheTasa<T> {
	readonly valor: T;
	readonly expira: number;
}

export class TasaRepositoryLocal implements TasaRepository {
	private bcvCache: CacheTasa<TasaBcv> | null = null;
	private usdtCache: CacheTasa<TasaUsdt> | null = null;
	private readonly multi: MultiFuenteTasaRepository;

	constructor(
		private readonly storage: StoragePort,
		reloj: () => number = () => Date.now()
	) {
		this.bcvCache = this.storage.obtener<CacheTasa<TasaBcv>>(KEY_CACHE_BCV);
		this.usdtCache = this.storage.obtener<CacheTasa<TasaUsdt>>(KEY_CACHE_USDT);
		this.multi = new MultiFuenteTasaRepository(() => this.obtenerPersonalizada());
		void reloj;
	}

	async obtenerBcv(): Promise<TasaBcv> {
		const cache = this.bcvCache;
		if (cache && cache.expira > Date.now()) {
			return cache.valor;
		}
		try {
			const tasa = await this.multi.obtenerBcv();
			this.bcvCache = { valor: tasa, expira: Date.now() + TTL_MS_BCV };
			this.storage.guardar(KEY_CACHE_BCV, this.bcvCache);
			return tasa;
		} catch (err) {
			if (cache) return cache.valor;
			if (err instanceof MultiFuenteError) throw new Error(err.message);
			throw err;
		}
	}

	async obtenerUsdt(): Promise<TasaUsdt> {
		const cache = this.usdtCache;
		if (cache && cache.expira > Date.now()) {
			return cache.valor;
		}
		try {
			const tasa = await this.multi.obtenerUsdt();
			this.usdtCache = { valor: tasa, expira: Date.now() + TTL_MS_USDT };
			this.storage.guardar(KEY_CACHE_USDT, this.usdtCache);
			return tasa;
		} catch (err) {
			if (cache) return cache.valor;
			if (err instanceof MultiFuenteError) throw new Error(err.message);
			throw err;
		}
	}

	obtenerPersonalizada(): TasaPersonalizada | null {
		return this.storage.obtener<TasaPersonalizada>(KEY_PERSONALIZADA);
	}

	guardarPersonalizada(valor: number, etiqueta: string): TasaPersonalizada {
		const tasa: TasaPersonalizada = {
			fuente: 'PERSONALIZADA',
			valor,
			etiqueta: etiqueta.trim() || 'Personalizada',
			fecha: new Date().toISOString()
		};
		this.storage.guardar(KEY_PERSONALIZADA, tasa);
		return tasa;
	}

	limpiarPersonalizada(): void {
		this.storage.eliminar(KEY_PERSONALIZADA);
	}
}
