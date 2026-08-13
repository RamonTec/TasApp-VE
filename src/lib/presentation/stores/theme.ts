import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Tema = 'light' | 'dark';

const KEY = 'tasapp-theme';

function leerTemaInicial(): Tema {
	if (!browser) return 'light';
	const stored = localStorage.getItem(KEY);
	if (stored === 'light' || stored === 'dark') return stored;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function crearStoreTema(): Writable<Tema> & { alternar: () => void; setTema: (t: Tema) => void } {
	const store = writable<Tema>(leerTemaInicial());

	if (browser) {
		store.subscribe((t) => {
			document.documentElement.setAttribute('data-theme', t);
			const meta = document.querySelector('meta[name="theme-color"]');
			if (meta) meta.setAttribute('content', t === 'dark' ? '#0B0B0C' : '#FAFAF9');
			try {
				localStorage.setItem(KEY, t);
			} catch {
				/* ignore */
			}
		});
	}

	return {
		...store,
		alternar() {
			store.update((t) => (t === 'dark' ? 'light' : 'dark'));
		},
		setTema(t: Tema) {
			store.set(t);
		}
	};
}

export const tema = crearStoreTema();
