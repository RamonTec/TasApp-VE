import { describe, it, expect } from 'vitest';
import { httpGet, ErrorRed, ErrorTls, hostPermitidoInseguro } from '../infrastructure/http/client';

function makeResponse(body: unknown, status = 200): Response {
	const headers = new Headers({ 'content-type': 'application/json' });
	return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
		status,
		statusText: 'OK',
		headers
	});
}

describe('hostPermitidoInseguro (lógica pura de whitelist)', () => {
	it('habilita TLS inseguro cuando host exacto en whitelist', () => {
		expect(
			hostPermitidoInseguro('https://www.bcv.org.ve/x', 'insegura', ['bcv.org.ve'])
		).toBe(true);
	});

	it('habilita TLS inseguro para subdominio', () => {
		expect(hostPermitidoInseguro('https://api.bcv.org.ve/v1', 'insegura', ['bcv.org.ve'])).toBe(
			true
		);
	});

	it('rechaza host fuera de whitelist aunque política sea insegura', () => {
		expect(hostPermitidoInseguro('https://otro.com/x', 'insegura', ['bcv.org.ve'])).toBe(false);
	});

	it('rechaza si política es segura', () => {
		expect(hostPermitidoInseguro('https://www.bcv.org.ve', 'segura', ['bcv.org.ve'])).toBe(false);
	});

	it('rechaza si no hay whitelist', () => {
		expect(hostPermitidoInseguro('https://www.bcv.org.ve', 'insegura', [])).toBe(false);
	});

	it('rechaza si no hay política definida', () => {
		expect(hostPermitidoInseguro('https://www.bcv.org.ve', undefined, ['bcv.org.ve'])).toBe(
			false
		);
	});

	it('acepta otros whitelists', () => {
		expect(
			hostPermitidoInseguro('https://otro-banco.com.ve/x', 'insegura', ['otro-banco.com.ve'])
		).toBe(true);
	});

	it('whitelist vacío devuelve siempre false', () => {
		expect(hostPermitidoInseguro('https://x.com/y', 'insegura', undefined)).toBe(false);
	});
});

describe('httpGet con TLS seguro (mock funciona por globalThis.fetch)', () => {
	const originalFetch = globalThis.fetch;

	function mockFetch(impl: (url: string) => Promise<Response>) {
		(globalThis as unknown as { fetch: typeof fetch }).fetch = ((
			url: string | URL | Request,
			_init?: RequestInit
		) => impl(typeof url === 'string' ? url : url.toString())) as typeof fetch;
	}

	afterEach(() => {
		(globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
	});

	it('lanza ErrorRed al agotar retries con fetch seguro (cert autofirmado)', async () => {
		mockFetch(() =>
			Promise.reject(new Error('unable to verify the first certificate'))
		);

		await expect(
			httpGet('https://www.bcv.org.ve/test', {
				timeoutMs: 500,
				reintentos: 0
			})
		).rejects.toBeInstanceOf(ErrorRed);
	});

	it('NO lanza ErrorTls si TLS inseguro no está habilitado', async () => {
		mockFetch(() => Promise.reject(new Error('unable to verify the first certificate')));

		await expect(
			httpGet('https://www.bcv.org.ve/test', {
				timeoutMs: 500,
				reintentos: 0
			})
		).rejects.not.toBeInstanceOf(ErrorTls);
	});

	it('mock funciona cuando host NO está en whitelist (path seguro)', async () => {
		mockFetch((url) => {
			expect(url).toContain('otro-no-whitelisted.com');
			return Promise.resolve(makeResponse({ ok: true }, 200));
		});

		const result = await httpGet('https://otro-no-whitelisted.com/api', {
			politicaTls: 'insegura',
			hostsInseguros: ['bcv.org.ve'],
			timeoutMs: 5000,
			reintentos: 0
		});
		expect(result).toEqual({ ok: true });
	});
});
