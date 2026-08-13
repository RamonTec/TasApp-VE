import type { TasaBcv, TasaPersonalizada, TasaUsdt } from '../../domain/entities/types.js';

export interface TasaRepository {
	obtenerBcv(): Promise<TasaBcv | null>;
	obtenerUsdt(): Promise<TasaUsdt | null>;
	obtenerPersonalizada(): TasaPersonalizada | null;
	guardarPersonalizada(valor: number, etiqueta: string): TasaPersonalizada;
	limpiarPersonalizada(): void;
}
