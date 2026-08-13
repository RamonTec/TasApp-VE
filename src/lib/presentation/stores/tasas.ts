import { writable, type Writable } from 'svelte/store';
import type {
	TasaBcv,
	TasaPersonalizada,
	TasaUsdt
} from '../../domain/entities/types';
import type { TasaRepository } from '../../data/repositories/TasaRepository';

export interface EstadoTasas {
	readonly bcv: TasaBcv | null;
	readonly usdt: TasaUsdt | null;
	readonly personalizada: TasaPersonalizada | null;
	readonly cargando: boolean;
	readonly errorBcv: string | null;
	readonly errorUsdt: string | null;
	readonly ultimaActualizacion: string | null;
}

const ESTADO_INICIAL: EstadoTasas = {
	bcv: null,
	usdt: null,
	personalizada: null,
	cargando: false,
	errorBcv: null,
	errorUsdt: null,
	ultimaActualizacion: null
};

export interface AccionesTasas {
	readonly cargar: (forzar?: boolean) => Promise<void>;
	readonly guardarPersonalizada: (valor: number, etiqueta: string) => void;
	readonly limpiarPersonalizada: () => void;
}

export interface StoreTasas {
	readonly store: Writable<EstadoTasas>;
	readonly acciones: AccionesTasas;
}

export function crearStoreTasas(repo: TasaRepository): StoreTasas {
	const store = writable<EstadoTasas>({
		...ESTADO_INICIAL,
		personalizada: repo.obtenerPersonalizada()
	});

	async function cargar(_forzar = false): Promise<void> {
		store.update((s) => ({ ...s, cargando: true, errorBcv: null, errorUsdt: null }));

		await Promise.all([
			(async () => {
				try {
					const bcv = await repo.obtenerBcv();
					store.update((s) => ({ ...s, bcv: bcv ?? s.bcv }));
				} catch (err) {
					store.update((s) => ({
						...s,
						errorBcv: err instanceof Error ? err.message : String(err)
					}));
				}
			})(),
			(async () => {
				try {
					const usdt = await repo.obtenerUsdt();
					store.update((s) => ({ ...s, usdt: usdt ?? s.usdt }));
				} catch (err) {
					store.update((s) => ({
						...s,
						errorUsdt: err instanceof Error ? err.message : String(err)
					}));
				}
			})()
		]);

		store.update((s) => ({
			...s,
			cargando: false,
			ultimaActualizacion: new Date().toISOString()
		}));
	}

	function guardarPersonalizada(valor: number, etiqueta: string): void {
		const t = repo.guardarPersonalizada(valor, etiqueta);
		store.update((s) => ({ ...s, personalizada: t }));
	}

	function limpiarPersonalizada(): void {
		repo.limpiarPersonalizada();
		store.update((s) => ({ ...s, personalizada: null }));
	}

	return {
		store,
		acciones: { cargar, guardarPersonalizada, limpiarPersonalizada }
	};
}
