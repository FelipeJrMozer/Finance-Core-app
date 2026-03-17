import { anthropic } from "@workspace/integrations-anthropic-ai";

export interface ParsedTransaction {
  amount: number;
  type: "expense" | "income";
  description: string;
  merchant?: string;
  category: string;
  bank?: string;
  confidence: "high" | "medium" | "low";
  isTransaction: boolean;
}

const SYSTEM_PROMPT = `Você é um analisador financeiro especializado em mensagens bancárias brasileiras.
Analise a mensagem fornecida e extraia informações de transações financeiras.

Responda SOMENTE com um JSON válido no seguinte formato:
{
  "isTransaction": true/false,
  "amount": número em reais (ex: 150.50),
  "type": "expense" ou "income",
  "description": "descrição concisa da transação",
  "merchant": "nome do estabelecimento se disponível",
  "category": uma das categorias: Alimentação|Transporte|Moradia|Saúde|Educação|Lazer|Compras|Serviços|Renda|Transferência|Outro,
  "bank": "nome do banco se identificável",
  "confidence": "high" | "medium" | "low"
}

Regras:
- Se não for uma transação financeira, retorne isTransaction: false e preencha os outros campos com valores padrão
- Valores como "R$ 1.250,90" devem virar 1250.90
- PIX recebido = income, PIX enviado = expense
- Compra no débito/crédito = expense
- Estorno/crédito = income
- Categoria "Alimentação": restaurantes, delivery, supermercado, padaria, lanchonete
- Categoria "Transporte": Uber, 99, taxi, combustível, pedágio, estacionamento
- Categoria "Lazer": Netflix, Spotify, cinema, games, streaming
- Categoria "Saúde": farmácia, médico, hospital, plano de saúde
- Categoria "Compras": lojas, e-commerce, vestuário
- Confidence "high" = banco + valor + tipo claramente identificados`;

export async function parseTransactionText(text: string): Promise<ParsedTransaction> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `Analise esta mensagem: ${text}`,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]) as ParsedTransaction;
    return parsed;
  } catch {
    return {
      isTransaction: false,
      amount: 0,
      type: "expense",
      description: text.slice(0, 80),
      category: "Outro",
      confidence: "low",
      isTransaction: false,
    };
  }
}
