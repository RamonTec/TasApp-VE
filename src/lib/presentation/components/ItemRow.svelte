<script lang="ts">
	import type { Item, Moneda } from '$lib/domain/entities/types';
	import { formatearNumero, formatearVes, formatearUsd, formatearEur, formatearUsdt } from '$lib/shared/format';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { TasasAplicables } from '$lib/domain/usecases/conversion';

	type Props = {
		item: Item;
		tasas: TasasAplicables;
		onActualizar: (cambios: Partial<Omit<Item, 'id'>>) => void;
		onEliminar: () => void;
	};

	let { item, tasas, onActualizar, onEliminar }: Props = $props();

	const monedas: Moneda[] = ['USD', 'EUR', 'USDT', 'VES'];

	let subtotal = $derived(item.precio * item.cantidad);

	let subtotalVes = $derived.by(() => {
		const tcVes = item.moneda === 'VES' ? 1 : item.moneda === 'USD' ? tasas.bcvUsd : item.moneda === 'EUR' ? tasas.bcvEur : tasas.usdtPromedio;
		return tcVes !== null && tcVes > 0 ? subtotal * tcVes : null;
	});

	function formatearSubtotal(m: Moneda, n: number): string {
		const fn = { USD: formatearUsd, EUR: formatearEur, USDT: formatearUsdt, VES: formatearVes };
		return fn[m](n);
	}
</script>

<article class="group relative grid gap-4 overflow-hidden rounded-[var(--radius-lg)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-5 transition-all duration-300 hover:border-[var(--color-accent-primary)]/40 hover:shadow-lg sm:grid-cols-[2fr,1.5fr,1fr,1.5fr,auto,auto] sm:items-center">
	<div class="sm:col-span-1">
		<span class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] sm:hidden">Nombre</span>
		<input
			type="text"
			value={item.nombre}
			aria-label="Nombre del item"
			oninput={(e) => onActualizar({ nombre: (e.target as HTMLInputElement).value })}
			class="w-full rounded-[var(--radius-md)] border-2 border-transparent bg-[var(--color-bg-subtle)] px-3 py-2 text-sm font-bold text-[var(--color-fg-default)] transition-all hover:border-[var(--color-border-default)] focus:border-[var(--color-accent-primary)] focus:bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10"
			placeholder="Nombre del item"
		/>
	</div>

	<div>
		<span class="mb-1 hidden text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] sm:block">Precio</span>
		<input
			type="text"
			inputmode="decimal"
			value={item.precio}
			aria-label="Precio"
			oninput={(e) => {
				const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.'));
				if (Number.isFinite(v) && v >= 0) onActualizar({ precio: v });
			}}
			class="tabular w-full rounded-[var(--radius-md)] border-2 border-transparent bg-[var(--color-bg-subtle)] px-3 py-2 text-sm font-bold text-[var(--color-fg-default)] transition-all hover:border-[var(--color-border-default)] focus:border-[var(--color-accent-primary)] focus:bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10"
		/>
	</div>

	<div>
		<span class="mb-1 hidden text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] sm:block">Cant.</span>
		<input
			type="number"
			min="1"
			step="1"
			value={item.cantidad}
			aria-label="Cantidad"
			oninput={(e) => {
				const v = parseInt((e.target as HTMLInputElement).value, 10);
				if (Number.isInteger(v) && v >= 1) onActualizar({ cantidad: v });
			}}
			class="tabular w-full rounded-[var(--radius-md)] border-2 border-transparent bg-[var(--color-bg-subtle)] px-3 py-2 text-sm font-bold text-[var(--color-fg-default)] transition-all hover:border-[var(--color-border-default)] focus:border-[var(--color-accent-primary)] focus:bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10"
		/>
	</div>

	<div>
		<span class="mb-1 hidden text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] sm:block">Moneda</span>
		<div class="relative">
			<select
				value={item.moneda}
				aria-label="Moneda"
				onchange={(e) => onActualizar({ moneda: (e.target as HTMLSelectElement).value as Moneda })}
				class="w-full appearance-none rounded-[var(--radius-md)] border-2 border-transparent bg-[var(--color-bg-subtle)] px-3 py-2 text-sm font-bold text-[var(--color-fg-default)] transition-all hover:border-[var(--color-border-default)] focus:border-[var(--color-accent-primary)] focus:bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10"
			>
				{#each monedas as m (m)}
					<option value={m}>{m}</option>
				{/each}
			</select>
			<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--color-fg-muted)]">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
			</div>
		</div>
	</div>

	<div class="text-right sm:min-w-[120px] sm:pt-4">
		<p class="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] sm:hidden">Subtotal</p>
		<p class="tabular text-lg font-extrabold text-[var(--color-fg-default)]">
			{formatearSubtotal(item.moneda, subtotal)}
		</p>
		{#if subtotalVes !== null && item.moneda !== 'VES'}
			<p class="tabular text-xs font-semibold text-[var(--color-fg-muted)]">
				≈ {formatearNumero(subtotalVes)} Bs.
			</p>
		{/if}
	</div>

	<button
		type="button"
		onclick={onEliminar}
		class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--color-fg-subtle)] transition-all duration-300 hover:scale-110 hover:bg-[var(--color-accent-danger-soft)] hover:text-[var(--color-accent-danger)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-danger)]/20 active:scale-95 sm:mt-4"
		aria-label="Eliminar item"
	>
		<Trash2 size={18} strokeWidth={2.5} />
	</button>
</article>
