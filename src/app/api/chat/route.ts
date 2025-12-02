import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages, data, model, systemPrompt } = await req.json();

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

  const response = await openai.chat.completions.create({
    model: model || 'gpt-4o',
    stream: true,
    messages: finalMessages,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = OpenAIStream(response as any);
  return new StreamingTextResponse(stream);
}
