import type { Jogador } from '../types/schema';
import { calcularValorMercado } from './mercadoTransferencias';

export function valorMercado(j: Jogador): number {
  return j.valor_mercado ?? calcularValorMercado(j.overall, j.idade, j.posicao);
}

export function salarioMensal(j: Jogador): number {
  if (j.contrato) {
    return j.contrato.salario_clt_mensal + j.contrato.direito_imagem_mensal;
  }
  return j.salario_mensal ?? j.overall * 520;
}

export function formatarDinheiro(valor: number): string {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(2)}M`;
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toFixed(0)}k`;
  return `R$ ${valor}`;
}

/** Formato completo pt-BR — use em formulários (mesma unidade que o jogador digita). */
export function formatarDinheiroExtenso(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(valor)));
}

/** Aceita `5950000`, `5.950.000` ou `R$ 5.950.000`. */
export function parseValorMonetario(texto: string): number {
  const t = texto.trim();
  if (!t) return 0;
  const soDigitos = t.replace(/\D/g, '');
  if (/^\d+$/.test(t.replace(/\s/g, ''))) {
    return Number.parseInt(soDigitos, 10) || 0;
  }
  const semMoeda = t.replace(/R\$\s?/gi, '').trim();
  const normalized = semMoeda.replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? Math.round(n) : Number.parseInt(soDigitos, 10) || 0;
}

export function arredondarOfertaMonetaria(valor: number): number {
  if (valor >= 5_000_000) return Math.round(valor / 250_000) * 250_000;
  if (valor >= 1_000_000) return Math.round(valor / 50_000) * 50_000;
  if (valor >= 100_000) return Math.round(valor / 10_000) * 10_000;
  return Math.round(valor / 1_000) * 1_000;
}