import { TasaRepositoryLocal } from './repositories/TasaRepositoryLocal';
import { ItemRepositoryLocal } from '../data/repositories/ItemRepositoryLocal';
import { AlmacenamientoServidor } from '../infrastructure/storage/LocalStorageAdapter';
import type { TasaRepository } from '../data/repositories/TasaRepository';
import type { ItemRepository } from '../data/repositories/ItemRepository';

export interface ContenedorServidor {
	readonly tasaRepository: TasaRepository;
	readonly itemRepository: ItemRepository;
}

let instancia: ContenedorServidor | null = null;

export function obtenerContenedorServidor(): ContenedorServidor {
	if (instancia) return instancia;
	const storage = new AlmacenamientoServidor();
	instancia = {
		tasaRepository: new TasaRepositoryLocal(storage),
		itemRepository: new ItemRepositoryLocal(storage)
	};
	return instancia;
}
