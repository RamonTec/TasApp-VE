export interface OpcionesHttp {
	readonly timeoutMs?: number;
	readonly reintentos?: number;
	readonly headers?: Record<string, string>;
	readonly politicaTls?: 'segura' | 'insegura';
	readonly hostsInseguros?: readonly string[];
}

export class ErrorHttp extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly cuerpo?: unknown
	) {
		super(message);
		this.name = 'ErrorHttp';
	}
}

export class ErrorRed extends Error {
	constructor(message: string, public readonly causaOriginal?: unknown) {
		super(message);
		this.name = 'ErrorRed';
	}
}

export class ErrorTls extends Error {
	constructor(message: string, public readonly causaOriginal?: unknown) {
		super(message);
		this.name = 'ErrorTls';
	}
}

async function delay(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function hostDeUrl(url: string): string | null {
	try {
		return new URL(url).hostname.toLowerCase();
	} catch {
		return null;
	}
}

function hostPermitidoInseguroInterno(
	url: string,
	politicaTls: 'segura' | 'insegura' | undefined,
	hostsInseguros: readonly string[] | undefined
): boolean {
	if (politicaTls !== 'insegura') return false;
	if (!hostsInseguros || hostsInseguros.length === 0) return false;
	const host = hostDeUrl(url);
	if (!host) return false;
	return hostsInseguros.some((whitelistHost) => {
		const whitelisted = whitelistHost.toLowerCase();
		return host === whitelisted || host.endsWith(`.${whitelisted}`);
	});
}

export function hostPermitidoInseguro(
	url: string,
	politicaTls: 'segura' | 'insegura' | undefined,
	hostsInseguros: readonly string[] | undefined
): boolean {
	return hostPermitidoInseguroInterno(url, politicaTls, hostsInseguros);
}

async function fetchSeguro(
	url: string,
	init: RequestInit,
	timeoutMs: number
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timeoutId);
	}
}

async function fetchInseguro(
	url: string,
	init: RequestInit,
	timeoutMs: number
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const mod = (await import('undici')) as unknown as {
			Agent: new (opts: { connect?: { rejectUnauthorized?: boolean } }) => unknown;
			fetch: (
				url: string,
				init: RequestInit & { dispatcher: unknown }
			) => Promise<Response>;
		};
		const dispatcher = new mod.Agent({ connect: { rejectUnauthorized: false } });
		return await mod.fetch(url, {
			...init,
			signal: controller.signal,
			dispatcher
		});
	} finally {
		clearTimeout(timeoutId);
	}
}

async function ejecutarPeticion(
	url: string,
	method: 'GET' | 'POST',
	headers: Record<string, string>,
	body: string | undefined,
	politicaTls: 'segura' | 'insegura' | undefined,
	hostsInseguros: readonly string[] | undefined,
	timeoutMs: number
): Promise<Response> {
	const init: RequestInit = { method, headers };
	if (body !== undefined) init.body = body;

	const inseguro = hostPermitidoInseguroInterno(url, politicaTls, hostsInseguros);
	try {
		return inseguro
			? await fetchInseguro(url, init, timeoutMs)
			: await fetchSeguro(url, init, timeoutMs);
	} catch (err) {
		if (inseguro && err instanceof Error && /unable to verify|certificate/i.test(err.message)) {
			throw new ErrorTls(`Certificado no verificable para ${hostDeUrl(url)}`, err);
		}
		throw err;
	}
}

export async function httpGet<T>(url: string, opciones: OpcionesHttp = {}): Promise<T> {
	const { timeoutMs = 8000, reintentos = 1, headers = {}, politicaTls, hostsInseguros } = opciones;
	const headersDefault: Record<string, string> = {
		'User-Agent':
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
		Accept: 'application/json, text/html;q=0.9, */*;q=0.5',
		'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
		...headers
	};

	let ultimoError: unknown;
	for (let intento = 0; intento <= reintentos; intento++) {
		try {
			const res = await ejecutarPeticion(
				url,
				'GET',
				headersDefault,
				undefined,
				politicaTls,
				hostsInseguros,
				timeoutMs
			);
			if (!res.ok) {
				throw new ErrorHttp(`HTTP ${res.status} en ${url}`, res.status);
			}
			const ct = res.headers.get('content-type') ?? '';
			if (ct.includes('application/json')) {
				return (await res.json()) as T;
			}
			return (await res.text()) as unknown as T;
		} catch (err) {
			ultimoError = err;
			if (intento < reintentos) {
				await delay(300 * (intento + 1));
			}
		}
	}
	if (ultimoError instanceof Error) {
		throw new ErrorRed(`Falló GET ${url}: ${ultimoError.message}`, ultimoError);
	}
	throw new ErrorRed(`Falló GET ${url}`);
}

export async function httpPost<TBody, TResp>(
	url: string,
	body: TBody,
	opciones: OpcionesHttp = {}
): Promise<TResp> {
	const { timeoutMs = 8000, reintentos = 1, headers = {}, politicaTls, hostsInseguros } = opciones;
	const headersDefault: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
		...headers
	};

	let ultimoError: unknown;
	for (let intento = 0; intento <= reintentos; intento++) {
		try {
			const res = await ejecutarPeticion(
				url,
				'POST',
				headersDefault,
				JSON.stringify(body),
				politicaTls,
				hostsInseguros,
				timeoutMs
			);
			if (!res.ok) {
				throw new ErrorHttp(`HTTP ${res.status} en ${url}`, res.status);
			}
			return (await res.json()) as TResp;
		} catch (err) {
			ultimoError = err;
			if (intento < reintentos) {
				await delay(300 * (intento + 1));
			}
		}
	}
	if (ultimoError instanceof Error) {
		throw new ErrorRed(`Falló POST ${url}: ${ultimoError.message}`, ultimoError);
	}
	throw new ErrorRed(`Falló POST ${url}`);
}
