import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			devOptions: {
				enabled: true
			},
			manifest: {
				id: '/',
				name: 'TasApp VE — Tasas y Conversor',
				lang: 'es',
				short_name: 'TasApp VE',
				description: 'Tasas BCV y USDT en tiempo real, conversor de monedas y calculadora de items.',
				theme_color: '#0F766E',
				background_color: '#FAFAF9',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icon.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any'
					},
					{
						src: '/icons/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icons/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/icons/icon-maskable-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true
	}
});
