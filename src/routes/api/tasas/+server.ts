import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { obtenerContenedorServidor } from '$lib/server/contenedor.server';
import { calcularDiferenciaEntreFuentes } from '$lib/domain/usecases/conversion';

export const GET: RequestHandler = async () => {
	const cont = obtenerContenedorServidor();
	const [bcvRes, usdtRes] = await Promise.allSettled([
		cont.tasaRepository.obtenerBcv(),
		cont.tasaRepository.obtenerUsdt()
	]);

	const bcv = bcvRes.status === 'fulfilled' ? bcvRes.value : null;
	const usdt = usdtRes.status === 'fulfilled' ? usdtRes.value : null;

	const diferencia =
		bcv && usdt ? calcularDiferenciaEntreFuentes(bcv.usd, usdt.promedio) : null;

	return json(
		{
			ok: bcvRes.status === 'fulfilled' || usdtRes.status === 'fulfilled',
			bcv,
			usdt,
			diferencia,
			errors: {
				bcv:
					bcvRes.status === 'rejected'
						? (bcvRes.reason?.message ?? String(bcvRes.reason))
						: null,
				usdt:
					usdtRes.status === 'rejected'
						? (usdtRes.reason?.message ?? String(usdtRes.reason))
						: null
			},
			fechaConsulta: new Date().toISOString()
		},
		{
			headers: {
				'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
			}
		}
	);
};
