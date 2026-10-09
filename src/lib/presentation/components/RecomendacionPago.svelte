<script lang="ts">
	import { onMount } from 'svelte';
	import type { TasasAplicables } from '$lib/domain/usecases/conversion';
	import {
		recomendarPago,
		type FormaDePago,
		type Tenencia
	} from '$lib/domain/usecases/calculadoraCompras';
	import { AlmacenamientoNavegador } from '$lib/infrastructure/storage/LocalStorageAdapter';
	import {
		formatearPorcentaje,
		formatearUsd,
		formatearUsdt,
		formatearVes
	} from '$lib/shared/format';
	import Sparkles from '@lucide/svelte/icons/sparkles';

	type Props = { totalBs: number; tasas: TasasAplicables };
	let { totalBs, tasas }: Props = $props();

	const KEY = 'compras:tenencia';
	const opciones: { value: Tenencia; label: string }[] = [
		{ value: 'BS', label: 'Bolívares' },
		{ value: 'USDT', label: 'USDT' },
		{ value: 'DIVISAS', label: 'Dólares' }
	];

	let tenencia = $state<Tenencia>('USDT');
	let almacen: AlmacenamientoNavegador | null = null;

	onMount(() => {
		almacen = new AlmacenamientoNavegador();
		const guardada = almacen.obtener<Tenencia>(KEY);
		if (guardada && opciones.some((o) => o.value === guardada)) tenencia = guardada;
	});

	function elegir(t: Tenencia): void {
		tenencia = t;
		almacen?.guardar(KEY, t);
	}

	let r = $derived(recomendarPago(tenencia, totalBs, tasas));

	const formatear = { BS: formatearVes, USDT: formatearUsdt, DIVISAS: formatearUsd } as const;
	let fmt = $derived(formatear[tenencia]);

	const nombres: Record<Tenencia, string> = { BS: 'bolívares', USDT: 'USDT', DIVISAS: 'dólares' };

	function etiquetaOpcion(forma: FormaDePago): string {
		if (tenencia === 'BS')
			return forma === 'BS' ? 'Pagar en Bs' : 'Comprar dólares y pagar en divisas';
		const quien = tenencia === 'USDT' ? 'USDT' : 'dólares';
		return forma === 'BS' ? `Cambiar tus ${quien} a Bs y pagar en Bs` : `Pagar directo en ${quien}`;
	}

	let titulo = $derived.by(() => {
		if (!r) return '';
		if (r.mejor.forma === 'BS') {
			return tenencia === 'BS'
				? 'Paga en bolívares'
				: `Cambia tus ${nombres[tenencia]} a Bs y paga en bolívares`;
		}
		return tenencia === 'BS'
			? 'Compra dólares y paga en divisas'
			: `Paga directo en ${nombres[tenencia]}`;
	});
</script>

<section class="card overflow-hidden" aria-labelledby="pago-titulo">
	<div class="border-b border-[var(--color-border-default)] px-5 py-4">
		<h2 id="pago-titulo" class="text-base font-semibold text-[var(--color-fg-default)]">
			¿Con qué vas a pagar?
		</h2>
		<p class="mt-0.5 text-sm text-[var(--color-fg-muted)]">Te decimos qué te sale más barato.</p>
	</div>

	<div class="p-5">
		<div
			class="grid grid-cols-3 gap-1 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] p-1"
			role="radiogroup"
			aria-label="Lo que tienes para pagar"
		>
			{#each opciones as o (o.value)}
				<button
					type="button"
					role="radio"
					aria-checked={tenencia === o.value}
					onclick={() => elegir(o.value)}
					class="rounded-[var(--radius-sm)] px-2 py-2 text-sm font-semibold transition-colors {tenencia ===
					o.value
						? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-default)] shadow-[var(--shadow-sm)]'
						: 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'}"
				>
					{o.label}
				</button>
			{/each}
		</div>

		{#if r}
			<div aria-live="polite">
				<div
					class="mt-4 rounded-[var(--radius-md)] bg-[var(--color-accent-success-soft)] px-4 py-3"
				>
					<p
						class="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent-success)]"
					>
						<Sparkles size={15} strokeWidth={2.25} />
						{titulo}
					</p>
					{#if r.alternativa && r.ahorro > 0.005}
						<p class="mt-0.5 text-xs text-[var(--color-fg-muted)]">
							Te ahorras <span class="tabular font-semibold text-[var(--color-fg-default)]"
								>{fmt(r.ahorro)}</span
							>
							({formatearPorcentaje(r.ahorroPct).replace('+', '')}).
						</p>
					{:else if !r.alternativa}
						<p class="mt-0.5 text-xs text-[var(--color-fg-muted)]">
							Sin tasa USDT no podemos comparar otras opciones.
						</p>
					{/if}
				</div>

				<ul
					class="mt-3 divide-y divide-[var(--color-border-default)] rounded-[var(--radius-md)] border border-[var(--color-border-default)]"
				>
					{#each [r.mejor, r.alternativa].filter((o) => o !== null) as o, i (o.forma)}
						<li class="flex items-baseline justify-between gap-3 px-3 py-2.5">
							<p
								class="min-w-0 text-sm {i === 0
									? 'font-semibold text-[var(--color-fg-default)]'
									: 'text-[var(--color-fg-muted)]'}"
							>
								{etiquetaOpcion(o.forma)}
							</p>
							<p
								class="tabular shrink-0 text-sm font-bold {i === 0
									? 'text-[var(--color-accent-success)]'
									: 'text-[var(--color-fg-muted)] line-through decoration-1'}"
							>
								{fmt(o.costo)}
							</p>
						</li>
					{/each}
				</ul>

				{#if tenencia === 'DIVISAS' && r.alternativa}
					<p class="mt-3 text-xs text-[var(--color-fg-subtle)]">
						Calculado con la tasa USDT. Al cambiar efectivo suelen darte un poco menos.
					</p>
				{/if}
			</div>
		{:else}
			<p class="mt-4 text-sm text-[var(--color-fg-muted)]">
				Suma algo en la calculadora para ver la recomendación.
			</p>
		{/if}
	</div>
</section>
