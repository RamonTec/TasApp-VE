<script lang="ts">
	import { onMount } from 'svelte';
	import type { Item, Moneda } from '$lib/domain/entities/types';
	import {
		calcularPresupuesto,
		tasasAplicables,
		type TasaReferencia,
		type TasasDisponibles
	} from '$lib/domain/usecases/conversion';
	import { AlmacenamientoNavegador } from '$lib/infrastructure/storage/LocalStorageAdapter';
	import {
		formatearEur,
		formatearUsd,
		formatearUsdt,
		formatearVes,
		parsearMonto
	} from '$lib/shared/format';
	import Wallet from '@lucide/svelte/icons/wallet';

	type Props = { items: readonly Item[]; tasas: TasasDisponibles };
	let { items, tasas }: Props = $props();

	const KEY = 'items:presupuesto';
	const monedas: Moneda[] = ['USD', 'VES', 'USDT', 'EUR'];

	let texto = $state('');
	let moneda = $state<Moneda>('USD');
	let almacen: AlmacenamientoNavegador | null = null;

	onMount(() => {
		almacen = new AlmacenamientoNavegador();
		const guardado = almacen.obtener<{ texto: string; moneda: Moneda }>(KEY);
		if (guardado && monedas.includes(guardado.moneda)) {
			texto = guardado.texto;
			moneda = guardado.moneda;
		}
	});

	$effect(() => {
		almacen?.guardar(KEY, { texto, moneda });
	});

	let monto = $derived(parsearMonto(texto));

	let resultados = $derived(
		Number.isFinite(monto) && monto > 0
			? calcularPresupuesto(items, { monto, moneda }, tasasAplicables(tasas))
			: []
	);

	const formateadores = {
		USD: formatearUsd,
		EUR: formatearEur,
		USDT: formatearUsdt,
		VES: formatearVes
	} as const;

	function etiquetaRef(ref: TasaReferencia): string {
		if (ref === 'BCV') return 'BCV';
		if (ref === 'USDT') return 'USDT';
		return tasas.personalizada?.etiqueta ?? 'Personal';
	}

	const colores = {
		BCV: 'var(--color-tasa-bcv)',
		USDT: 'var(--color-tasa-usdt)',
		PERSONALIZADA: 'var(--color-tasa-personal)'
	} as const;
</script>

<section class="card overflow-hidden" aria-labelledby="presupuesto-titulo">
	<div class="flex items-center gap-2.5 border-b border-[var(--color-border-default)] px-5 py-4">
		<span class="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-primary-soft)] text-[var(--color-accent-primary)]">
			<Wallet size={16} strokeWidth={2.25} />
		</span>
		<div>
			<h2 id="presupuesto-titulo" class="text-base font-semibold text-[var(--color-fg-default)]">
				¿Te alcanza?
			</h2>
			<p class="text-sm text-[var(--color-fg-muted)]">Escribe cuánto tienes y compáralo con tu lista.</p>
		</div>
	</div>

	<div class="p-5">
		<div class="flex gap-2">
			<input
				type="text"
				inputmode="decimal"
				autocomplete="off"
				bind:value={texto}
				placeholder="Cuánto tienes"
				aria-label="Monto disponible"
				class="tabular min-w-0 flex-1 rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-3 text-xl font-semibold text-[var(--color-fg-default)] focus:border-[var(--color-accent-primary)] focus:bg-[var(--color-bg-elevated)] focus:outline-none"
			/>
			<select
				bind:value={moneda}
				aria-label="Moneda del monto disponible"
				class="rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-3 text-sm font-semibold text-[var(--color-fg-default)] focus:border-[var(--color-accent-primary)] focus:outline-none"
			>
				{#each monedas as m (m)}
					<option value={m}>{m === 'VES' ? 'Bs.' : m}</option>
				{/each}
			</select>
		</div>

		{#if resultados.length > 0}
			<ul class="mt-4 grid gap-2 sm:grid-cols-3" aria-live="polite">
				{#each resultados as r (r.ref)}
					<li
						class="rounded-[var(--radius-md)] border px-3 py-2.5"
						style="border-color: {r.alcanza ? 'var(--color-accent-success)' : 'var(--color-accent-danger)'}; background-color: {r.alcanza ? 'var(--color-accent-success-soft)' : 'var(--color-accent-danger-soft)'}"
					>
						<p class="text-[11px] font-semibold uppercase tracking-wider" style="color: {colores[r.ref]}">
							A tasa {etiquetaRef(r.ref)}
						</p>
						<p class="tabular text-lg font-bold" style="color: {r.alcanza ? 'var(--color-accent-success)' : 'var(--color-accent-danger)'}">
							{r.alcanza ? 'Te sobran' : 'Te faltan'}
							{formateadores[moneda](Math.abs(r.restante))}
						</p>
						<p class="tabular text-xs text-[var(--color-fg-muted)]">
							Total: {formateadores[moneda](r.totalEnMoneda)}
						</p>
					</li>
				{/each}
			</ul>
		{:else if Number.isFinite(monto) && monto > 0}
			<p class="mt-3 text-sm text-[var(--color-fg-muted)]">No hay tasas disponibles para comparar.</p>
		{/if}
	</div>
</section>
