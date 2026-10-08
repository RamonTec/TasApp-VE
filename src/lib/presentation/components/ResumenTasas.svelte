<script lang="ts">
	import type { TasaBcv, TasaUsdt } from '$lib/domain/entities/types';
	import type { Diferencia } from '$lib/domain/entities/types';
	import { formatearPorcentaje, formatearTasa } from '$lib/shared/format';

	type Props = {
		bcv: TasaBcv | null;
		usdt: TasaUsdt | null;
		diferencia: Diferencia | null;
		cargando: boolean;
	};
	let { bcv, usdt, diferencia, cargando }: Props = $props();

	let tiles = $derived([
		{ etiqueta: 'Dólar BCV', valor: bcv?.usd ?? null, color: 'var(--color-tasa-bcv)' },
		{ etiqueta: 'USDT Binance', valor: usdt?.promedio ?? null, color: 'var(--color-tasa-usdt)' },
		{ etiqueta: 'Euro BCV', valor: bcv && bcv.eur > 0 ? bcv.eur : null, color: 'var(--color-tasa-bcv)' }
	]);
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
	{#each tiles as t (t.etiqueta)}
		<div class="card relative overflow-hidden px-4 py-3">
			<div class="absolute inset-y-0 left-0 w-1" style="background-color: {t.color}" aria-hidden="true"></div>
			<p class="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
				{t.etiqueta}
			</p>
			{#if t.valor !== null}
				<p class="tabular mt-0.5 text-2xl font-semibold tracking-tight text-[var(--color-fg-default)]">
					{formatearTasa(t.valor)}
				</p>
			{:else}
				<p class="mt-0.5 text-2xl font-semibold text-[var(--color-fg-subtle)]" aria-label={cargando ? 'Cargando' : 'No disponible'}>
					{cargando ? '…' : '—'}
				</p>
			{/if}
		</div>
	{/each}
	<div class="card relative overflow-hidden px-4 py-3">
		<div class="absolute inset-y-0 left-0 w-1 bg-[var(--color-diff-negativa)]" aria-hidden="true"></div>
		<p class="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
			Brecha
		</p>
		{#if diferencia}
			<p class="tabular mt-0.5 text-2xl font-semibold tracking-tight text-[var(--color-fg-default)]">
				{formatearPorcentaje(diferencia.porcentual)}
			</p>
		{:else}
			<p class="mt-0.5 text-2xl font-semibold text-[var(--color-fg-subtle)]">—</p>
		{/if}
	</div>
</div>
