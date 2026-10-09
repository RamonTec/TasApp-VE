<script lang="ts">
	import { onMount } from 'svelte';
	import { AlmacenamientoNavegador } from '$lib/infrastructure/storage/LocalStorageAdapter';
	import Download from '@lucide/svelte/icons/download';
	import Share from '@lucide/svelte/icons/share';
	import X from '@lucide/svelte/icons/x';

	/** Evento de Chromium (Android/escritorio); no está en los tipos del DOM. */
	interface EventoInstalacion extends Event {
		prompt(): Promise<void>;
		readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	const KEY = 'pwa:aviso-cerrado';

	let evento = $state<EventoInstalacion | null>(null);
	let esIos = $state(false);
	let cerrado = $state(true);
	let almacen: AlmacenamientoNavegador | null = null;

	onMount(() => {
		const instalada =
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true;
		if (instalada) return;

		almacen = new AlmacenamientoNavegador();
		cerrado = almacen.obtener<boolean>(KEY) === true;

		// iPadOS se presenta como Mac; se distingue por la pantalla táctil.
		esIos =
			/iphone|ipad|ipod/i.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

		const alPedir = (e: Event) => {
			e.preventDefault();
			evento = e as EventoInstalacion;
		};
		const alInstalar = () => {
			evento = null;
			esIos = false;
		};
		window.addEventListener('beforeinstallprompt', alPedir);
		window.addEventListener('appinstalled', alInstalar);
		return () => {
			window.removeEventListener('beforeinstallprompt', alPedir);
			window.removeEventListener('appinstalled', alInstalar);
		};
	});

	async function instalar(): Promise<void> {
		if (!evento) return;
		await evento.prompt();
		await evento.userChoice;
		evento = null;
	}

	function cerrar(): void {
		cerrado = true;
		almacen?.guardar(KEY, true);
	}

	let visible = $derived(!cerrado && (evento !== null || esIos));
</script>

{#if visible}
	<div
		class="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
		role="region"
		aria-label="Instalar aplicación"
	>
		<div
			class="card mx-auto flex max-w-md items-center gap-3 px-4 py-3 shadow-[var(--shadow-lg)]"
		>
			<img src="/apple-touch-icon.png" alt="" class="h-10 w-10 shrink-0 rounded-[var(--radius-md)]" />
			<div class="min-w-0 flex-1">
				<p class="text-sm font-semibold text-[var(--color-fg-default)]">Instala TasApp VE</p>
				{#if evento}
					<p class="text-xs text-[var(--color-fg-muted)]">Ábrela desde tu pantalla de inicio.</p>
				{:else}
					<p class="text-xs text-[var(--color-fg-muted)]">
						Toca <Share size={12} class="inline -mt-0.5" aria-label="Compartir" /> y luego
						<span class="font-semibold">Agregar a inicio</span>.
					</p>
				{/if}
			</div>
			{#if evento}
				<button
					type="button"
					onclick={instalar}
					class="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-fg-inverse)] hover:bg-[var(--color-accent-primary-hi)]"
				>
					<Download size={15} /> Instalar
				</button>
			{/if}
			<button
				type="button"
				onclick={cerrar}
				class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg-default)]"
				aria-label="Cerrar"
			>
				<X size={16} />
			</button>
		</div>
	</div>
{/if}
