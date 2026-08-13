import type { Item } from '../../domain/entities/types.js';

export interface ItemRepository {
	listar(): readonly Item[];
	agregar(item: Item): void;
	actualizar(id: string, cambios: Partial<Omit<Item, 'id'>>): void;
	eliminar(id: string): void;
	limpiar(): void;
}
