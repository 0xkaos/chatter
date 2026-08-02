export const HUGGING_FACE_MODEL_PREFIX = 'huggingface:';

export const DEFAULT_HUGGING_FACE_ENDPOINT =
  'https://gk7ckq0gktlqaki8.us-east-1.aws.endpoints.huggingface.cloud';

export function getHuggingFaceBaseURL(endpoint?: string) {
  const normalizedEndpoint = (endpoint || DEFAULT_HUGGING_FACE_ENDPOINT)
    .replace(/\/+$/, '')
    .replace(/\/v1$/, '');

  return `${normalizedEndpoint}/v1`;
}

export function getHuggingFaceSelectorId(modelId: string) {
  return `${HUGGING_FACE_MODEL_PREFIX}${modelId}`;
}

export function isHuggingFaceSelectorId(modelId?: string): modelId is string {
  return Boolean(modelId?.startsWith(HUGGING_FACE_MODEL_PREFIX));
}

export function getHuggingFaceModelId(selectorId: string) {
  return selectorId.slice(HUGGING_FACE_MODEL_PREFIX.length);
}

export function getHuggingFaceModelLabel(modelId: string) {
  const fileName = modelId.split('/').pop() || modelId;
  return fileName.replace(/\.gguf$/i, '');
}
