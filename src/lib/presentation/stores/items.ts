import { writable, type Writable } from 'svelte/store';
import type { Item } from '../../domain/entities/types';
import type { ItemRepository } from '../../data/repositories/ItemRepository';

export interface AccionesItems {
	readonly agregar: (item: Item) => void;
	readonly actualizar: (id: string, cambios: Partial<Omit<Item, 'id'>>) => void;
	readonly eliminar: (id: string) => void;
	readonly limpiar: () => void;
}

export interface StoreItems {
	readonly store: Writable<Item[]>;
	readonly acciones: AccionesItems;
}

export function crearStoreItems(repo: ItemRepository): StoreItems {
	const store = writable<Item[]>([...repo.listar()]);

	function agregar(item: Item): void {
		repo.agregar(item);
		store.update((items) => [...items, item]);
	}

	function actualizar(id: string, cambios: Partial<Omit<Item, 'id'>>): void {
		repo.actualizar(id, cambios);
		store.update((items) => items.map((it) => (it.id === id ? { ...it, ...cambios } : it)));
	}

	function eliminar(id: string): void {
		repo.eliminar(id);
		store.update((items) => items.filter((it) => it.id !== id));
	}

	function limpiar(): void {
		repo.limpiar();
		store.set([]);
	}

	return {
		store,
		acciones: { agregar, actualizar, eliminar, limpiar }
	};
}
