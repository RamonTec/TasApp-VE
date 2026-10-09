<script lang="ts">
	import { onMount } from 'svelte';
	import type { Item, Moneda } from '$lib/domain/entities/types';
	import { crearItem, subtotalItem } from '$lib/domain/entities/item';
	import type { TasasAplicables } from '$lib/domain/usecases/conversion';
	import { equivalencias, totalCompraEnBs } from '$lib/domain/usecases/calculadoraCompras';
	import { AlmacenamientoNavegador } from '$lib/infrastructure/storage/LocalStorageAdapter';
	import {
		formatearEur,
		formatearUsd,
		formatearUsdt,
		formatearVes,
		parsearMonto
	} from '$lib/shared/format';
	import RecomendacionPago from './RecomendacionPago.svelte';
	import Delete from '@lucide/svelte/icons/delete';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Undo2 from '@lucide/svelte/icons/undo-2';

	type Props = {
		items: readonly Item[];
		tasas: TasasAplicables;
		onAgregar: (item: Item) => void;
		onActualizar: (id: string, cambios: Partial<Omit<Item, 'id'>>) => void;
		onEliminar: (id: string) => void;
		onLimpiarTodo: () => void;
	};

	let { items, tasas, onAgregar, onActualizar, onEliminar, onLimpiarTodo }: Props = $props();

	const KEY_MONEDA = 'compras:moneda';
	const monedasEntrada: { value: Moneda; label: string }[] = [
		{ value: 'USD', label: '$' },
		{ value: 'EUR', label: '€' },
		{ value: 'VES', label: 'Bs' }
	];
	const formateadores = {
		USD: formatearUsd,
		EUR: formatearEur,
		USDT: formatearUsdt,
		VES: formatearVes
	} as const;

	let entrada = $state('');
	let cantidad = $state(1);
	let moneda = $state<Moneda>('USD');
	let vaciados = $state<Item[] | null>(null);
	let almacen: AlmacenamientoNavegador | null = null;

	onMount(() => {
		almacen = new AlmacenamientoNavegador();
		const guardada = almacen.obtener<Moneda>(KEY_MONEDA);
		if (guardada && monedasEntrada.some((m) => m.value === guardada)) moneda = guardada;
	});

	function elegirMoneda(m: Moneda): void {
		moneda = m;
		almacen?.guardar(KEY_MONEDA, m);
	}

	let monto = $derived(parsearMonto(entrada));
	let puedeSumar = $derived(Number.isFinite(monto) && monto > 0);

	let totalBs = $derived(totalCompraEnBs(items, tasas));
	let eq = $derived(totalBs !== null ? equivalencias(totalBs, tasas) : null);
	let unidades = $derived(items.reduce((n, it) => n + it.cantidad, 0));

	let tiles = $derived([
		{
			etiqueta: 'Dólar BCV',
			valor: eq?.dolarBcv ?? null,
			fmt: formatearUsd,
			color: 'var(--color-tasa-bcv)'
		},
		{
			etiqueta: 'USDT',
			valor: eq?.usdt ?? null,
			fmt: formatearUsdt,
			color: 'var(--color-tasa-usdt)'
		},
		{
			etiqueta: 'Euro BCV',
			valor: eq?.euroBcv ?? null,
			fmt: formatearEur,
			color: 'var(--color-tasa-bcv)'
		}
	]);

	function tecla(t: string): void {
		vaciados = null;
		if (t === ',') {
			if (entrada.includes(',')) return;
			entrada = entrada === '' ? '0,' : entrada + ',';
			return;
		}
		const decimales = entrada.split(',')[1];
		if (decimales !== undefined && decimales.length + t.length > 2) return;
		if (entrada.replace(',', '').length >= 10) return;
		entrada = entrada === '' || entrada === '0' ? t.replace(/^0+(?=\d)/, '') : entrada + t;
	}

	function borrar(): void {
		entrada = entrada.slice(0, -1);
	}

	function limpiarEntrada(): void {
		entrada = '';
		cantidad = 1;
	}

	function sumar(): void {
		if (!puedeSumar) return;
		onAgregar(
			crearItem({ nombre: `Artículo ${items.length + 1}`, precio: monto, cantidad, moneda })
		);
		limpiarEntrada();
	}

	function cambiarCantidad(item: Item, delta: number): void {
		const nueva = item.cantidad + delta;
		if (nueva < 1) onEliminar(item.id);
		else onActualizar(item.id, { cantidad: nueva });
	}

	function vaciar(): void {
		vaciados = [...items];
		onLimpiarTodo();
	}

	function deshacer(): void {
		if (!vaciados) return;
		for (const it of vaciados) onAgregar(it);
		vaciados = null;
	}

	function subtotalBs(item: Item): number | null {
		return totalCompraEnBs([item], tasas);
	}

	function alTeclear(e: KeyboardEvent): void {
		const destino = e.target as HTMLElement | null;
		if (destino?.closest('input, textarea, select, [contenteditable]')) return;
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		if (/^[0-9]$/.test(e.key)) tecla(e.key);
		else if (e.key === ',' || e.key === '.') tecla(',');
		else if (e.key === 'Backspace') borrar();
		else if (e.key === 'Escape') limpiarEntrada();
		else if (e.key === 'Enter' || e.key === '+') sumar();
		else return;
		e.preventDefault();
	}

	const teclas = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '00'];
	const claseTecla =
		'tabular grid h-14 place-items-center rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] text-xl font-semibold text-[var(--color-fg-default)] transition-colors hover:bg-[var(--color-border-default)] active:scale-[0.97]';
</script>

<svelte:window onkeydown={alTeclear} />

<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
	<section class="card overflow-hidden lg:col-start-1 lg:row-start-1" aria-label="Calculadora">
		<!-- Pantalla -->
		<div class="border-b border-[var(--color-border-default)] px-5 pb-4 pt-5">
			<div class="flex items-center justify-between gap-3">
				<div
					class="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] p-1"
					role="radiogroup"
					aria-label="Moneda del precio"
				>
					{#each monedasEntrada as m (m.value)}
						<button
							type="button"
							role="radio"
							aria-checked={moneda === m.value}
							onclick={() => elegirMoneda(m.value)}
							class="min-w-10 rounded-[var(--radius-sm)] px-2.5 py-1 text-sm font-bold transition-colors {moneda ===
							m.value
								? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-default)] shadow-[var(--shadow-sm)]'
								: 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'}"
						>
							{m.label}
						</button>
					{/each}
				</div>

				<div class="flex items-center gap-1" aria-label="Cantidad">
					<button
						type="button"
						onclick={() => (cantidad = Math.max(1, cantidad - 1))}
						disabled={cantidad <= 1}
						class="grid h-8 w-8 place-items-center rounded-full text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-30"
						aria-label="Menos cantidad"
					>
						<Minus size={14} strokeWidth={2.5} />
					</button>
					<span class="tabular min-w-8 text-center text-sm font-bold text-[var(--color-fg-default)]"
						>×{cantidad}</span
					>
					<button
						type="button"
						onclick={() => (cantidad += 1)}
						class="grid h-8 w-8 place-items-center rounded-full text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)]"
						aria-label="Más cantidad"
					>
						<Plus size={14} strokeWidth={2.5} />
					</button>
				</div>
			</div>

			<p
				class="tabular mt-4 truncate text-right text-5xl font-bold tracking-tight {entrada
					? 'text-[var(--color-fg-default)]'
					: 'text-[var(--color-fg-subtle)]'}"
				aria-live="polite"
			>
				<span class="text-2xl font-semibold text-[var(--color-fg-muted)]"
					>{monedasEntrada.find((m) => m.value === moneda)?.label}</span
				>
				{entrada || '0'}
			</p>
			<div class="tabular mt-1 flex h-5 items-baseline justify-between gap-3 text-sm text-[var(--color-fg-muted)]">
				<p class="truncate">
					{#if items.length > 0 && totalBs !== null}
						Llevas <span class="font-semibold text-[var(--color-fg-default)]">{formatearVes(totalBs)}</span>
					{/if}
				</p>
				<p class="shrink-0">
					{#if puedeSumar && cantidad > 1}
						= {formateadores[moneda](monto * cantidad)}
					{/if}
				</p>
			</div>
		</div>

		<!-- Teclado -->
		<div class="grid grid-cols-4 gap-2 p-3">
			<div class="col-span-3 grid grid-cols-3 gap-2">
				{#each teclas as t (t)}
					<button type="button" class={claseTecla} onclick={() => tecla(t)}>{t}</button>
				{/each}
			</div>
			<div class="grid grid-rows-4 gap-2">
				<button type="button" class={claseTecla} onclick={borrar} aria-label="Borrar último dígito">
					<Delete size={22} />
				</button>
				<button
					type="button"
					class="{claseTecla} text-base text-[var(--color-accent-danger)]"
					onclick={limpiarEntrada}
					aria-label="Limpiar número"
				>
					C
				</button>
				<button
					type="button"
					onclick={sumar}
					disabled={!puedeSumar}
					class="row-span-2 flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent-primary)] text-sm font-bold text-[var(--color-fg-inverse)] shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--color-accent-primary-hi)] active:scale-[0.97] disabled:opacity-40"
				>
					<Plus size={24} strokeWidth={3} />
					Sumar
				</button>
			</div>
		</div>
	</section>

	<div class="space-y-6 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
		<!-- Total -->
		<section class="card overflow-hidden" aria-labelledby="total-titulo">
			<div class="px-5 pb-4 pt-5">
				<p
					id="total-titulo"
					class="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]"
				>
					Total a pagar en bolívares
				</p>
				<p
					class="tabular mt-1 truncate text-4xl font-bold tracking-tight text-[var(--color-fg-default)]"
					aria-live="polite"
				>
					{#if totalBs !== null}
						{formatearVes(totalBs)}
					{:else}
						<span class="text-[var(--color-fg-subtle)]">Cargando tasas…</span>
					{/if}
				</p>
			</div>
			<div
				class="grid divide-y divide-[var(--color-border-default)] border-t border-[var(--color-border-default)] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
			>
				{#each tiles as t (t.etiqueta)}
					<div class="flex min-w-0 items-baseline justify-between gap-3 px-5 py-2.5 sm:block sm:px-3 sm:py-3">
						<p
							class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]"
						>
							<span
								class="h-1.5 w-1.5 shrink-0 rounded-full"
								style="background-color: {t.color}"
								aria-hidden="true"
							></span>
							{t.etiqueta}
						</p>
						<p class="tabular truncate text-base font-bold text-[var(--color-fg-default)] sm:mt-0.5">
							{t.valor !== null ? t.fmt(t.valor) : '—'}
						</p>
					</div>
				{/each}
			</div>
		</section>

		<RecomendacionPago totalBs={totalBs ?? 0} {tasas} />
	</div>
	<!-- Cinta -->
	<section
		class="card overflow-hidden lg:col-start-1 lg:row-start-2"
		aria-labelledby="cinta-titulo"
	>
		<div
			class="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-3"
		>
			<h2 id="cinta-titulo" class="text-sm font-semibold text-[var(--color-fg-default)]">
				Lo que llevas
				{#if unidades > 0}
					<span
						class="ml-1 rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-xs font-bold text-[var(--color-fg-muted)]"
						>{unidades}</span
					>
				{/if}
			</h2>
			{#if items.length > 0}
				<button
					type="button"
					onclick={vaciar}
					class="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-semibold text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger-soft)]"
				>
					<Trash2 size={14} /> Vaciar
				</button>
			{:else if vaciados}
				<button
					type="button"
					onclick={deshacer}
					class="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-semibold text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-soft)]"
				>
					<Undo2 size={14} /> Deshacer
				</button>
			{/if}
		</div>

		{#if items.length > 0}
			<ul class="divide-y divide-[var(--color-border-default)]">
				{#each items as item (item.id)}
					{@const bs = subtotalBs(item)}
					<li class="flex items-center gap-3 px-5 py-2.5">
						<div class="min-w-0 flex-1">
							<p class="tabular truncate text-sm font-semibold text-[var(--color-fg-default)]">
								{formateadores[item.moneda](subtotalItem(item))}
							</p>
							<p class="tabular truncate text-xs text-[var(--color-fg-muted)]">
								{[
									item.nombre,
									item.cantidad > 1
										? `${item.cantidad} × ${formateadores[item.moneda](item.precio)}`
										: null,
									bs !== null && item.moneda !== 'VES' ? formatearVes(bs) : null
								]
									.filter(Boolean)
									.join(' · ')}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-0.5">
							<button
								type="button"
								onclick={() => cambiarCantidad(item, -1)}
								class="grid h-8 w-8 place-items-center rounded-full text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg-default)]"
								aria-label={item.cantidad > 1 ? 'Quitar una unidad' : 'Eliminar'}
							>
								{#if item.cantidad > 1}<Minus size={14} strokeWidth={2.5} />{:else}<Trash2
										size={14}
									/>{/if}
							</button>
							<span class="tabular w-6 text-center text-sm font-bold text-[var(--color-fg-default)]"
								>{item.cantidad}</span
							>
							<button
								type="button"
								onclick={() => cambiarCantidad(item, 1)}
								class="grid h-8 w-8 place-items-center rounded-full text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg-default)]"
								aria-label="Agregar una unidad"
							>
								<Plus size={14} strokeWidth={2.5} />
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="px-5 py-8 text-center text-sm text-[var(--color-fg-muted)]">
				Marca el precio de cada cosa y toca <span
					class="font-semibold text-[var(--color-fg-default)]">Sumar</span
				>.
			</p>
		{/if}
	</section>
</div>
