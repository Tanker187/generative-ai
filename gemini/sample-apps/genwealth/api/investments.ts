import { Database, camelCaseRows, safeString } from './database';

export class Investments {
    constructor(private db: Database) { }

    async search(searchTerms: string[]) {
        console.log('using searchTerms', searchTerms);

        // Normalize and filter terms defensively
        const normalizedTerms = (searchTerms || [])
            .map(t => (t != null ? String(t).trim() : ''))
            .filter(t => t !== '');

        if (!normalizedTerms.length) {
            // No usable search terms; return empty result set
            return { data: [], query: '' };
        }

        let query = `SELECT ticker, etf, rating, analysis
            FROM investments
            WHERE analysis LIKE '%${safeString(normalizedTerms[0]) ?? ''}%'`;
        
        for (let i = 1; i < normalizedTerms.length; i++) {
            const term = normalizedTerms[i];
            query += `
                    AND analysis LIKE '%${safeString(term)}%'`;
        }
        
        query += ` 
            LIMIT 5;`

        const rows = await this.db.query(query);
        return { data: camelCaseRows(rows), query: query };
    }

    async semanticSearch(prompt: string) {
        const query = `SELECT ticker, etf, rating, analysis, 
            analysis_embedding <=> google_ml.embedding('text-embedding-005', '${safeString(prompt)}')::vector AS distance
            FROM investments
            ORDER BY distance
            LIMIT 5;`;

        try
        {
            const rows = await this.db.query(query);
            return { data: camelCaseRows(rows), query: query };
        }
        catch (error)
        {
            throw new Error(`semanticSearch errored with query: ${query}.\nError: ${(error as Error)?.message}`);
        }
    }
}
