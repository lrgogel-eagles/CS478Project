export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

export function isText(value: unknown): value is string {
  return typeof value === 'string';
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function unexpected(what: string): never {
  throw new Error(`The server sent back an unexpected ${what}.`);
}

export function readList<T>(data: unknown, isItem: (item: unknown) => item is T, what: string): T[] {
  if (!Array.isArray(data) || !data.every(isItem)) return unexpected(what);
  return data;
}

export function readOne<T>(data: unknown, isItem: (item: unknown) => item is T, what: string): T {
  if (!isItem(data)) return unexpected(what);
  return data;
}
