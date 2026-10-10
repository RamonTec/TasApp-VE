import dayjs from 'dayjs';
import 'dayjs/locale/es.js';

dayjs.locale('es');

const formateadorVes = new Intl.NumberFormat('es-VE', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const formateadorUsd = new Intl.NumberFormat('es-VE', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const formateadorNumero = new Intl.NumberFormat('es-VE', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 4
});

export function formatearVes(monto: number): string {
	if (!Number.isFinite(monto)) return 'Bs. 0,00';
	return `Bs. ${formateadorVes.format(monto)}`;
}

export function formatearUsd(monto: number): string {
	if (!Number.isFinite(monto)) return 'US$ 0,00';
	return `US$ ${formateadorUsd.format(monto)}`;
}

export function formatearUsdt(monto: number): string {
	if (!Number.isFinite(monto)) return 'USDT 0,00';
	return `USDT ${formateadorUsd.format(monto)}`;
}

export function formatearEur(monto: number): string {
	if (!Number.isFinite(monto)) return '€ 0,00';
	return `€ ${formateadorUsd.format(monto)}`;
}

export function formatearNumero(monto: number): string {
	if (!Number.isFinite(monto)) return '0,00';
	return formateadorNumero.format(monto);
}

export function formatearTasa(monto: number): string {
	if (!Number.isFinite(monto)) return '0,0000';
	return formateadorNumero.format(monto);
}

export function formatearPorcentaje(valor: number): string {
	if (!Number.isFinite(valor)) return '0,00%';
	const signo = valor > 0 ? '+' : '';
	return `${signo}${valor.toFixed(2).replace('.', ',')}%`;
}

export function formatearFecha(iso: string): string {
	if (!iso) return '';
	const d = dayjs(iso);
	return d.isValid() ? d.format('DD MMM YYYY · HH:mm') : '';
}

export function formatearFechaCorta(iso: string): string {
	if (!iso) return '';
	const d = dayjs(iso);
	return d.isValid() ? d.format('DD/MM/YYYY') : '';
}

export function tiempoRelativo(iso: string): string {
	if (!iso) return '';
	const d = dayjs(iso);
	if (!d.isValid()) return '';
	const diffMin = dayjs().diff(d, 'minute');
	if (diffMin < 1) return 'hace instantes';
	if (diffMin < 60) return `hace ${diffMin} min`;
	const diffHoras = dayjs().diff(d, 'hour');
	if (diffHoras < 24) return `hace ${diffHoras} h`;
	return d.format('DD MMM');
}

/**
 * Interpreta montos escritos al estilo venezolano o internacional:
 * "1.234,56" → 1234.56 · "1234,56" → 1234.56 · "1234.56" → 1234.56 · "1.234" → 1234.
 * Devuelve NaN si el texto no es un número.
 */
export function parsearMonto(texto: string): number {
	// Un separador al final ("12," mientras se escribe) no aporta nada.
	let s = texto.trim().replace(/\s|bs\.?|\$|€|usdt?/gi, '').replace(/(\d)[.,]$/, '$1');
	if (s === '') return Number.NaN;
	const ultimaComa = s.lastIndexOf(',');
	const ultimoPunto = s.lastIndexOf('.');
	if (ultimaComa >= 0 && ultimoPunto >= 0) {
		// El último separador que aparece es el decimal.
		const decimal = ultimaComa > ultimoPunto ? ',' : '.';
		const miles = decimal === ',' ? '.' : ',';
		s = s.split(miles).join('').replace(decimal, '.');
	} else if (ultimaComa >= 0) {
		const partes = s.split(',');
		s = partes.length > 2 ? partes.join('') : s.replace(',', '.');
	} else if (ultimoPunto >= 0) {
		const partes = s.split('.');
		// Varios puntos, o un punto seguido de exactamente 3 dígitos: separador de miles.
		if (partes.length > 2 || (partes[1].length === 3 && partes[0].length > 0)) {
			s = partes.join('');
		}
	}
	if (!/^-?\d*\.?\d+$/.test(s)) return Number.NaN;
	return Number.parseFloat(s);
}


/**
 * Da formato a un monto mientras se escribe: solo dígitos, "." de miles y "," decimal.
 * Los "." que lleguen se consideran separadores de miles y se descartan.
 * "1234567,891" → "1.234.567,89" · "abc12" → "12" · ",5" → "0,5" · "007" → "7".
 */
export function formatearEntradaMonto(texto: string, maxDecimales = 2, maxEnteros = 12): string {
	const limpio = texto.replace(/[^\d,]/g, '');
	const coma = limpio.indexOf(',');
	const entero = (coma >= 0 ? limpio.slice(0, coma) : limpio)
		.replace(/^0+(?=\d)/, '')
		.slice(0, maxEnteros);
	const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	if (coma < 0 || maxDecimales <= 0) return agrupado;
	const decimales = limpio.slice(coma + 1).replace(/,/g, '').slice(0, maxDecimales);
	return `${agrupado || '0'},${decimales}`;
}

/** Monto numérico como texto de entrada: 1234.5 → "1.234,5". */
export function montoAEntrada(monto: number, maxDecimales = 2): string {
	if (!Number.isFinite(monto)) return '';
	const texto = String(Number(monto.toFixed(maxDecimales))).replace('.', ',');
	return formatearEntradaMonto(texto, maxDecimales);
}
