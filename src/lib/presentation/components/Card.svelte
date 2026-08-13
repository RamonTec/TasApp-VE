<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		header?: Snippet;
		footer?: Snippet;
		variante?: 'default' | 'compact';
	};

	let { children, header, footer, variante = 'default' }: Props = $props();
</script>

<section class="card overflow-hidden">
	{#if header}
		<header class="border-b border-[var(--color-border-default)] px-5 py-4">
			{@render header()}
		</header>
	{/if}
	<div class={variante === 'compact' ? 'p-5' : 'p-6'}>
		{@render children()}
	</div>
	{#if footer}
		<footer class="border-t border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-5 py-3">
			{@render footer()}
		</footer>
	{/if}
</section>
