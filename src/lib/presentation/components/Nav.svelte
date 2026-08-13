<script lang="ts">
	import Building2 from '@lucide/svelte/icons/building-2';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { tema } from '$lib/presentation/stores/theme';
	import { page } from '$app/state';

	const enlaces = [
		{ href: '/', label: 'Tasas' },
		{ href: '/conversor', label: 'Conversor' },
		{ href: '/items', label: 'Items' }
	];
</script>

<header class="sticky top-0 z-40 border-b border-[var(--color-border-default)] bg-[var(--color-bg-app)]/85 backdrop-blur-md">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
		<a href="/" class="flex items-center gap-2.5 group">
			<span class="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-primary)] text-[var(--color-fg-inverse)] shadow-[var(--shadow-sm)] transition-transform group-hover:scale-105">
				<Building2 size={18} strokeWidth={2.25} />
			</span>
			<span class="flex flex-col leading-tight">
				<span class="text-[15px] font-semibold text-[var(--color-fg-default)]">TasApp VE</span>
				<span class="text-[11px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">Tasas & conversión</span>
			</span>
		</a>

		<nav class="flex items-center gap-1">
			{#each enlaces as enlace (enlace.href)}
				{@const activo = page.url.pathname === enlace.href || (enlace.href !== '/' && page.url.pathname.startsWith(enlace.href))}
				<a
					href={enlace.href}
					class="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors {activo
						? 'bg-[var(--color-bg-subtle)] text-[var(--color-fg-default)]'
						: 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg-default)]'}"
					aria-current={activo ? 'page' : undefined}
				>
					{enlace.label}
				</a>
			{/each}
			<button
				type="button"
				onclick={() => tema.alternar()}
				class="ml-2 grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg-default)]"
				aria-label="Cambiar tema"
			>
				{#if $tema === 'dark'}
					<Sun size={18} strokeWidth={2} />
				{:else}
					<Moon size={18} strokeWidth={2} />
				{/if}
			</button>
		</nav>
	</div>
</header>
