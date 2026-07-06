// LLM client — supports OpenAI-compatible APIs (OpenAI, Anthropic, etc.)
// Configure via env vars:
//   LLM_API_KEY  (required)
//   LLM_API_BASE (default: https://api.openai.com/v1)
//   LLM_MODEL    (default: gpt-4o)

const API_KEY = process.env.LLM_API_KEY || '';
const API_BASE = process.env.LLM_API_BASE || 'https://api.openai.com/v1';
const MODEL = process.env.LLM_MODEL || 'gpt-4o';

export function isLLMConfigured(): boolean {
  return !!API_KEY;
}

export async function generateAnalysis(
  systemPrompt: string,
  userContent: string,
  options?: { maxTokens?: number }
): Promise<string> {
  if (!API_KEY) throw new Error('LLM_API_KEY not configured');

  const maxTokens = options?.maxTokens || 4096;

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error (${res.status}): ${err.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

export async function generateAnalysisStreaming(
  systemPrompt: string,
  userContent: string,
  onChunk: (text: string) => void,
  options?: { maxTokens?: number }
): Promise<string> {
  if (!API_KEY) throw new Error('LLM_API_KEY not configured');

  const maxTokens = options?.maxTokens || 4096;

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error (${res.status}): ${err.slice(0, 300)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          onChunk(content);
        }
      } catch {
        // skip unparseable chunks
      }
    }
  }

  return fullText;
}
