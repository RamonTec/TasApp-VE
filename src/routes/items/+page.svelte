<script lang="ts">
	import { getEstadoTasas, getAcciones } from '$lib/presentation/contexto';
	import Encabezado from '$lib/presentation/components/Encabezado.svelte';
	import ItemList from '$lib/presentation/components/ItemList.svelte';
	import type { TasaReferencia } from '$lib/domain/usecases/conversion';

	const tasas = getEstadoTasas();
	const acciones = getAcciones();

	let tasaActiva = $state<TasaReferencia>('BCV');

	let tasasDisponibles = $derived({
		bcv: $tasas.bcv,
		usdt: $tasas.usdt,
		personalizada: $tasas.personalizada
	});

	let itemsStore = $derived(acciones.itemsStore);
</script>

<Encabezado
	titulo="Items y totales"
	descripcion="Suma items con precios en distintas monedas y obtén el total en la tasa que elijas."
/>

<ItemList
	items={$itemsStore}
	tasas={tasasDisponibles}
	{tasaActiva}
	onTasaActivaChange={(v) => (tasaActiva = v)}
	onAgregar={(item) => acciones.items.agregar(item)}
	onActualizar={(id, cambios) => acciones.items.actualizar(id, cambios)}
	onEliminar={(id) => acciones.items.eliminar(id)}
	onLimpiarTodo={() => acciones.items.limpiar()}
/>