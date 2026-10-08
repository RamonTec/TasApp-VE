import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { obtenerContenedorServidor } from '$lib/server/contenedor.server';

export const GET: RequestHandler = async () => {
	const cont = obtenerContenedorServidor();
	try {
		const tasa = await cont.tasaRepository.obtenerUsdt();
		return json(
			{ ok: true, data: tasa },
			{
				headers: {
					'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
				}
			}
		);
	} catch (err) {
		const mensaje = err instanceof Error ? err.message : 'Error desconocido';
		return json({ ok: false, error: mensaje }, { status: 503 });
	}
};
