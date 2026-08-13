import { describe, it, expect, beforeEach } from 'vitest';
import { AlmacenamientoNavegador } from '../infrastructure/storage/LocalStorageAdapter';

class FakeStorage {
	private store = new Map<string, string>();
	getItem(k: string): string | null {
		return this.store.get(k) ?? null;
	}
	setItem(k: string, v: string): void {
		this.store.set(k, v);
	}
	removeItem(k: string): void {
		this.store.delete(k);
	}
	clear(): void {
		this.store.clear();
	}
	readonly length = 0;
	key(): string | null {
		return null;
	}
}

describe('AlmacenamientoNavegador', () => {
	let fake: FakeStorage;
	let storage: AlmacenamientoNavegador;

	beforeEach(() => {
		fake = new FakeStorage();
		(globalThis as unknown as { window: { localStorage: FakeStorage } }).window = {
			localStorage: fake
		};
		storage = new AlmacenamientoNavegador('test:');
	});

	it('guarda y recupera JSON con prefijo', () => {
		storage.guardar('items', [{ a: 1 }]);
		expect(fake.getItem('test:items')).toBe('[{"a":1}]');
		expect(storage.obtener<{ a: number }[]>('items')).toEqual([{ a: 1 }]);
	});

	it('devuelve null si la key no existe', () => {
		expect(storage.obtener('nope')).toBeNull();
	});

	it('elimina una key', () => {
		storage.guardar('x', { v: 1 });
		storage.eliminar('x');
		expect(storage.obtener('x')).toBeNull();
	});

	it('retorna null ante JSON inválido', () => {
		fake.setItem('test:mal', '<<<no-json>>>');
		expect(storage.obtener('mal')).toBeNull();
	});
});
