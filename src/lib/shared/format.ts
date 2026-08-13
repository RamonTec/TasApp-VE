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
