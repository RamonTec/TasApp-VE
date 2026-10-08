<script lang="ts">
	import type { TasaBcv, TasaUsdt, TasaPersonalizada } from '$lib/domain/entities/types';
	import { formatearTasa, formatearFecha, tiempoRelativo } from '$lib/shared/format';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Coins from '@lucide/svelte/icons/coins';
	import UserRound from '@lucide/svelte/icons/user-round';
	import ServerCog from '@lucide/svelte/icons/server-cog';

	type TasaUnificada =
		| { tipo: 'BCV'; tasa: TasaBcv }
		| { tipo: 'USDT'; tasa: TasaUsdt }
		| { tipo: 'PERSONALIZADA'; tasa: TasaPersonalizada };

	type Props = TasaUnificada;

	let props: Props = $props();

	const estilos = {
		BCV: {
			color: 'var(--color-tasa-bcv)',
			bg: 'var(--color-accent-info-soft)',
			icono: Building2,
			etiqueta: 'BCV Oficial'
		},
		USDT: {
			color: 'var(--color-tasa-usdt)',
			bg: 'var(--color-accent-warning-soft)',
			icono: Coins,
			etiqueta: 'USDT Binance'
		},
		PERSONALIZADA: {
			color: 'var(--color-tasa-personal)',
			bg: 'var(--color-bg-subtle)',
			icono: UserRound,
			etiqueta: 'Personalizada'
		}
	} as const;

	let cfg = $derived(estilos[props.tipo]);
	let Icono = $derived(cfg.icono);

	let principal = $derived.by(() => {
		if (props.tipo === 'BCV') return props.tasa.usd;
		if (props.tipo === 'USDT') return props.tasa.promedio;
		return props.tasa.valor;
	});

	let unidadPrincipal = $derived(props.tipo === 'USDT' ? 'USDT' : 'USD');

	let fecha = $derived(
		props.tipo === 'BCV'
			? props.tasa.fecha
			: props.tipo === 'USDT'
				? props.tasa.fecha
				: props.tasa.fecha
	);

	let fuenteOrigen = $derived.by(() => {
		if (props.tipo === 'PERSONALIZADA') return 'Ingresada por ti';
		return props.tasa.fuenteUsada ?? (props.tipo === 'BCV' ? 'bcv.org.ve' : 'Binance P2P');
	});

	let esFallback = $derived(
		(props.tipo === 'BCV' && props.tasa.fuenteUsada === 'bcv.org.ve') ||
			(props.tipo === 'USDT' && (props.tasa.fuenteUsada ?? '').startsWith('ve.dolarapi'))
	);
</script>

<article class="card relative h-full overflow-hidden">
	<div
		class="absolute inset-x-0 top-0 h-1"
		style="background-color: {cfg.color}"
		aria-hidden="true"
	></div>

	<div class="flex items-start justify-between gap-3 p-5 pb-3">
		<div class="flex items-center gap-2.5">
			<span
				class="grid h-9 w-9 place-items-center rounded-[var(--radius-md)]"
				style="background-color: {cfg.bg}; color: {cfg.color}"
			>
				<Icono size={16} strokeWidth={2.25} />
			</span>
			<div class="leading-tight">
				<p class="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
					{cfg.etiqueta}
				</p>
				<p class="text-[11px] font-medium text-[var(--color-fg-subtle)] tabular">
					{tiempoRelativo(fecha)}
				</p>
				<div
					class="mt-1.5 inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-fg-muted)]"
				>
					<ServerCog size={10} strokeWidth={2.25} />
					<span class="truncate">Fuente: {fuenteOrigen}</span>
					{#if esFallback}
						<span
							class="font-semibold text-[var(--color-accent-warning)]"
							title="Fuente primaria no disponible"
						>·fallback</span>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="px-5 pb-4">
		<div class="flex items-baseline gap-1.5">
			<span class="text-[11px] font-medium text-[var(--color-fg-subtle)]">Bs. por</span>
			<span class="text-[11px] font-semibold uppercase text-[var(--color-fg-muted)]">{unidadPrincipal}</span>
		</div>
		<div
			class="tabular mt-0.5 text-[40px] font-semibold leading-none tracking-tight text-[var(--color-fg-default)]"
		>
			{formatearTasa(principal)}
		</div>
	</div>

	<div class="border-t border-[var(--color-border-default)] px-5 py-3">
		{#if props.tipo === 'BCV'}
			<div class="flex items-center justify-between text-xs">
				<p class="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">EUR</p>
				{#if props.tasa.eur > 0}
					<p class="tabular text-sm font-semibold text-[var(--color-fg-default)]">
						€ {formatearTasa(props.tasa.eur)}
					</p>
				{:else}
					<p class="text-sm text-[var(--color-fg-subtle)]">No disponible</p>
				{/if}
			</div>
		{:else if props.tipo === 'USDT'}
			<div class="grid grid-cols-2 gap-3 text-xs">
				<div>
					<p class="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
						Compras a
					</p>
					<p class="tabular text-sm font-semibold text-[var(--color-fg-default)]">
						{formatearTasa(props.tasa.compra)}
					</p>
				</div>
				<div>
					<p class="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
						Vendes a
					</p>
					<p class="tabular text-sm font-semibold text-[var(--color-fg-default)]">
						{formatearTasa(props.tasa.venta)}
					</p>
				</div>
				<div class="col-span-2 text-[10px] text-[var(--color-fg-subtle)]">
					<span class="font-semibold">{props.tasa.muestras}</span> anuncios top
				</div>
			</div>
		{:else}
			<div class="text-xs">
				<p class="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
					Etiqueta
				</p>
				<p class="text-sm font-medium text-[var(--color-fg-default)]">
					{props.tasa.etiqueta}
				</p>
			</div>
		{/if}
	</div>

	<footer class="border-t border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-5 py-2">
		<p class="text-[10px] font-medium text-[var(--color-fg-subtle)] tabular">
			Actualizado {formatearFecha(fecha)}
		</p>
	</footer>
</article>
