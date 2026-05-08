/**
 * Safely extracts a string from Express req.params
 * which TypeScript types as string | string[]
 */
export const param = (value: string | string[]): string => {
  return Array.isArray(value) ? value[0] : value;
};
