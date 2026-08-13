<script lang="ts">
	import Hand from '@lucide/svelte/icons/hand';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	type Props = {
		valor: number | null;
		etiqueta: string;
		onGuardar: (valor: number, etiqueta: string) => void;
		onLimpiar: () => void;
	};

	let { valor, etiqueta, onGuardar, onLimpiar }: Props = $props();

	let valorInicial: string | number | null = $state(valor);
	$effect(() => {
		valorInicial = valor;
	});

	let valorTexto = $state(valor !== null ? String(valor).replace('.', ',') : '');
	let etiquetaTexto = $state(etiqueta);
	let error = $state<string | null>(null);

	function guardar(e: Event): void {
		e.preventDefault();
		error = null;
		const numero = parseFloat(valorTexto.replace(',', '.'));
		if (!Number.isFinite(numero) || numero <= 0) {
			error = 'Ingresa un valor numérico positivo';
			return;
		}
		onGuardar(numero, etiquetaTexto.trim() || 'Mi tasa');
		valorTexto = '';
		etiquetaTexto = '';
	}

	void valorInicial;
</script>

<section
	class="card relative overflow-hidden border-2 border-[var(--color-accent-warning)]/40 bg-[var(--color-accent-warning-soft)]"
>
	<div
		class="absolute inset-x-0 top-0 h-1"
		style="background-color: var(--color-accent-warning)"
		aria-hidden="true"
	></div>

	<div class="p-5 sm:p-6">
		<div class="flex items-start gap-3">
			<span
				class="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-warning)] text-[var(--color-fg-inverse)]"
			>
				<Hand size={18} strokeWidth={2.25} />
			</span>
			<div>
				<h2 class="text-base font-semibold text-[var(--color-fg-default)]">
					Ingresa una tasa manualmente
				</h2>
				<p class="mt-1 text-sm text-[var(--color-fg-muted)]">
					Las fuentes automáticas no están disponibles. Escribe la tasa de cambio que viste en tu exchange
					o fuente de confianza. La usaremos como respaldo hasta que las fuentes vuelvan.
				</p>
			</div>
		</div>

		{#if valor !== null}
			<div
				class="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-accent-info)]/30 bg-[var(--color-accent-info-soft)] px-4 py-3"
			>
				<div>
					<p class="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
						Tasa manual activa
					</p>
					<p class="tabular text-lg font-semibold text-[var(--color-fg-default)]">
						{valor} Bs. por USD
					</p>
					<p class="text-[11px] text-[var(--color-fg-muted)]">«{etiqueta}»</p>
				</div>
				<button
					type="button"
					onclick={onLimpiar}
					class="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] hover:bg-[var(--color-accent-danger-soft)] hover:text-[var(--color-accent-danger)]"
				>
					<Trash2 size={13} strokeWidth={2} /> Quitar
				</button>
			</div>
		{/if}

		<form onsubmit={guardar} class="mt-5">
			<div class="grid gap-3 sm:grid-cols-[2fr,1fr,auto] sm:items-end">
				<label class="block">
					<span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
						Valor (Bs. por USD)
					</span>
					<input
						type="text"
						inputmode="decimal"
						bind:value={valorTexto}
						placeholder="ej. 36,50"
						class="tabular mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--color-fg-default)] focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/20"
					/>
				</label>

				<label class="block">
					<span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
						Etiqueta (opcional)
					</span>
					<input
						type="text"
						bind:value={etiquetaTexto}
						placeholder="Mi tasa"
						class="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--color-fg-default)] focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/20"
					/>
				</label>

				<button
					type="submit"
					class="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-primary)] px-4 text-sm font-semibold text-[var(--color-fg-inverse)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-accent-primary-hi)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
				>
					<Plus size={16} strokeWidth={2.5} /> Guardar
				</button>
			</div>

			{#if error}
				<p class="mt-2 text-xs font-medium text-[var(--color-accent-danger)]">{error}</p>
			{/if}
		</form>
	</div>
</section>
