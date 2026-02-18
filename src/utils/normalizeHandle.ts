export function normalizeHandle(input: string): string {
    return input.trim().replace(/^@/, '').toLowerCase();
}
