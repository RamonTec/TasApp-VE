<script lang="ts">
	import type { TasasDisponibles, TasaReferencia } from '$lib/domain/usecases/conversion';
	import { formatearTasa } from '$lib/shared/format';

	type Props = {
		seleccionado: TasaReferencia;
		tasas: TasasDisponibles;
		onChange: (v: TasaReferencia) => void;
	};

	let { seleccionado, tasas, onChange }: Props = $props();

	interface Pill {
		value: TasaReferencia;
		label: string;
		valor: number | null;
		color: string;
		bg: string;
	}

	let pills = $derived<Pill[]>([
		{
			value: 'BCV',
			label: 'BCV',
			valor: tasas.bcv?.usd ?? null,
			color: 'var(--color-tasa-bcv)',
			bg: 'var(--color-accent-info-soft)'
		},
		{
			value: 'USDT',
			label: 'USDT',
			valor: tasas.usdt?.promedio ?? null,
			color: 'var(--color-tasa-usdt)',
			bg: 'var(--color-accent-warning-soft)'
		},
		{
			value: 'PERSONALIZADA',
			label: tasas.personalizada?.etiqueta ?? 'Personal',
			valor: tasas.personalizada?.valor ?? null,
			color: 'var(--color-tasa-personal)',
			bg: 'var(--color-bg-subtle)'
		}
	]);
</script>

<div class="flex flex-wrap gap-2">
	{#each pills as pill (pill.value)}
		<button
			type="button"
			onclick={() => onChange(pill.value)}
			disabled={pill.valor === null}
			class="group flex flex-col items-start rounded-[var(--radius-md)] border px-3 py-2 text-left transition-all {seleccionado === pill.value
				? 'border-transparent shadow-[var(--shadow-md)]'
				: 'border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-strong)]'}"
			style={seleccionado === pill.value ? `background-color: ${pill.bg}; border-color: ${pill.color};` : ''}
		>
			<span
				class="text-[10px] font-semibold uppercase tracking-wider"
				style={seleccionado === pill.value ? `color: ${pill.color};` : 'color: var(--color-fg-muted);'}
			>
				{pill.label}
			</span>
			{#if pill.valor !== null}
				<span class="tabular text-sm font-semibold text-[var(--color-fg-default)]">
					{formatearTasa(pill.valor)}
				</span>
			{:else}
				<span class="text-xs text-[var(--color-fg-subtle)]">N/A</span>
			{/if}
		</button>
	{/each}
</div>