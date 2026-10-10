<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { formatearEntradaMonto, montoAEntrada, parsearMonto } from '$lib/shared/format';

	type Props = Omit<HTMLInputAttributes, 'value' | 'type' | 'oninput' | 'onpaste'> & {
		/** Texto formateado ("1.234,56"). Léelo con `parsearMonto`. */
		value?: string;
		decimales?: number;
		elemento?: HTMLInputElement | null;
	};

	let {
		value = $bindable(''),
		decimales = 2,
		elemento = $bindable(null),
		...resto
	}: Props = $props();

	const significativo = /[\d,]/;

	/** Formatea `crudo` y deja el cursor detrás del mismo dígito en el que estaba. */
	function aplicar(input: HTMLInputElement, crudo: string, cursor: number): void {
		const antes = crudo.slice(0, cursor).replace(/[^\d,]/g, '').length;
		const formateado = formatearEntradaMonto(crudo, decimales);
		value = formateado;
		input.value = formateado;

		let pos = 0;
		for (let vistos = 0; pos < formateado.length && vistos < antes; pos++) {
			if (significativo.test(formateado[pos])) vistos++;
		}
		if (document.activeElement === input) input.setSelectionRange(pos, pos);
	}

	function alEscribir(e: Event & { currentTarget: HTMLInputElement }): void {
		const input = e.currentTarget;
		const tipo = e instanceof InputEvent ? e.inputType : '';
		const previo = value;
		let crudo = input.value;
		let cursor = input.selectionStart ?? crudo.length;

		// Un "." recién escrito es la coma decimal (teclados que solo traen punto).
		if (tipo.startsWith('insert')) {
			const datos = e instanceof InputEvent ? e.data : null;
			const largo = datos ? datos.length : Math.max(0, crudo.length - previo.length);
			const inicio = Math.max(0, cursor - largo);
			crudo =
				crudo.slice(0, inicio) + crudo.slice(inicio, cursor).replace(/\./g, ',') + crudo.slice(cursor);
		}

		// Borrar un "." de miles no cambia nada: borra el dígito de al lado.
		if (formatearEntradaMonto(crudo, decimales) === previo) {
			if (tipo === 'deleteContentBackward' && cursor > 0) {
				crudo = crudo.slice(0, cursor - 1) + crudo.slice(cursor);
				cursor -= 1;
			} else if (tipo === 'deleteContentForward') {
				crudo = crudo.slice(0, cursor) + crudo.slice(cursor + 1);
			}
		}

		aplicar(input, crudo, cursor);
	}

	/** Al pegar se acepta cualquier estilo ("1,234.56", "Bs. 10.500") y se normaliza. */
	function alPegar(e: ClipboardEvent & { currentTarget: HTMLInputElement }): void {
		const pegado = e.clipboardData?.getData('text') ?? '';
		const n = parsearMonto(pegado);
		e.preventDefault();
		if (!Number.isFinite(n) || n < 0) return;
		const input = e.currentTarget;
		const inicio = input.selectionStart ?? input.value.length;
		const fin = input.selectionEnd ?? inicio;
		const texto = montoAEntrada(n, decimales);
		aplicar(
			input,
			input.value.slice(0, inicio) + texto + input.value.slice(fin),
			inicio + texto.length
		);
	}
</script>

<input
	bind:this={elemento}
	type="text"
	inputmode="decimal"
	autocomplete="off"
	{...resto}
	{value}
	oninput={alEscribir}
	onpaste={alPegar}
/>
