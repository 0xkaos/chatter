import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { env } = getRequestContext();
  const { messages, data, model, systemPrompt } = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openaiKey = process.env.OPENAI_API_KEY || (env as any).OPENAI_API_KEY;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xaiKey = process.env.XAI_API_KEY || (env as any).XAI_API_KEY;

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: openaiKey,
  });

  // Determine which client to use based on the model
  let client = openai;
  
  // Check if it's an xAI model (usually starts with 'grok')
  if (model && (model.includes('grok') || model.includes('xai'))) {
    if (xaiKey) {
      client = new OpenAI({
        apiKey: xaiKey,
        baseURL: 'https://api.x.ai/v1'
      });
    } else {
      console.warn('xAI model requested but XAI_API_KEY not found');
    }
  }

  // If there are images in the data payload, attach them to the last message
  const initialMessages = messages.slice(0, -1);
  const currentMessage = messages[messages.length - 1];

  if (data && data.images && data.images.length > 0) {
    currentMessage.content = [
      { type: 'text', text: currentMessage.content },
      ...data.images.map((image: string) => ({
        type: 'image_url',
        image_url: { url: image },
      })),
    ];
  }

  const finalMessages = [...initialMessages, currentMessage];
  
  if (systemPrompt) {
    finalMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const response = await client.chat.completions.create({
    model: model || 'gpt-4o',
    stream: true,
    messages: finalMessages,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = OpenAIStream(response as any);
  return new StreamingTextResponse(stream);
}
