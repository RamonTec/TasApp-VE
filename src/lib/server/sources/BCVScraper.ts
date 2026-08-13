import * as cheerio from 'cheerio';
import type { TasaBcv } from '../../domain/entities/types.js';
import { ErrorHttp, httpGet } from '../../infrastructure/http/client.js';

const URLS_BCV: readonly string[] = [
	'https://www.bcv.org.ve/estadisticas/tipo-cambio-de-referencia-smc',
	'https://www.bcv.org.ve/'
];

const HOSTS_BCV_INSEGUROS: readonly string[] = ['bcv.org.ve'];

export class ErrorScrapingBcv extends Error {
	constructor(message: string, public readonly causa?: unknown) {
		super(message);
		this.name = 'ErrorScrapingBcv';
	}
}

function parsearNumeroVenezuela(texto: string | undefined): number | null {
	if (!texto) return null;
	const limpio = texto.replace(/\s/g, '').replace(',', '.');
	const num = parseFloat(limpio);
	return Number.isFinite(num) && num > 0 ? num : null;
}

function intentarParseoSelector($: cheerio.CheerioAPI, id: string): number | null {
	const el = $(`#${id}`);
	if (!el.length) return null;
	const dentroDeRecuadro = el.find('.recuadrotsmc strong.strong-tb');
	if (dentroDeRecuadro.length) {
		return parsearNumeroVenezuela(dentroDeRecuadro.text().trim());
	}
	const strongGenerico = el.find('strong').first();
	if (strongGenerico.length) {
		return parsearNumeroVenezuela(strongGenerico.text().trim());
	}
	return parsearNumeroVenezuela(el.text().trim());
}

function buscarPorRegex(texto: string, patron: RegExp): number | null {
	const m = texto.match(patron);
	return m && m[1] ? parsearNumeroVenezuela(m[1]) : null;
}

function parseFallback(html: string, simbolo: string): number | null {
	const patron = new RegExp(`${simbolo}[\\s\\S]{0,200}?(\\d{1,4}[,.]\\d{2,8})`, 'i');
	return buscarPorRegex(html, patron);
}

export interface ResultadoScraping {
	readonly usd: number;
	readonly eur: number;
	readonly fecha: string | null;
}

export function parsearHtmlBcv(html: string): ResultadoScraping | null {
	const $ = cheerio.load(html);

	let usd = intentarParseoSelector($, 'dolar');
	let eur = intentarParseoSelector($, 'euro');

	if (usd === null) usd = parseFallback(html, 'd[oó]lar');
	if (eur === null) eur = parseFallback(html, 'euro');

	if (usd === null) return null;

	const fechaIso = $('span.date-display-single[content]').first().attr('content');

	return {
		usd,
		eur: eur ?? 0,
		fecha: fechaIso ?? new Date().toISOString()
	};
}

export async function intentarUrl(
	url: string,
	timeoutMs: number,
	reintentos: number,
	fetcher: typeof httpGet = httpGet
): Promise<ResultadoScraping> {
	const html = (await fetcher<string>(url, {
		timeoutMs,
		reintentos,
		politicaTls: 'insegura',
		hostsInseguros: HOSTS_BCV_INSEGUROS
	})) as string;
	const r = parsearHtmlBcv(html);
	if (!r) throw new ErrorScrapingBcv(`No se pudo extraer tasa USD desde ${url}`);
	return r;
}

export async function scrapearBcv(): Promise<TasaBcv> {
	let ultimoError: unknown = null;
	for (const url of URLS_BCV) {
		try {
			const r = await intentarUrl(url, 10000, 1);
			return {
				fuente: 'BCV',
				valor: r.usd,
				usd: r.usd,
				eur: r.eur,
				fuenteUsada: 'bcv.org.ve',
				fecha: r.fecha ?? new Date().toISOString()
			};
		} catch (err) {
			ultimoError = err;
			if (err instanceof ErrorHttp) {
				throw new ErrorScrapingBcv(`BCV respondió ${err.status} en ${url}`, err);
			}
		}
	}

	if (ultimoError instanceof Error) {
		throw new ErrorScrapingBcv(
			`No se pudo conectar con BCV (${URLS_BCV.join(' / ')})`,
			ultimoError
		);
	}
	throw new ErrorScrapingBcv('No se pudo conectar con BCV');
}
