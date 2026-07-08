// DeepSeek API client for Bazi & Ziwei reading generation.
// Configure via env vars:
//   DEEPSEEK_API_KEY   (required)
//   DEEPSEEK_BASE_URL  (default: https://api.deepseek.com/v1)
//   DEEPSEEK_MODEL     (default: deepseek-chat)

const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const API_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

export function isLLMConfigured(): boolean {
  return !!API_KEY;
}

export async function generateAnalysis(
  systemPrompt: string,
  userContent: string,
  options?: { maxTokens?: number }
): Promise<string> {
  if (!API_KEY) throw new Error('DEEPSEEK_API_KEY not configured');

  const maxTokens = options?.maxTokens || 8192;

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
    throw new Error(`DeepSeek API error (${res.status}): ${err.slice(0, 300)}`);
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
  if (!API_KEY) throw new Error('DEEPSEEK_API_KEY not configured');

  const maxTokens = options?.maxTokens || 8192;

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
    throw new Error(`DeepSeek API error (${res.status}): ${err.slice(0, 300)}`);
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
