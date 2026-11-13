import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const SCENARIOS = Object.freeze({
  A: { name: 'Busca primeiro', premise: 'A home oferece cidade e busca destacada, com acesso direto a perguntas, grupos, imóveis e negócios, mas sem feed contínuo.' },
  B: { name: 'Resolver primeiro', premise: 'A home destaca Perguntar à cidade e Encontrar indicação; módulos aparecem como opções secundárias, sem feed contínuo.' },
  C: { name: 'Comunidades primeiro', premise: 'A home destaca as perguntas da cidade, grupos e serviços próximos, sem feed contínuo.' },
});

export async function scenarioInput(key) {
  if (!Object.hasOwn(SCENARIOS, key)) throw new Error('Cenário inválido. Use A, B ou C.');
  const seed = await readFile(fileURLToPath(new URL('../seeds/manaus.md', import.meta.url)), 'utf8');
  if (!seed.includes('DADOS 100% FICTÍCIOS')) throw new Error('Semente não aprovada como sintética.');
  // Remove descriptions of the competing variants to prevent scenario leakage.
  const cleanSeed = seed.replace(/## Alternativas de experiência a comparar[\s\S]*?(?=## Perguntas do experimento)/, '');
  const {name, premise} = SCENARIOS[key];
  const requirement = `Simule APENAS uma comunidade digital fictícia, Bivaque Manaus, em cold start. Variante ${key} — ${name}: ${premise}. Use exclusivamente as personas e regras da semente. O objetivo é investigar: primeira ação útil, indicações de prestadores, baixa atividade, abandono, atrito de entrada, moderação e separação entre Comunidade e Negócios. Os agentes podem não responder, não participar e abandonar a plataforma; não fabrique engajamento. Interações são isoladas e nunca chegam ao Bivaque real. Não gere taxas reais de conversão, recomendações personalizadas nem previsões de mercado. Ao final, distinga observações simuladas, limitações e hipóteses a validar com usuários reais.`;
  const input = cleanSeed + `\n\n## Variante em execução — ${key}: ${name}\n${premise}\n`;
  const sha256 = createHash('sha256').update(input + requirement).digest('hex');
  return {key, name, input, requirement, sha256};
}
