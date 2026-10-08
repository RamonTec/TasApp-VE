<script lang="ts">
	import { getEstadoTasas, getAcciones, getCargarTasas } from '$lib/presentation/contexto';
	import Encabezado from '$lib/presentation/components/Encabezado.svelte';
	import TasaCard from '$lib/presentation/components/TasaCard.svelte';
	import DiferenciaCard from '$lib/presentation/components/DiferenciaCard.svelte';
	import ResumenTasas from '$lib/presentation/components/ResumenTasas.svelte';
	import TasaRealCard from '$lib/presentation/components/TasaRealCard.svelte';
	import ManualTasaForm from '$lib/presentation/components/ManualTasaForm.svelte';
	import { calcularDiferenciaEntreFuentes } from '$lib/domain/usecases/conversion';
	import { tiempoRelativo } from '$lib/shared/format';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';

	const tasas = getEstadoTasas();
	const acciones = getAcciones();
	const cargarTasas = getCargarTasas();

	let diferencia = $derived(
		calcularDiferenciaEntreFuentes($tasas.bcv?.usd ?? null, $tasas.usdt?.promedio ?? null)
	);

	let tasasDisponibles = $derived({
		bcv: $tasas.bcv,
		usdt: $tasas.usdt,
		personalizada: $tasas.personalizada
	});

	let falloTotal = $derived(!$tasas.bcv && !$tasas.usdt && !$tasas.cargando);

	async function actualizar(): Promise<void> {
		await cargarTasas();
	}
</script>

{#snippet accionesNav()}
	<button
		type="button"
		onclick={actualizar}
		disabled={$tasas.cargando}
		class="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--color-fg-default)] transition-colors hover:bg-[var(--color-bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
	>
		<RefreshCw size={14} strokeWidth={2.25} class={$tasas.cargando ? 'animate-spin' : ''} />
		{$tasas.cargando ? 'Actualizando…' : 'Actualizar'}
	</button>
{/snippet}

<Encabezado
	titulo="Tasas del día"
	acciones={accionesNav}
>
	{#if $tasas.ultimaActualizacion}
		<p class="-mt-2 text-xs text-[var(--color-fg-subtle)]">
			Actualizado {tiempoRelativo($tasas.ultimaActualizacion)}
		</p>
	{/if}
</Encabezado>

{#if $tasas.errorBcv && !$tasas.bcv}
	<div
		class="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-accent-warning)]/30 bg-[var(--color-accent-warning-soft)] px-4 py-3"
	>
		<AlertCircle
			size={16}
			strokeWidth={2.25}
			class="mt-0.5 shrink-0 text-[var(--color-accent-warning)]"
		/>
		<div class="text-sm">
			<p class="font-semibold text-[var(--color-fg-default)]">No se pudo consultar el BCV</p>
			<p class="mt-0.5 text-[var(--color-fg-muted)]">{$tasas.errorBcv}</p>
		</div>
	</div>
{/if}

{#if $tasas.errorUsdt && !$tasas.usdt}
	<div
		class="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-accent-warning)]/30 bg-[var(--color-accent-warning-soft)] px-4 py-3"
	>
		<AlertCircle
			size={16}
			strokeWidth={2.25}
			class="mt-0.5 shrink-0 text-[var(--color-accent-warning)]"
		/>
		<div class="text-sm">
			<p class="font-semibold text-[var(--color-fg-default)]">USDT (paralelo) no disponible</p>
			<p class="mt-0.5 text-[var(--color-fg-muted)]">{$tasas.errorUsdt}</p>
		</div>
	</div>
{/if}

<ResumenTasas
	bcv={$tasas.bcv}
	usdt={$tasas.usdt}
	{diferencia}
	cargando={$tasas.cargando}
/>

<div class="mt-4">
	<TasaRealCard tasas={tasasDisponibles} />
</div>

<h2 class="mt-10 mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
	Detalle de tasas
</h2>
<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#if $tasas.bcv}
		<TasaCard tipo="BCV" tasa={$tasas.bcv} />
	{/if}
	{#if $tasas.usdt}
		<TasaCard tipo="USDT" tasa={$tasas.usdt} />
	{/if}
	{#if $tasas.personalizada}
		<TasaCard tipo="PERSONALIZADA" tasa={$tasas.personalizada} />
	{/if}
	<DiferenciaCard {diferencia} />
</div>

{#if falloTotal}
	<div class="mt-6">
		<ManualTasaForm
			valor={$tasas.personalizada?.valor ?? null}
			etiqueta={$tasas.personalizada?.etiqueta ?? ''}
			onGuardar={(v, e) => acciones.tasas.guardarPersonalizada(v, e)}
			onLimpiar={() => acciones.tasas.limpiarPersonalizada()}
		/>
	</div>
{:else if $tasas.cargando && !$tasas.bcv && !$tasas.usdt}
	<div class="card mt-6 p-10 text-center">
		<p class="text-sm text-[var(--color-fg-muted)]">Cargando tasas…</p>
	</div>
{/if}

