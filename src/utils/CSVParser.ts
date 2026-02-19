import { normalizeHandle } from './normalizeHandle';

export interface CSVRow {
    name: string;
    gender: 'M' | 'F';
}

export const CSVParser = {
    parse(csv: string): CSVRow[] {
        const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
        const results: CSVRow[] = [];

        for (const line of lines) {
            // Support comma, semicolon or tabs
            const parts = line.split(/[;,\t]/).map(p => p.trim());
            if (parts.length === 0) continue;

            const name = normalizeHandle(parts[0]);
            if (!name) continue;

            let gender: 'M' | 'F' = 'M';
            if (parts.length > 1) {
                const g = parts[1].toUpperCase();
                if (g === 'F' || g === 'FEMALE' || g === 'MULHER') gender = 'F';
            }

            results.push({ name, gender });
        }

        return results;
    }
};
