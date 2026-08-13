<script lang="ts">
	import { getEstadoTasas } from '$lib/presentation/contexto';
	import Encabezado from '$lib/presentation/components/Encabezado.svelte';
	import ConversorForm from '$lib/presentation/components/ConversorForm.svelte';
	import type { Moneda } from '$lib/domain/entities/types';

	import type { TasaReferencia } from '$lib/domain/usecases/conversion';

	const tasas = getEstadoTasas();

	const monedas: Moneda[] = ['USD', 'EUR', 'USDT', 'VES'];

	let tasaActiva = $state<TasaReferencia>('BCV');

	let tasasDisponibles = $derived({
		bcv: $tasas.bcv,
		usdt: $tasas.usdt,
		personalizada: $tasas.personalizada
	});
</script>

<Encabezado
	titulo="Conversor"
	descripcion="Convierte entre USD, EUR, USDT y VES. Compara resultados según la tasa aplicada."
/>

<ConversorForm
	monedasDisponibles={monedas}
	tasas={tasasDisponibles}
	{tasaActiva}
	onTasaActivaChange={(v) => (tasaActiva = v)}
/>

<div class="card mt-6 p-5">
	<h2 class="text-sm font-semibold text-[var(--color-fg-default)]">Tips de uso</h2>
	<ul class="mt-2 space-y-1 text-sm text-[var(--color-fg-muted)]">
		<li>· Usa la tasa BCV para conversiones oficiales.</li>
		<li>· Usa la tasa USDT para conversiones al paralelo del día.</li>
		<li>· Configura una tasa personalizada si necesitas un valor de referencia propio.</li>
	</ul>
</div>
