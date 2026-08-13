import { getContext } from 'svelte';
import type { Writable } from 'svelte/store';
import type { Item } from '../domain/entities/types';
import type { AccionesTasas, EstadoTasas } from './stores/tasas';
import type { AccionesItems } from './stores/items';

export const KEY_ESTADO = Symbol('tasapp-estado');
export const KEY_ACCIONES = Symbol('tasapp-acciones');
export const KEY_CARGAR = Symbol('tasapp-cargar');

export interface AccionesAcceso {
	readonly tasas: AccionesTasas;
	readonly items: AccionesItems;
	readonly itemsStore: Writable<Item[]>;
}

export function getEstadoTasas(): Writable<EstadoTasas> {
	const s = getContext<Writable<EstadoTasas>>(KEY_ESTADO);
	if (!s) throw new Error('EstadoTasas no inicializado');
	return s;
}

export function getAcciones(): AccionesAcceso {
	const a = getContext<AccionesAcceso>(KEY_ACCIONES);
	if (!a) throw new Error('Acciones no inicializadas');
	return a;
}

export function getCargarTasas(): () => Promise<void> {
	const c = getContext<() => Promise<void>>(KEY_CARGAR);
	if (!c) throw new Error('CargarTasas no inicializado');
	return c;
}
