<script lang="ts">
	import type { Moneda } from '$lib/domain/entities/types';
	import type {
		TasaReferencia,
		TasasAplicables,
		TasasDisponibles
	} from '$lib/domain/usecases/conversion';
	import { calcularConversion } from '$lib/domain/usecases/conversion';
	import {
		formatearVes,
		formatearUsd,
		formatearEur,
		formatearUsdt,
		formatearTasa
	} from '$lib/shared/format';
	import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
	import SelectorTasaPills from './SelectorTasaPills.svelte';

	type Props = {
		monedasDisponibles: readonly Moneda[];
		tasas: TasasDisponibles;
		tasaActiva: TasaReferencia;
		onTasaActivaChange: (v: TasaReferencia) => void;
	};

	let { monedasDisponibles, tasas, tasaActiva, onTasaActivaChange }: Props = $props();

	let monto = $state('');
	let desde = $state<Moneda>('USD');
	let hacia = $state<Moneda>('VES');

	let tasasAplicadas = $derived<TasasAplicables>({
		bcvUsd: tasas.bcv?.usd ?? null,
		bcvEur: tasas.bcv?.eur ?? null,
		usdtPromedio: tasas.usdt?.promedio ?? null,
		personalizada: tasas.personalizada?.valor ?? null
	});

	let montoNumerico = $derived.by(() => {
		const n = parseFloat(monto.replace(',', '.'));
		return Number.isFinite(n) ? n : 0;
	});

	let resultado = $derived(
		calcularConversion({
			monto: montoNumerico,
			desde,
			hacia,
			tasas: tasasAplicadas,
			fuenteAplicada: tasaActiva
		})
	);

	let comparativa = $derived.by(() => {
		const refs: { ref: TasaReferencia; label: string; color: string }[] = [
			{ ref: 'BCV', label: 'BCV', color: 'var(--color-tasa-bcv)' },
			{ ref: 'USDT', label: 'USDT', color: 'var(--color-tasa-usdt)' },
			{ ref: 'PERSONALIZADA', label: tasas.personalizada?.etiqueta ?? 'Personal', color: 'var(--color-tasa-personal)' }
		];
		return refs
			.map((r) => {
				const valor = r.ref === 'BCV' ? tasasAplicadas.bcvUsd : r.ref === 'USDT' ? tasasAplicadas.usdtPromedio : tasasAplicadas.personalizada;
				if (valor === null) return { ...r, resultado: null as (typeof resultado) | null };
				return {
					...r,
					resultado: calcularConversion({
						monto: montoNumerico,
						desde,
						hacia,
						tasas: tasasAplicadas,
						fuenteAplicada: r.ref
					})
				};
			})
			.filter((r) => r.resultado !== null);
	});

	function formatearPorMoneda(m: Moneda, n: number): string {
		const fn = {
			USD: formatearUsd,
			EUR: formatearEur,
			USDT: formatearUsdt,
			VES: formatearVes
		} as const;
		return fn[m](n);
	}

	function invertir(): void {
		const a = desde;
		desde = hacia;
		hacia = a;
	}

	function labelMoneda(m: Moneda): string {
		const labels = { USD: 'USD', EUR: 'EUR', USDT: 'USDT', VES: 'Bs.' };
		return labels[m];
	}
</script>

<div class="card overflow-hidden border-0 shadow-[var(--shadow-md)] ring-1 ring-[var(--color-border-default)] transition-all duration-300 hover:shadow-[var(--shadow-lg)]">
	<div class="bg-gradient-to-r from-[var(--color-bg-subtle)] to-[var(--color-bg-elevated)] px-6 py-4 border-b border-[var(--color-border-default)] flex items-center justify-between">
		<p class="text-[11px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)]">
			Tasa de referencia
		</p>
	</div>
	<div class="p-6 border-b border-[var(--color-border-default)] bg-[var(--color-bg-overlay)]">
		<SelectorTasaPills seleccionado={tasaActiva} {tasas} onChange={onTasaActivaChange} />
	</div>

	<div class="p-6">
		<div class="space-y-6">
			<label class="block group">
				<span class="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-2 block transition-colors group-focus-within:text-[var(--color-accent-primary)]">
					Monto a convertir
				</span>
				<div class="relative transition-all duration-300 transform group-focus-within:scale-[1.01]">
					<input
						type="text"
						inputmode="decimal"
						bind:value={monto}
						placeholder="0,00"
						aria-label="Monto a convertir"
						class="tabular w-full rounded-[var(--radius-lg)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-5 py-4 pr-16 text-3xl font-bold text-[var(--color-fg-default)] transition-all focus:border-[var(--color-accent-primary)] focus:bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10 shadow-inner"
					/>
					<span class="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-lg font-bold text-[var(--color-fg-subtle)]">
						{labelMoneda(desde)}
					</span>
				</div>
			</label>

			<div class="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
				<label class="block">
					<span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] mb-1.5 block">De</span>
					<div class="relative">
						<select
							bind:value={desde}
							aria-label="Moneda origen"
							class="w-full appearance-none rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-4 py-3 text-sm font-semibold text-[var(--color-fg-default)] transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10"
						>
							{#each monedasDisponibles as m (m)}
								<option value={m}>{labelMoneda(m)}</option>
							{/each}
						</select>
						<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-fg-muted)]">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
						</div>
					</div>
				</label>

				<button
					type="button"
					onclick={invertir}
					class="mt-6 grid h-12 w-12 place-items-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] shadow-sm transition-all duration-300 hover:scale-110 hover:border-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)] hover:text-[var(--color-fg-inverse)] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/20 active:scale-95"
					aria-label="Invertir conversión"
				>
					<ArrowRightLeft size={18} strokeWidth={2.5} />
				</button>

				<label class="block">
					<span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)] mb-1.5 block">A</span>
					<div class="relative">
						<select
							bind:value={hacia}
							aria-label="Moneda destino"
							class="w-full appearance-none rounded-[var(--radius-md)] border-2 border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-4 py-3 text-sm font-semibold text-[var(--color-fg-default)] transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-primary)]/10"
						>
							{#each monedasDisponibles as m (m)}
								<option value={m}>{labelMoneda(m)}</option>
							{/each}
						</select>
						<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-fg-muted)]">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
						</div>
					</div>
				</label>
			</div>
		</div>

		<div class="mt-8 transition-all duration-500 ease-out">
			{#if resultado}
				<div class="relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-primary-hi)] p-6 shadow-lg shadow-[var(--color-accent-primary)]/20 text-white transform transition-all hover:scale-[1.02]">
					<div class="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-xl"></div>
					<div class="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-3">
						<p class="text-[11px] font-bold uppercase tracking-widest text-white/80">
							Equivalente
						</p>
						<p class="tabular text-xs font-semibold text-white/90 bg-black/15 px-2.5 py-1 rounded-full backdrop-blur-md">
							1 {labelMoneda(desde)} = {formatearTasa(resultado.tasaAplicada)} {labelMoneda(hacia)}
						</p>
					</div>
					<p class="relative z-10 tabular text-4xl font-extrabold leading-tight tracking-tighter text-white drop-shadow-sm sm:text-5xl lg:text-6xl break-all">
						{formatearPorMoneda(hacia, resultado.total)}
					</p>
				</div>
			{:else if montoNumerico === 0}
				<div class="rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-8 text-center transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-elevated)]">
					<p class="text-sm font-medium text-[var(--color-fg-muted)]">
						Ingresa un monto para calcular su equivalente
					</p>
				</div>
			{:else}
				<div class="rounded-[var(--radius-lg)] border-2 border-[var(--color-accent-warning-soft)] bg-[var(--color-accent-warning-soft)] p-6 text-center">
					<p class="text-sm font-semibold text-[var(--color-accent-warning)]">
						No se puede convertir con la tasa seleccionada.
					</p>
				</div>
			{/if}
		</div>

		{#if comparativa.length > 1 && montoNumerico > 0}
			<div class="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
				<p class="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-muted)]">
					Comparativa
				</p>
				<div class="grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));">
					{#each comparativa as c (c.ref)}
						{@const activa = c.ref === tasaActiva}
						<div
							class="rounded-[var(--radius-md)] border-2 p-3 transition-all duration-300 {activa
								? 'shadow-md scale-105'
								: 'border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-strong)]'}"
							style={activa ? `background-color: ${c.color}15; border-color: ${c.color}40;` : ''}
						>
							<div class="flex items-center justify-between mb-1.5">
								<p
									class="text-[10px] font-bold uppercase tracking-widest"
									style={activa ? `color: ${c.color};` : 'color: var(--color-fg-muted);'}
								>
									{c.label}
								</p>
								{#if activa}
									<span class="flex h-2 w-2 relative">
										<span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: {c.color};"></span>
										<span class="relative inline-flex rounded-full h-2 w-2" style="background-color: {c.color};"></span>
									</span>
								{/if}
							</div>
							{#if c.resultado}
								<p class="tabular text-base font-bold text-[var(--color-fg-default)]">
									{formatearPorMoneda(hacia, c.resultado.total)}
								</p>
								<p class="tabular mt-0.5 text-[10px] font-medium text-[var(--color-fg-subtle)]">
									@ {formatearTasa(c.resultado.tasaAplicada)}
								</p>
							{:else}
								<p class="mt-1 text-sm font-medium text-[var(--color-fg-subtle)]">N/A</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>