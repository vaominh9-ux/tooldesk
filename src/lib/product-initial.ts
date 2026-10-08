export function productInitial(name?: string): string {
  return name?.trim().normalize('NFC').match(/[\p{L}\p{N}]/u)?.[0].toLocaleUpperCase('vi-VN') || '?';
}
