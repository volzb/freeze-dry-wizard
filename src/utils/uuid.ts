
// Simple UUID generator for compatibility with the original app
export const v4 = () => {
  return crypto.randomUUID();
};
