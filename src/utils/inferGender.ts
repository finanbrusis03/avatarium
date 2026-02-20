/**
 * Tenta inferir o gênero (M/F) baseado no primeiro nome ou sufixo comum
 * focado em handles e nomes de usuários de redes sociais brasileiros.
 */
export function inferGender(handle: string): 'M' | 'F' {
    if (!handle) return 'M';

    // 1. Limpa o handle (remove números, pontuação, underlines) e converte para minúsculas
    const cleanName = handle.toLowerCase().replace(/[^a-z]/g, '');

    // Se não sobrou nada legível, assumimos masculino padrão
    if (!cleanName || cleanName.length < 2) return 'M';

    // 2. Extrai um "primeiro nome" se houver um separador claro (ex: ana_julia -> ana)
    // Como já removemos underline/ponto, vamos apenas pegar o início da string nas heurísticas fonéticas e matchers absolutos

    const femaleExactMatches = new Set([
        'ana', 'maria', 'iza', 'luiza', 'julia', 'camila', 'leticia', 'bruna',
        'amanda', 'beatriz', 'vitoria', 'larissa', 'eduarda', 'yasmin', 'isabella',
        'isabela', 'alice', 'laura', 'manuela', 'giovanna', 'rafaela', 'fernanda',
        'carolina', 'gabriela', 'aline', 'juliana', 'mariana', 'luana', 'clara',
        'valentina', 'heloisa', 'sophia', 'livia', 'lorena', 'melissa', 'cecilia',
        'marcia', 'elisa', 'emily', 'ester', 'pamela', 'sabrina', 'marcela',
        'franciele', 'kauane', 'rayssa', 'mirella', 'elaine', 'ellen', 'rebeca',
        'patricia', 'sara', 'sarah', 'thais', 'thaissa', 'vanessa', 'viviane',
        'daniele', 'daniela', 'debora', 'deborah', 'natalia', 'nathalia', 'renata',
        'taynara', 'tayna', 'taina', 'tainara', 'aline', 'amanda', 'barbara', 'duda',
        'dandara'
    ]);

    const maleExactMatches = new Set([
        'lucas', 'matheus', 'pedro', 'gabriel', 'gustavo', 'guilherme', 'marcos',
        'luan', 'vitor', 'victor', 'joao', 'thiago', 'tiago', 'felipe', 'leonardo',
        'eduardo', 'rodrigo', 'rafael', 'caio', 'luiz', 'luis', 'henrique', 'bruno',
        'renan', 'igor', 'diego', 'arthur', 'vinicius', 'bernardo', 'enzo', 'miguel',
        'davi', 'theo', 'heitor', 'samuel', 'benicio', 'isaque', 'yuri', 'kaua',
        'brian', 'bryan', 'ryan', 'douglas', 'maikon', 'maicon', 'jonas', 'jonatas'
    ]);

    // Checagem 1: O começo da string corresponde exatamente a um nome feminino conhecido?
    for (const name of femaleExactMatches) {
        if (cleanName.startsWith(name)) return 'F';
    }

    // Checagem 2: Conhecido masculino explícito (Pra evitar falsos positivos terminados em 'a' como 'luca')
    for (const name of maleExactMatches) {
        if (cleanName.startsWith(name)) return 'M';
    }

    // Checagem 3: Heurísticas comuns de BR Femininos
    // Terminações muito fortes que indicam feminino na maioria das nicknames
    const femaleSuffixes = [
        'inha', 'zinha', 'elly', 'elle', 'ellys', 'nny', 'nna', 'duda'
    ];

    for (const suffix of femaleSuffixes) {
        if (cleanName.endsWith(suffix)) return 'F';
    }

    // Checagem 4: Regra geral da vogal 'A'. 
    // Em português, a imensa maioria dos nomes que terminam com 'a' são femininos.
    // E 'o' / consoantes são masculinos.
    // Exceções clássicas como Luca, Noah, etc já foram tratadas ou são mais raras que a regra.
    if (cleanName.endsWith('a')) {
        // Exceções extras masculinas que terminam em a
        const maleAExceptions = ['luca', 'noah', 'josua', 'joshua', 'elias', 'jonas'];
        if (!maleAExceptions.some(ex => cleanName.endsWith(ex))) {
            return 'F';
        }
    }

    return 'M'; // Padrão
}
