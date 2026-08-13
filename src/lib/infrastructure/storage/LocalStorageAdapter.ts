export interface StoragePort {
	obtener<T>(key: string): T | null;
	guardar<T>(key: string, valor: T): void;
	eliminar(key: string): void;
}

export class AlmacenamientoNavegador implements StoragePort {
	private readonly prefijo: string;
	private readonly storage: Storage | null;

	constructor(prefijo: string = 'tasapp:') {
		this.prefijo = prefijo;
		this.storage = typeof window !== 'undefined' ? window.localStorage : null;
	}

	private keyCompleta(key: string): string {
		return `${this.prefijo}${key}`;
	}

	obtener<T>(key: string): T | null {
		if (!this.storage) return null;
		const raw = this.storage.getItem(this.keyCompleta(key));
		if (raw === null) return null;
		try {
			return JSON.parse(raw) as T;
		} catch {
			return null;
		}
	}

	guardar<T>(key: string, valor: T): void {
		if (!this.storage) return;
		try {
			this.storage.setItem(this.keyCompleta(key), JSON.stringify(valor));
		} catch (err) {
			console.warn('[storage] no se pudo guardar', key, err);
		}
	}

	eliminar(key: string): void {
		if (!this.storage) return;
		this.storage.removeItem(this.keyCompleta(key));
	}
}

export class AlmacenamientoServidor implements StoragePort {
	private readonly cache = new Map<string, unknown>();

	obtener<T>(_key: string): T | null {
		return null;
	}

	guardar<T>(key: string, valor: T): void {
		this.cache.set(key, valor);
	}

	eliminar(key: string): void {
		this.cache.delete(key);
	}
}
