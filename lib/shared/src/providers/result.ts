export type ProviderResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export function ok<T>(data: T): ProviderResult<T> {
  return { success: true, data };
}

export function fail<T>(error: string, code?: string): ProviderResult<T> {
  return { success: false, error, code };
}
