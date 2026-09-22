export const getApiErrorMessage = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const messages = value.map(getApiErrorMessage).filter((message): message is string => !!message);
    return messages.length ? messages.join(', ') : null;
  }
  if (value && typeof value === 'object' && 'message' in value) {
    return getApiErrorMessage((value as { message?: unknown }).message);
  }
  return null;
};
