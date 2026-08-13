import type { Item } from '../../domain/entities/types.js';
import type { StoragePort } from '../../infrastructure/storage/LocalStorageAdapter.js';
import type { ItemRepository } from '../repositories/ItemRepository.js';

const KEY_ITEMS = 'items:lista';

export class ItemRepositoryLocal implements ItemRepository {
	private items: Item[];

	constructor(private readonly storage: StoragePort) {
		this.items = this.storage.obtener<Item[]>(KEY_ITEMS) ?? [];
	}

	private guardar(): void {
		this.storage.guardar(KEY_ITEMS, this.items);
	}

	listar(): readonly Item[] {
		return this.items;
	}

	agregar(item: Item): void {
		this.items = [...this.items, item];
		this.guardar();
	}

	actualizar(id: string, cambios: Partial<Omit<Item, 'id'>>): void {
		this.items = this.items.map((it) => (it.id === id ? { ...it, ...cambios } : it));
		this.guardar();
	}

	eliminar(id: string): void {
		this.items = this.items.filter((it) => it.id !== id);
		this.guardar();
	}

	limpiar(): void {
		this.items = [];
		this.guardar();
	}
}
