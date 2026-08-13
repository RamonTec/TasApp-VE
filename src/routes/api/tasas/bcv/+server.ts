import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { obtenerContenedorServidor } from '$lib/server/contenedor.server';

export const GET: RequestHandler = async () => {
	const cont = obtenerContenedorServidor();
	try {
		const tasa = await cont.tasaRepository.obtenerBcv();
		return json(
			{ ok: true, data: tasa },
			{
				headers: {
					'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200'
				}
			}
		);
	} catch (err) {
		const mensaje = err instanceof Error ? err.message : 'Error desconocido';
		return json({ ok: false, error: mensaje }, { status: 503 });
	}
};
