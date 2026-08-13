<script lang="ts">
	import type { TasasAplicables, TasasDisponibles } from '$lib/domain/usecases/conversion';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	type Opcion = { value: 'BCV' | 'USDT' | 'PERSONALIZADA'; label: string; disponible: boolean };

	type Props = {
		seleccionado: 'BCV' | 'USDT' | 'PERSONALIZADA';
		tasas: TasasDisponibles;
		onChange: (v: 'BCV' | 'USDT' | 'PERSONALIZADA') => void;
	};

	let { seleccionado = $bindable(), tasas, onChange }: Props = $props();

	let opciones: Opcion[] = $derived([
		{
			value: 'BCV',
			label: 'BCV (oficial)',
			disponible: tasas.bcv !== null
		},
		{
			value: 'USDT',
			label: 'USDT Binance P2P',
			disponible: tasas.usdt !== null
		},
		{
			value: 'PERSONALIZADA',
			label: tasas.personalizada?.etiqueta ?? 'Personalizada',
			disponible: tasas.personalizada !== null
		}
	]);

	let opcionActual = $derived(
		opciones.find((o) => o.value === seleccionado) ?? opciones[0]
	);

	function handleChange(e: Event) {
		const valor = (e.target as HTMLSelectElement).value as Opcion['value'];
		onChange(valor);
	}
</script>

<label class="block">
	<span class="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
		Tasa a aplicar
	</span>
	<div class="relative mt-1.5">
		<select
			value={seleccionado}
			onchange={handleChange}
			class="w-full appearance-none rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-3 py-2.5 pr-10 text-sm font-medium text-[var(--color-fg-default)] transition-colors focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/20"
		>
			{#each opciones as op (op.value)}
				<option value={op.value} disabled={!op.disponible}>
					{op.label}{!op.disponible ? ' (no disponible)' : ''}
				</option>
			{/each}
		</select>
		<ChevronDown
			size={16}
			strokeWidth={2.25}
			class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-subtle)]"
		/>
	</div>
</label>
