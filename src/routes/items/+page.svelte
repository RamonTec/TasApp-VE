<script lang="ts">
	import { getEstadoTasas, getAcciones } from '$lib/presentation/contexto';
	import Encabezado from '$lib/presentation/components/Encabezado.svelte';
	import CalculadoraCompras from '$lib/presentation/components/CalculadoraCompras.svelte';
	import FormaDePagoCard from '$lib/presentation/components/FormaDePagoCard.svelte';
	import { tasasAplicables } from '$lib/domain/usecases/conversion';

	const tasas = getEstadoTasas();
	const acciones = getAcciones();

	let tasasDisponibles = $derived(
		tasasAplicables({ bcv: $tasas.bcv, usdt: $tasas.usdt, personalizada: $tasas.personalizada })
	);

	let itemsStore = $derived(acciones.itemsStore);
</script>

<Encabezado
	titulo="Calculadora de compras"
	descripcion="Suma lo que vas a comprar y mira cuánto es en bolívares, dólar BCV, USDT y euro."
/>

<CalculadoraCompras
	items={$itemsStore}
	tasas={tasasDisponibles}
	onAgregar={(item) => acciones.items.agregar(item)}
	onActualizar={(id, cambios) => acciones.items.actualizar(id, cambios)}
	onEliminar={(id) => acciones.items.eliminar(id)}
	onLimpiarTodo={() => acciones.items.limpiar()}
/>

<!-- Alineada con la columna izquierda de la calculadora en pantallas anchas. -->
<div class="mt-6 lg:w-[calc(50%-0.75rem)]">
	<FormaDePagoCard tasas={{ bcv: $tasas.bcv, usdt: $tasas.usdt, personalizada: $tasas.personalizada }} />
</div>
