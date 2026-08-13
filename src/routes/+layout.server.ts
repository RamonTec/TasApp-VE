import type { LayoutServerLoad } from './$types';
import { obtenerContenedorServidor } from '$lib/server/contenedor.server';

export const load: LayoutServerLoad = async () => {
	const cont = obtenerContenedorServidor();

	const [bcvResult, usdtResult] = await Promise.allSettled([
		cont.tasaRepository.obtenerBcv(),
		cont.tasaRepository.obtenerUsdt()
	]);

	return {
		bcv: bcvResult.status === 'fulfilled' ? bcvResult.value : null,
		usdt: usdtResult.status === 'fulfilled' ? usdtResult.value : null,
		errors: {
			bcv:
				bcvResult.status === 'rejected'
					? (bcvResult.reason?.message ?? String(bcvResult.reason))
					: null,
			usdt:
				usdtResult.status === 'rejected'
					? (usdtResult.reason?.message ?? String(usdtResult.reason))
					: null
		}
	};
};
