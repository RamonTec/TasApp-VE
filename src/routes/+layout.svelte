<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { HttpTasaRepository } from '$lib/data/repositories/HttpTasaRepository';
	import { ItemRepositoryLocal } from '$lib/data/repositories/ItemRepositoryLocal';
	import { AlmacenamientoNavegador } from '$lib/infrastructure/storage/LocalStorageAdapter';
	import { crearStoreTasas } from '$lib/presentation/stores/tasas';
	import { crearStoreItems } from '$lib/presentation/stores/items';
	import {
		KEY_ESTADO,
		KEY_ACCIONES,
		KEY_CARGAR,
		type AccionesAcceso
	} from '$lib/presentation/contexto';
	import { setContext, untrack } from 'svelte';
	import Nav from '$lib/presentation/components/Nav.svelte';
	import type { EstadoTasas, AccionesTasas } from '$lib/presentation/stores/tasas';
	import type { AccionesItems } from '$lib/presentation/stores/items';
	import type { Writable } from 'svelte/store';
	import type { Item, TasaBcv, TasaPersonalizada, TasaUsdt } from '$lib/domain/entities/types';

	type DataLoad = {
		bcv?: TasaBcv | null;
		usdt?: TasaUsdt | null;
		errors?: { bcv?: string | null; usdt?: string | null } | null;
	};

	let { children, data }: { children: import('svelte').Snippet; data: DataLoad } = $props();

	function leerEstadoInicial(
		d: DataLoad,
		p: TasaPersonalizada | null
	): EstadoTasas {
		return {
			bcv: d.bcv ?? null,
			usdt: d.usdt ?? null,
			personalizada: p,
			cargando: false,
			errorBcv: d.errors?.bcv ?? null,
			errorUsdt: d.errors?.usdt ?? null,
			ultimaActualizacion: new Date().toISOString()
		};
	}

	const tasaRepo = new HttpTasaRepository();

	const tasas = crearStoreTasas(tasaRepo);

	const items = browser
		? crearStoreItems(new ItemRepositoryLocal(new AlmacenamientoNavegador()))
		: crearStoreItems({ listar: () => [], agregar: () => {}, actualizar: () => {}, eliminar: () => {}, limpiar: () => {} });

	const personalizada: TasaPersonalizada | null = browser
		? tasaRepo.obtenerPersonalizada()
		: null;

	const inicial: EstadoTasas = leerEstadoInicial(untrack(() => data), personalizada);

	tasas.store.set(inicial);

	const estadoTasas = tasas.store as unknown as Writable<EstadoTasas>;
	setContext(KEY_ESTADO, estadoTasas);

	const accionesAcceso: AccionesAcceso = {
		tasas: tasas.acciones as AccionesTasas,
		items: items.acciones as AccionesItems,
		itemsStore: items.store as Writable<Item[]>
	};
	setContext(KEY_ACCIONES, accionesAcceso);
	setContext(KEY_CARGAR, () => tasas.acciones.cargar());

	onMount(async () => {
		if (browser) {
			void tasas.acciones.cargar();
			try {
				const { registerSW } = await import('virtual:pwa-register');
				registerSW({ immediate: true });
			} catch (err) {
				console.error('Failed to register PWA', err);
			}
		}
	});
</script>

<svelte:head>
	<title>TasApp VE — Tasas BCV, USDT y conversor</title>
</svelte:head>

<div class="min-h-screen bg-[var(--color-bg-app)]">
	<Nav />
	<main class="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
		{@render children()}
	</main>
	<footer class="mt-12 border-t border-[var(--color-border-default)] py-6">
		<p
			class="mx-auto max-w-6xl px-4 text-center text-xs font-medium text-[var(--color-fg-subtle)] sm:px-6"
		>
			TasApp VE · Tasas obtenidas del BCV y Binance P2P. No constituye asesoría financiera.
		</p>
	</footer>
</div>
