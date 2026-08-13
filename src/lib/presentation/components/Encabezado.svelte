<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		titulo?: string;
		descripcion?: string;
		acciones?: Snippet;
		children?: Snippet;
	};

	let { titulo, descripcion, acciones, children }: Props = $props();
</script>

<div class="mb-6 flex items-start justify-between gap-4">
	<div class="min-w-0">
		{#if titulo}
			<h1
				class="text-2xl font-semibold tracking-tight text-[var(--color-fg-default)] sm:text-3xl"
			>
				{titulo}
			</h1>
		{/if}
		{#if descripcion}
			<p class="mt-1 text-sm text-[var(--color-fg-muted)]">{descripcion}</p>
		{/if}
		{#if children}
			<div class="mt-3">{@render children()}</div>
		{/if}
	</div>
	{#if acciones}
		<div class="flex shrink-0 gap-2">{@render acciones()}</div>
	{/if}
</div>
