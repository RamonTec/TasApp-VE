<script lang="ts">
	import type { Item, Moneda } from '$lib/domain/entities/types';
	import { crearItem } from '$lib/domain/entities/item';
	import type {
		TasaReferencia,
		TasasAplicables,
		TasasDisponibles
	} from '$lib/domain/usecases/conversion';
	import { calcularTotalesItems } from '$lib/domain/usecases/conversion';
	import {
		formatearUsd,
		formatearEur,
		formatearUsdt,
		formatearVes,
		formatearNumero,
		parsearMonto
	} from '$lib/shared/format';
	import ItemRow from './ItemRow.svelte';
	import SelectorTasaPills from './SelectorTasaPills.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash from '@lucide/svelte/icons/trash';

	type Props = {
		items: readonly Item[];
		tasas: TasasDisponibles;
		tasaActiva: TasaReferencia;
		onTasaActivaChange: (v: TasaReferencia) => void;
		onAgregar: (item: Item) => void;
		onActualizar: (id: string, cambios: Partial<Omit<Item, 'id'>>) => void;
		onEliminar: (id: string) => void;
		onLimpiarTodo: () => void;
	};

	let {
		items,
		tasas,
		tasaActiva,
		onTasaActivaChange,
		onAgregar,
		onActualizar,
		onEliminar,
		onLimpiarTodo
	}: Props = $props();

	let nuevoNombre = $state('');
	let nuevoPrecio = $state('');
	let nuevaCantidad = $state('1');
	let nuevaMoneda = $state<Moneda>('USD');
	let formError = $state<string | null>(null);

	let tasasAplicadas = $derived<TasasAplicables>({
		bcvUsd: tasas.bcv?.usd ?? null,
		bcvEur: tasas.bcv?.eur ?? null,
		usdtPromedio: tasas.usdt?.promedio ?? null,
		personalizada: tasas.personalizada?.valor ?? null
	});

	let totales = $derived(
		calcularTotalesItems({ items, tasas: tasasAplicadas, tasaActiva })
	);

	let colorTasaActiva = $derived.by(() => {
		if (tasaActiva === 'BCV') return 'var(--color-tasa-bcv)';
		if (tasaActiva === 'USDT') return 'var(--color-tasa-usdt)';
		return 'var(--color-tasa-personal)';
	});

	let labelTasaActiva = $derived.by(() => {
		if (tasaActiva === 'BCV') return 'BCV';
		if (tasaActiva === 'USDT') return 'USDT';
		return tasas.personalizada?.etiqueta ?? 'Personal';
	});

	function agregar(e: Event): void {
		e.preventDefault();
		formError = null;
		try {
			const nuevo = crearItem({
				nombre: nuevoNombre,
				precio: parsearMonto(nuevoPrecio),
				cantidad: parseInt(nuevaCantidad, 10),
				moneda: nuevaMoneda
			});
			onAgregar(nuevo);
			nuevoNombre = '';
			nuevoPrecio = '';
			nuevaCantidad = '1';
			nuevaMoneda = 'USD';
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Datos inválidos';
		}
	}
</script>

<div class="space-y-6">
	<div class="card overflow-hidden border-0 shadow-[var(--shadow-md)] ring-1 ring-[var(--color-border-default)] transition-all">
		<div class="bg-gradient-to-r from-[var(--color-bg-subtle)] to-[var(--color-bg-elevated)] px-6 py-4 border-b border-[var(--color-border-default)]">
			<p class="text-[11px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)]">
				Tasa a aplicar
			</p>
		</div>
		<div class="p-6 bg-[var(--color-bg-overlay)]">
			<SelectorTasaPills seleccionado={tasaActiva} {tasas} onChange={onTasaActivaChange} />
		</div>
	</div>

	<form
		onsubmit={agregar}
		class="card overflow-hidden border-0 shadow-[var(--shadow-md)] ring-1 ring-[var(--color-border-default)] transition-all duration-300 focus-within:shadow-[var(--shadow-lg)] focus-within:ring-2 focus-within:ring-[var(--color-accent-primary)]/50"
		aria-label="Agregar nuevo item"
	>
		<div class="bg-[var(--color-bg-subtle)] px-6 py-4 border-b border-[var(--color-border-default)]">
			<p class="text-[11px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] flex items-center gap-2">
				<Plus size={14} strokeWidth={3} class="text-[var(--color-accent-primary)]"/> Agregar nuevo artículo
			</p>
		</div>
		<div class="p-6">
			<div class="grid gap-4 sm:grid-cols-[2fr,1.5fr,1fr,1.5fr,auto] sm:items-end">
				<label class="block group">
					<span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] mb-1.5 block transition-colors group-focus-within:text-[var(--color-accent-primary)]">Nombre</span>
					<input
						type="text"
						bind:value={nuevoNombre}
						required
						placeholder="Ej. Arroz 1kg"
						class="w-full rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-4 py-3 text-sm font-semibold text-[var(--color-fg-default)] transition-all focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10"
					/>
				</label>

				<label class="block group">
					<span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] mb-1.5 block transition-colors group-focus-within:text-[var(--color-accent-primary)]">Precio</span>
					<input
						type="text"
						inputmode="decimal"
						bind:value={nuevoPrecio}
						required
						placeholder="0,00"
						class="tabular w-full rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-4 py-3 text-sm font-semibold text-[var(--color-fg-default)] transition-all focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10"
					/>
				</label>

				<label class="block group">
					<span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] mb-1.5 block transition-colors group-focus-within:text-[var(--color-accent-primary)]">Cant.</span>
					<input
						type="number"
						min="1"
						step="1"
						bind:value={nuevaCantidad}
						required
						class="tabular w-full rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-4 py-3 text-sm font-semibold text-[var(--color-fg-default)] transition-all focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10"
					/>
				</label>

				<label class="block group">
					<span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] mb-1.5 block transition-colors group-focus-within:text-[var(--color-accent-primary)]">Moneda</span>
					<div class="relative">
						<select
							bind:value={nuevaMoneda}
							class="w-full appearance-none rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-4 py-3 text-sm font-semibold text-[var(--color-fg-default)] transition-all focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10"
						>
							<option value="USD">USD</option>
							<option value="EUR">EUR</option>
							<option value="USDT">USDT</option>
							<option value="VES">VES</option>
						</select>
						<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-fg-muted)]">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
						</div>
					</div>
				</label>

				<button
					type="submit"
					class="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-primary)] px-6 text-sm font-bold text-[var(--color-fg-inverse)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:scale-[1.02] hover:bg-[var(--color-accent-primary-hi)] hover:shadow-[var(--shadow-md)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/30 active:scale-95 w-full sm:w-auto mt-2 sm:mt-0"
				>
					<Plus size={18} strokeWidth={3} />
					<span class="sm:hidden block">Agregar Item</span>
				</button>
			</div>

			{#if formError}
				<div class="mt-4 rounded-[var(--radius-md)] bg-[var(--color-accent-danger-soft)] p-3 border border-[var(--color-accent-danger)]/30 animate-in fade-in slide-in-from-top-2">
					<p class="text-xs font-bold text-[var(--color-accent-danger)] flex items-center gap-2">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						{formError}
					</p>
				</div>
			{/if}
		</div>
	</form>

	{#if items && items.length > 0}
		<div class="space-y-3">
			{#each items as item (item.id)}
				<ItemRow
					{item}
					tasas={tasasAplicadas}
					onActualizar={(cambios) => onActualizar(item.id, cambios)}
					onEliminar={() => onEliminar(item.id)}
				/>
			{/each}
		</div>
	{:else}
		<div class="rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-12 text-center transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-elevated)]">
			<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-elevated)] shadow-sm mb-4 border border-[var(--color-border-default)]">
				<svg class="h-8 w-8 text-[var(--color-fg-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
			</div>
			<p class="text-lg font-bold text-[var(--color-fg-default)] mb-1">
				Lista vacía
			</p>
			<p class="text-sm font-medium text-[var(--color-fg-muted)]">
				Agrega items usando el formulario de arriba para comenzar.
			</p>
		</div>
	{/if}

	{#if items && items.length > 0}
		<div class="sticky bottom-4 z-30 pt-4 animate-in slide-in-from-bottom-8 duration-500">
			<div class="card overflow-hidden border-0 ring-2 shadow-2xl backdrop-blur-2xl bg-[var(--color-bg-elevated)]/85 transition-all" style="ring-color: {colorTasaActiva}80; shadow-color: {colorTasaActiva}25;">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-5">
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2 mb-1">
							<span class="relative flex h-2.5 w-2.5">
							  <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: {colorTasaActiva};"></span>
							  <span class="relative inline-flex rounded-full h-2.5 w-2.5" style="background-color: {colorTasaActiva};"></span>
							</span>
							<p class="text-[11px] font-bold uppercase tracking-widest" style="color: {colorTasaActiva};">
								Total en {labelTasaActiva}
							</p>
							<span class="text-[10px] font-bold text-[var(--color-fg-subtle)] bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full ml-1">
								{totales.cantidadItems} {totales.cantidadItems === 1 ? 'ITEM' : 'ITEMS'}
							</span>
						</div>
						<p class="tabular text-4xl font-extrabold tracking-tight text-[var(--color-fg-default)] sm:text-5xl mt-2 drop-shadow-sm">
							{formatearVes(totales.totalVes)}
						</p>
						<div class="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs font-bold text-[var(--color-fg-muted)]">
							{#if totales.totalUsd > 0}
								<span class="tabular bg-[var(--color-bg-subtle)] px-2.5 py-1.5 rounded-md border border-[var(--color-border-default)] shadow-sm">USD {formatearUsd(totales.totalUsd)}</span>
							{/if}
							{#if totales.totalUsdt > 0}
								<span class="tabular bg-[var(--color-bg-subtle)] px-2.5 py-1.5 rounded-md border border-[var(--color-border-default)] shadow-sm">USDT {formatearUsdt(totales.totalUsdt)}</span>
							{/if}
							{#if totales.totalEur > 0}
								<span class="tabular bg-[var(--color-bg-subtle)] px-2.5 py-1.5 rounded-md border border-[var(--color-border-default)] shadow-sm">EUR {formatearEur(totales.totalEur)}</span>
							{/if}
						</div>
					</div>
					<button
						type="button"
						onclick={onLimpiarTodo}
						class="inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-danger-soft)] px-5 py-3 text-sm font-bold text-[var(--color-accent-danger)] transition-all duration-300 hover:scale-105 hover:bg-[var(--color-accent-danger)] hover:text-white hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-danger)]/20 active:scale-95 w-full sm:w-auto mt-2 sm:mt-0"
						aria-label="Vaciar lista"
					>
						<Trash size={16} strokeWidth={2.5} /> <span class="sm:hidden block">Vaciar Lista</span>
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>