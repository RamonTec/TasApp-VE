<script lang="ts">
	import { tasasAplicables, type TasasDisponibles } from '$lib/domain/usecases/conversion';
	import {
		compararFormasDePago,
		type MedioDePago
	} from '$lib/domain/usecases/compararFormasDePago';
	import {
		formatearEur,
		formatearPorcentaje,
		formatearTasa,
		formatearUsd,
		formatearVes,
		parsearMonto
	} from '$lib/shared/format';
	import InputMonto from './InputMonto.svelte';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import X from '@lucide/svelte/icons/x';

	type Props = { tasas: TasasDisponibles };
	let { tasas }: Props = $props();

	let textoUsd = $state('');
	let textoBs = $state('');
	let textoEur = $state('');
	/** El precio en Bs suele decirse en "dólares a tasa BCV". */
	let bsEnDolaresBcv = $state(true);

	let t = $derived(tasasAplicables(tasas));

	let montoBs = $derived.by(() => {
		const n = parsearMonto(textoBs);
		if (!bsEnDolaresBcv) return n;
		return t.bcvUsd !== null ? n * t.bcvUsd : Number.NaN;
	});

	let comparacion = $derived(
		compararFormasDePago(
			[
				{ medio: 'USD', monto: parsearMonto(textoUsd) },
				{ medio: 'VES', monto: montoBs },
				{ medio: 'EUR', monto: parsearMonto(textoEur) }
			],
			t
		)
	);

	let paridadEur = $derived(
		t.bcvEur !== null && t.bcvUsd !== null && t.bcvUsd > 0 ? t.bcvEur / t.bcvUsd : null
	);

	let notaCalculo = $derived(
		`Costo real en dólares: ${[
			t.usdtPromedio !== null ? `los Bs a tasa USDT (${formatearTasa(t.usdtPromedio)})` : null,
			paridadEur !== null ? `el euro a la paridad BCV (1 € = ${formatearTasa(paridadEur)} $)` : null
		]
			.filter(Boolean)
			.join(' y ')}.`
	);

	let alguno = $derived(Boolean(textoUsd || textoBs || textoEur));

	const nombres: Record<MedioDePago, string> = {
		USD: 'Dólares',
		VES: 'Bolívares',
		EUR: 'Euros'
	};
	const titulos: Record<MedioDePago, string> = {
		USD: 'Paga en dólares',
		VES: 'Paga en bolívares',
		EUR: 'Paga en euros'
	};

	function precio(medio: MedioDePago, monto: number): string {
		if (medio === 'USD') return formatearUsd(monto);
		if (medio === 'EUR') return formatearEur(monto);
		return formatearVes(monto);
	}

	function limpiar(): void {
		textoUsd = '';
		textoBs = '';
		textoEur = '';
	}

	const claseCampo =
		'tabular w-full rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] py-2.5 pl-3 pr-12 text-right text-lg font-semibold text-[var(--color-fg-default)] focus:border-[var(--color-accent-primary)] focus:bg-[var(--color-bg-elevated)] focus:outline-none';
	const claseSufijo =
		'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-fg-subtle)]';
	const claseEtiqueta = 'text-sm font-semibold text-[var(--color-fg-default)]';
</script>

<section class="card overflow-hidden" aria-labelledby="forma-pago-titulo">
	<div class="flex items-start justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
		<div>
			<h2 id="forma-pago-titulo" class="text-base font-semibold text-[var(--color-fg-default)]">
				¿En qué moneda te conviene pagar?
			</h2>
			<p class="mt-0.5 text-sm text-[var(--color-fg-muted)]">
				Escribe el precio que te dan por cada forma de pago (al menos dos).
			</p>
		</div>
		{#if alguno}
			<button
				type="button"
				onclick={limpiar}
				class="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg-default)]"
				aria-label="Limpiar precios"
			>
				<X size={16} />
			</button>
		{/if}
	</div>

	<div class="grid gap-3 p-5">
		<label class="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] items-center gap-3">
			<span class={claseEtiqueta}>En dólares</span>
			<span class="relative">
				<InputMonto bind:value={textoUsd} placeholder="50" aria-label="Precio en dólares" class={claseCampo} />
				<span class={claseSufijo}>$</span>
			</span>
		</label>

		<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] items-center gap-3">
			<div class="min-w-0">
				<p class={claseEtiqueta}>En bolívares</p>
				<div
					class="mt-1 inline-flex gap-0.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] p-0.5"
					role="radiogroup"
					aria-label="Cómo te dicen el precio en bolívares"
				>
					{#each [{ v: true, l: '$ BCV' }, { v: false, l: 'Bs' }] as o (o.l)}
						<button
							type="button"
							role="radio"
							aria-checked={bsEnDolaresBcv === o.v}
							onclick={() => (bsEnDolaresBcv = o.v)}
							class="rounded-[var(--radius-sm)] border px-2 py-0.5 text-[11px] font-bold transition-colors {bsEnDolaresBcv ===
							o.v
								? 'border-[var(--color-accent-primary)] bg-[var(--color-bg-elevated)] text-[var(--color-accent-primary)]'
								: 'border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'}"
						>
							{o.l}
						</button>
					{/each}
				</div>
			</div>
			<span class="relative">
				<InputMonto
					bind:value={textoBs}
					placeholder={bsEnDolaresBcv ? '60' : '52.500'}
					aria-label={bsEnDolaresBcv ? 'Precio en bolívares, en dólares a tasa BCV' : 'Precio en bolívares'}
					class={claseCampo}
				/>
				<span class={claseSufijo}>{bsEnDolaresBcv ? '$' : 'Bs'}</span>
			</span>
		</div>
		{#if bsEnDolaresBcv && Number.isFinite(montoBs) && montoBs > 0}
			<p class="tabular -mt-1.5 text-right text-xs text-[var(--color-fg-muted)]">
				= {formatearVes(montoBs)} a tasa BCV
			</p>
		{/if}

		<label class="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] items-center gap-3">
			<span class={claseEtiqueta}>En euros</span>
			<span class="relative">
				<InputMonto bind:value={textoEur} placeholder="45" aria-label="Precio en euros" class={claseCampo} />
				<span class={claseSufijo}>€</span>
			</span>
		</label>
	</div>

	{#if comparacion}
		{@const mejor = comparacion.opciones[0]}
		{@const peor = comparacion.opciones[comparacion.opciones.length - 1]}
		<div class="px-5 pb-5" aria-live="polite">
			<div
				class="rounded-[var(--radius-md)] px-4 py-3 {comparacion.indiferente
					? 'bg-[var(--color-bg-subtle)]'
					: 'bg-[var(--color-accent-success-soft)]'}"
			>
				{#if comparacion.indiferente}
					<p class="text-sm font-semibold text-[var(--color-fg-default)]">Da casi igual</p>
					<p class="mt-0.5 text-xs text-[var(--color-fg-muted)]">
						Todas las opciones cuestan prácticamente lo mismo. Paga como te sea más cómodo.
					</p>
				{:else}
					<p class="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent-success)]">
						<Sparkles size={15} strokeWidth={2.25} />
						{titulos[mejor.medio]}
					</p>
					<p class="mt-0.5 text-xs text-[var(--color-fg-muted)]">
						Te ahorras <span class="tabular font-semibold text-[var(--color-fg-default)]"
							>{formatearUsd(peor.sobrecostoUsd)}</span
						>
						frente a pagar en {nombres[peor.medio].toLowerCase()} ({formatearPorcentaje(
							peor.sobrecostoPct
						).replace('+', '')} más caro).
					</p>
				{/if}
			</div>

			<ul
				class="mt-3 divide-y divide-[var(--color-border-default)] rounded-[var(--radius-md)] border border-[var(--color-border-default)]"
			>
				{#each comparacion.opciones as o, i (o.medio)}
					{@const ganadora = i === 0 && !comparacion.indiferente}
					<li class="flex items-center justify-between gap-3 px-3 py-2.5">
						<div class="min-w-0">
							<p
								class="text-sm {ganadora
									? 'font-semibold text-[var(--color-fg-default)]'
									: 'text-[var(--color-fg-muted)]'}"
							>
								{nombres[o.medio]}
							</p>
							<p class="tabular truncate text-xs text-[var(--color-fg-subtle)]">
								{precio(o.medio, o.monto)}
							</p>
						</div>
						<div class="shrink-0 text-right">
							<p
								class="tabular text-sm font-bold {ganadora
									? 'text-[var(--color-accent-success)]'
									: 'text-[var(--color-fg-default)]'}"
							>
								{formatearUsd(o.costoUsd)}
							</p>
							{#if o.sobrecostoUsd > 0.005}
								<p class="tabular text-xs font-semibold text-[var(--color-diff-negativa)]">
									+{formatearUsd(o.sobrecostoUsd).replace('US$ ', '')} ({formatearPorcentaje(o.sobrecostoPct)})
								</p>
							{/if}
						</div>
					</li>
				{/each}
			</ul>

			<p class="mt-3 text-xs text-[var(--color-fg-subtle)]">{notaCalculo}</p>
		</div>
	{:else if alguno}
		<p class="px-5 pb-5 text-sm text-[var(--color-fg-muted)]">
			{#if t.usdtPromedio === null && textoBs}
				Sin tasa USDT no podemos valorar el pago en bolívares.
			{:else}
				Escribe al menos dos precios para compararlos.
			{/if}
		</p>
	{/if}
</section>
