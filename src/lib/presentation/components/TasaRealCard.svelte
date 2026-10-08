<script lang="ts">
	import type { TasasDisponibles } from '$lib/domain/usecases/conversion';
	import {
		calcularTasaEfectiva,
		posicionEntreReferencias,
		type ReferenciaTasa,
		type ResultadoTasaEfectiva
	} from '$lib/domain/usecases/tasaEfectiva';
	import {
		formatearPorcentaje,
		formatearTasa,
		formatearUsd,
		formatearVes,
		parsearMonto
	} from '$lib/shared/format';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';

	type Props = { tasas: TasasDisponibles };
	let { tasas }: Props = $props();

	let textoDivisa = $state('');
	let textoBs = $state('');
	let compartido = $state(false);

	let referencias = $derived.by(() => {
		const r: ReferenciaTasa[] = [];
		if (tasas.bcv) r.push({ ref: 'BCV', etiqueta: 'BCV', valor: tasas.bcv.usd });
		if (tasas.usdt) r.push({ ref: 'USDT', etiqueta: 'USDT Binance', valor: tasas.usdt.promedio });
		if (tasas.personalizada)
			r.push({
				ref: 'PERSONALIZADA',
				etiqueta: tasas.personalizada.etiqueta,
				valor: tasas.personalizada.valor
			});
		return r;
	});

	let resultado = $derived(
		calcularTasaEfectiva(parsearMonto(textoDivisa), parsearMonto(textoBs), referencias)
	);

	let posicion = $derived(
		resultado && tasas.bcv && tasas.usdt
			? posicionEntreReferencias(resultado.tasa, tasas.bcv.usd, tasas.usdt.promedio)
			: null
	);

	const colores = {
		BCV: 'var(--color-tasa-bcv)',
		USDT: 'var(--color-tasa-usdt)',
		PERSONALIZADA: 'var(--color-tasa-personal)'
	} as const;

	const veredictos = {
		PAGAR_EN_BS: {
			titulo: 'Te conviene pagar en bolívares',
			detalle: 'La tasa que te cobran está por debajo del USDT: si cambias tus dólares a Bs, pagas menos.',
			color: 'var(--color-accent-success)',
			bg: 'var(--color-accent-success-soft)'
		},
		PAGAR_EN_DIVISAS: {
			titulo: 'Te conviene pagar en divisas',
			detalle: 'La tasa que te cobran está por encima del USDT: pagar en Bs te sale más caro.',
			color: 'var(--color-accent-danger)',
			bg: 'var(--color-accent-danger-soft)'
		},
		INDIFERENTE: {
			titulo: 'Da casi igual',
			detalle: 'La tasa que te cobran es prácticamente la del USDT.',
			color: 'var(--color-fg-muted)',
			bg: 'var(--color-bg-subtle)'
		},
		SIN_REFERENCIA: null
	} as const;

	function textoComparacion(diferenciaBs: number, diferenciaDivisa: number): string {
		if (Math.abs(diferenciaBs) < 0.005) return 'Igual';
		const cuanto = `${formatearVes(Math.abs(diferenciaBs))} (${formatearUsd(Math.abs(diferenciaDivisa))})`;
		return diferenciaBs > 0 ? `${cuanto} de más` : `${cuanto} de menos`;
	}

	function textoParaCompartir(r: ResultadoTasaEfectiva): string {
		const lineas = [
			`${formatearUsd(r.montoDivisa)} = ${formatearVes(r.montoBs)}`,
			`Tasa cobrada: ${formatearTasa(r.tasa)} Bs/$`,
			...r.comparaciones.map(
				(c) => `· vs ${c.etiqueta} (${formatearTasa(c.tasaReferencia)}): ${formatearPorcentaje(c.porcentaje)}`
			),
			'— TasApp VE'
		];
		return lineas.join('\n');
	}

	async function compartir(): Promise<void> {
		if (!resultado) return;
		const texto = textoParaCompartir(resultado);
		try {
			if (navigator.share) {
				await navigator.share({ text: texto });
				return;
			}
			await navigator.clipboard.writeText(texto);
			compartido = true;
			setTimeout(() => (compartido = false), 2000);
		} catch {
			/* el usuario canceló */
		}
	}

	function limpiar(): void {
		textoDivisa = '';
		textoBs = '';
	}
</script>

<section class="card overflow-hidden" aria-labelledby="tasa-real-titulo">
	<div class="border-b border-[var(--color-border-default)] px-5 py-4">
		<h2 id="tasa-real-titulo" class="text-base font-semibold text-[var(--color-fg-default)]">
			¿A qué tasa te están cobrando?
		</h2>
		<p class="mt-0.5 text-sm text-[var(--color-fg-muted)]">
			Escribe el precio en dólares y lo que te piden en bolívares.
		</p>
	</div>

	<div class="grid grid-cols-2 gap-3 p-5">
		<label class="block min-w-0">
			<span class="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
				Precio en $
			</span>
			<div class="relative">
				<input
					type="text"
					inputmode="decimal"
					autocomplete="off"
					bind:value={textoDivisa}
					placeholder="10,00"
					class="tabular w-full rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] py-3 pl-3 pr-8 text-xl font-semibold text-[var(--color-fg-default)] focus:border-[var(--color-accent-primary)] focus:bg-[var(--color-bg-elevated)] focus:outline-none"
				/>
				<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-fg-subtle)]">$</span>
			</div>
		</label>
		<label class="block min-w-0">
			<span class="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
				Te cobran en Bs
			</span>
			<div class="relative">
				<input
					type="text"
					inputmode="decimal"
					autocomplete="off"
					bind:value={textoBs}
					placeholder="10.500"
					class="tabular w-full rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] py-3 pl-3 pr-9 text-xl font-semibold text-[var(--color-fg-default)] focus:border-[var(--color-accent-primary)] focus:bg-[var(--color-bg-elevated)] focus:outline-none"
				/>
				<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-fg-subtle)]">Bs</span>
			</div>
		</label>
	</div>

	{#if resultado}
		{@const v = veredictos[resultado.veredicto]}
		<div class="px-5 pb-5" aria-live="polite">
			<div class="flex items-end justify-between gap-3">
				<div class="min-w-0">
					<p class="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
						Te cobran a
					</p>
					<p class="tabular whitespace-nowrap text-4xl font-bold leading-tight tracking-tight text-[var(--color-fg-default)]">
						{formatearTasa(resultado.tasa)}
						<span class="text-base font-semibold text-[var(--color-fg-muted)]">Bs/$</span>
					</p>
				</div>
				<div class="flex shrink-0 gap-1">
					<button
						type="button"
						onclick={compartir}
						class="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] border border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg-default)]"
						aria-label={compartido ? 'Copiado' : 'Compartir resultado'}
					>
						{#if compartido}<Check size={16} />{:else}<Share2 size={16} />{/if}
					</button>
					<button
						type="button"
						onclick={limpiar}
						class="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] border border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg-default)]"
						aria-label="Limpiar"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			{#if posicion !== null && tasas.bcv && tasas.usdt}
				{@const pct = Math.min(Math.max(posicion, -0.08), 1.08)}
				<div class="mt-4" aria-hidden="true">
					<div class="relative mx-2 h-2 rounded-full bg-gradient-to-r from-[var(--color-tasa-bcv)] to-[var(--color-tasa-usdt)] opacity-80">
						<span
							class="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-bg-elevated)] bg-[var(--color-fg-default)] shadow"
							style="left: {((pct + 0.08) / 1.16) * 100}%"
						></span>
					</div>
					<div class="mt-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
						<span>BCV {formatearTasa(tasas.bcv.usd)}</span>
						<span>USDT {formatearTasa(tasas.usdt.promedio)}</span>
					</div>
				</div>
			{/if}

			<ul class="mt-4 divide-y divide-[var(--color-border-default)] rounded-[var(--radius-md)] border border-[var(--color-border-default)]">
				{#each resultado.comparaciones as c (c.ref)}
					<li class="px-3 py-2.5">
						<div class="flex items-baseline justify-between gap-3">
							<p class="min-w-0 truncate text-sm font-semibold" style="color: {colores[c.ref]}">
								vs {c.etiqueta}
								<span class="tabular font-medium text-[var(--color-fg-muted)]">{formatearTasa(c.tasaReferencia)}</span>
							</p>
							<p
								class="tabular shrink-0 text-sm font-bold"
								style="color: {c.porcentaje > 0.005
									? 'var(--color-diff-negativa)'
									: c.porcentaje < -0.005
										? 'var(--color-diff-positiva)'
										: 'var(--color-diff-neutral)'}"
							>
								{formatearPorcentaje(c.porcentaje)}
							</p>
						</div>
						<p class="tabular mt-0.5 text-xs text-[var(--color-fg-muted)]">
							{textoComparacion(c.diferenciaBs, c.diferenciaDivisa)} · a esa tasa serían {formatearVes(c.montoBsEnReferencia)}
						</p>
					</li>
				{/each}
			</ul>

			{#if v}
				<div class="mt-4 rounded-[var(--radius-md)] px-4 py-3" style="background-color: {v.bg}">
					<p class="text-sm font-semibold" style="color: {v.color}">{v.titulo}</p>
					<p class="mt-0.5 text-xs text-[var(--color-fg-muted)]">{v.detalle}</p>
				</div>
			{/if}
		</div>
	{:else if textoDivisa.trim() || textoBs.trim()}
		<p class="px-5 pb-5 text-sm text-[var(--color-fg-muted)]">
			Completa ambos montos para ver la tasa.
		</p>
	{/if}
</section>
