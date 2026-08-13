import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as cheerio from 'cheerio';
import {
	ErrorScrapingBcv,
	parsearHtmlBcv,
	intentarUrl
} from '../server/sources/BCVScraper';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): string {
	return readFileSync(resolve(AQUI, './fixtures', name), 'utf8');
}

describe('BCVScraper - parser', () => {
	it('parsea HTML real del BCV (10-ago-2026): USD=757.5406, EUR=875.21695680', () => {
		const html = loadFixture('bcv-home.html');
		const r = parsearHtmlBcv(html);
		expect(r).not.toBeNull();
		expect(r!.usd).toBeCloseTo(757.5406, 3);
		expect(r!.eur).toBeCloseTo(875.2169568, 5);
		expect(r!.fecha).toBe('2026-08-10T00:00:00-04:00');
	});

	it('parsea HTML home alternativo con mismas tasas', () => {
		const html = loadFixture('bcv-home-alt.html');
		const r = parsearHtmlBcv(html);
		expect(r).not.toBeNull();
		expect(r!.usd).toBeCloseTo(757.5406, 3);
		expect(r!.eur).toBeCloseTo(875.2169568, 5);
	});

	it('devuelve null si el HTML no contiene datos reconocibles', () => {
		const r = parsearHtmlBcv('<html><body>No hay tasas</body></html>');
		expect(r).toBeNull();
	});

	it('tolera valores con separadores de miles y decimales venezuelanos (36,1234)', () => {
		const html = `
			<html><body>
				<div id="dolar"><div class="field-content"><div class="row recuadrotsmc">
					<div class="col-sm-6 col-xs-6"><span>USD</span></div>
					<div class="col-sm-6 col-xs-6 centrado textp"><strong class="strong-tb"> 36,1234</strong></div>
				</div></div></div>
				<div id="euro"><div class="field-content"><div class="row recuadrotsmc">
					<div class="col-sm-6 col-xs-6"><span>EUR</span></div>
					<div class="col-sm-6 col-xs-6 centrado textp"><strong class="strong-tb">40,5678</strong></div>
				</div></div></div>
				<span class="date-display-single" content="2026-01-15T00:00:00-04:00">15-ene-2026</span>
			</body></html>
		`;
		const r = parsearHtmlBcv(html);
		expect(r).not.toBeNull();
		expect(r!.usd).toBeCloseTo(36.1234, 4);
		expect(r!.eur).toBeCloseTo(40.5678, 4);
	});

	it('selector de fallback regex cuando no hay estructura HTML estándar', () => {
		const html = `
			<html><body>
				<div>Dólar 99,8877 Euro 110,5544</div>
			</body></html>
		`;
		const r = parsearHtmlBcv(html);
		expect(r).not.toBeNull();
		expect(r!.usd).toBeCloseTo(99.8877, 4);
		expect(r!.eur).toBeCloseTo(110.5544, 4);
	});

	it('cheerio carga el HTML correctamente', () => {
		const html = loadFixture('bcv-home.html');
		const $ = cheerio.load(html);
		const dolarEl = $('#dolar');
		expect(dolarEl.length).toBeGreaterThan(0);
		const strong = dolarEl.find('.recuadrotsmc strong.strong-tb');
		expect(strong.length).toBeGreaterThan(0);
		expect(strong.text().trim()).toContain('757,5406');
	});
});

describe('BCVScraper - error tipado', () => {
	it('ErrorScrapingBcv lleva causa', () => {
		const causa = new Error('xyz');
		const e = new ErrorScrapingBcv('mensaje', causa);
		expect(e.name).toBe('ErrorScrapingBcv');
		expect(e.message).toBe('mensaje');
		expect(e.causa).toBe(causa);
	});
});

describe('BCVScraper - intentarUrl', () => {
	it('intenta URL y devuelve resultado del HTML', async () => {
		const html = loadFixture('bcv-home.html');
		const fetcherMock = (async () => html) as unknown as typeof import('../infrastructure/http/client').httpGet;
		const r = await intentarUrl('https://www.bcv.org.ve/test', 5000, 0, fetcherMock);
		expect(r.usd).toBeCloseTo(757.5406, 3);
	});

	it('lanza ErrorScrapingBcv cuando el HTML no tiene tasa USD', async () => {
		const html = '<html><body>sin tasas</body></html>';
		const fetcherMock = (async () => html) as unknown as typeof import('../infrastructure/http/client').httpGet;
		await expect(intentarUrl('https://www.bcv.org.ve/test', 5000, 0, fetcherMock)).rejects.toThrow(
			ErrorScrapingBcv
		);
	});
});
