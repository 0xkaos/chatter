import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { env } = getRequestContext();
  const { messages, data, model, systemPrompt } = await req.json();

  // Debug logging for attachments
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.experimental_attachments?.length) {
    console.log(`Received ${lastMsg.experimental_attachments.length} attachments in last message`);
  } else {
    console.log('No attachments found in last message');
  }

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

  // Process messages to handle attachments (multimodal)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalMessages = messages.map((m: any) => {
    // Check for experimental_attachments (standard AI SDK way)
    if (m.experimental_attachments && m.experimental_attachments.length > 0) {
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...m.experimental_attachments
            .filter((a: any) => a.contentType?.startsWith('image/'))
            .map((a: any) => ({
              type: 'image_url',
              image_url: { url: a.url }
            }))
        ]
      };
    }
    
    // Legacy: Check if this is the last message and data.images was passed
    if (m === messages[messages.length - 1] && data && data.images && data.images.length > 0) {
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...data.images.map((image: string) => ({
            type: 'image_url',
            image_url: { url: image },
          })),
        ]
      };
    }

    // Standard text message
    return {
      role: m.role,
      content: m.content
    };
  });
  
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
