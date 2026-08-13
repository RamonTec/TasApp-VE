import type {
	TasaBcv,
	TasaPersonalizada,
	TasaUsdt
} from '../../domain/entities/types';
import type { TasaRepository } from '../repositories/TasaRepository';

const KEY_PERSONALIZADA = 'tasapp:tasa:personalizada';

interface RespuestaBcv {
	readonly ok: boolean;
	readonly data?: TasaBcv;
	readonly error?: string;
}

interface RespuestaUsdt {
	readonly ok: boolean;
	readonly data?: TasaUsdt;
	readonly error?: string;
}

function leerPersonalizadaLocal(): TasaPersonalizada | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(KEY_PERSONALIZADA);
		return raw ? (JSON.parse(raw) as TasaPersonalizada) : null;
	} catch {
		return null;
	}
}

function escribirPersonalizadaLocal(t: TasaPersonalizada | null): void {
	if (typeof window === 'undefined') return;
	try {
		if (t === null) localStorage.removeItem(KEY_PERSONALIZADA);
		else localStorage.setItem(KEY_PERSONALIZADA, JSON.stringify(t));
	} catch {
		/* ignore */
	}
}

export class HttpTasaRepository implements TasaRepository {
	private personalizadaCache: TasaPersonalizada | null = null;
	private personalizadaCargada = false;

	private asegurarPersonalizada(): TasaPersonalizada | null {
		if (!this.personalizadaCargada) {
			this.personalizadaCache = leerPersonalizadaLocal();
			this.personalizadaCargada = true;
		}
		return this.personalizadaCache;
	}

	async obtenerBcv(): Promise<TasaBcv> {
		const res = await fetch('/api/tasas/bcv', { headers: { Accept: 'application/json' } });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status} consultando /api/tasas/bcv`);
		}
		const json = (await res.json()) as RespuestaBcv;
		if (!json.ok || !json.data) {
			throw new Error(json.error ?? 'Respuesta inválida del servidor');
		}
		return json.data;
	}

	async obtenerUsdt(): Promise<TasaUsdt> {
		const res = await fetch('/api/tasas/usdt', { headers: { Accept: 'application/json' } });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status} consultando /api/tasas/usdt`);
		}
		const json = (await res.json()) as RespuestaUsdt;
		if (!json.ok || !json.data) {
			throw new Error(json.error ?? 'Respuesta inválida del servidor');
		}
		return json.data;
	}

	obtenerPersonalizada(): TasaPersonalizada | null {
		return this.asegurarPersonalizada();
	}

	guardarPersonalizada(valor: number, etiqueta: string): TasaPersonalizada {
		const tasa: TasaPersonalizada = {
			fuente: 'PERSONALIZADA',
			valor,
			etiqueta: etiqueta.trim() || 'Personalizada',
			fecha: new Date().toISOString()
		};
		this.personalizadaCache = tasa;
		this.personalizadaCargada = true;
		escribirPersonalizadaLocal(tasa);
		return tasa;
	}

	limpiarPersonalizada(): void {
		this.personalizadaCache = null;
		this.personalizadaCargada = true;
		escribirPersonalizadaLocal(null);
	}
}
