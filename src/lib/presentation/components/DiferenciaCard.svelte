<script lang="ts">
	import type { Diferencia } from '$lib/domain/entities/types';
	import { formatearPorcentaje, formatearTasa } from '$lib/shared/format';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Minus from '@lucide/svelte/icons/minus';

	type Props = { diferencia: Diferencia | null };
	let { diferencia }: Props = $props();

	let icono = $derived(
		diferencia === null
			? Minus
			: diferencia.mayor === 'USDT'
				? TrendingUp
				: diferencia.absoluta > 0
					? TrendingUp
					: Minus
	);

	let color = $derived(
		diferencia === null
			? 'var(--color-fg-muted)'
			: diferencia.absoluta === 0
				? 'var(--color-fg-muted)'
				: diferencia.mayor === 'USDT'
					? 'var(--color-diff-negativa)'
					: 'var(--color-diff-positiva)'
	);

	let bgSoft = $derived(
		diferencia === null
			? 'var(--color-bg-subtle)'
			: diferencia.absoluta === 0
				? 'var(--color-bg-subtle)'
				: diferencia.mayor === 'USDT'
					? 'var(--color-accent-danger-soft)'
					: 'var(--color-accent-success-soft)'
	);

	let frase = $derived.by(() => {
		if (diferencia === null) return 'Sin datos suficientes';
		if (diferencia.absoluta === 0) return 'Las tasas están igualadas';
		return diferencia.mayor === 'USDT'
			? 'El paralelo está por encima del BCV'
			: 'El BCV está por encima del paralelo';
	});
</script>

<div class="card relative h-full overflow-hidden">
	<div class="absolute inset-x-0 top-0 h-1" style="background-color: {color}" aria-hidden="true"></div>

	<div class="flex items-start justify-between gap-3 p-5 pb-3">
		<div class="flex items-center gap-2.5">
			<span class="grid h-9 w-9 place-items-center rounded-[var(--radius-md)]" style="background-color: {bgSoft}; color: {color}">
				{#if diferencia}
					{@const Icon = icono}
					<Icon size={16} strokeWidth={2.25} />
				{:else}
					<Minus size={16} strokeWidth={2.25} />
				{/if}
			</span>
			<p class="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
				Diferencia BCV vs USDT
			</p>
		</div>
	</div>

	<div class="px-5 pb-5">
		{#if diferencia}
			<div class="tabular text-[40px] font-semibold leading-none tracking-tight" style="color: {color}">
				{formatearPorcentaje(diferencia.porcentual)}
			</div>
			<p class="mt-2 text-xs font-medium text-[var(--color-fg-muted)]">
				{frase}
			</p>
			<p class="mt-3 flex items-baseline gap-1.5 text-xs text-[var(--color-fg-muted)]">
				<span class="font-semibold text-[var(--color-fg-default)] tabular">Bs. {formatearTasa(diferencia.absoluta)}</span>
				<span>por dólar</span>
			</p>
		{:else}
			<p class="text-sm text-[var(--color-fg-muted)]">No se pueden comparar tasas en este momento.</p>
		{/if}
	</div>
</div>
