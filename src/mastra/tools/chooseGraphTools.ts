import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { MongoClient } from 'mongodb';

export const chooseGraphTool = createTool({
  id: 'suggest-graph',
  description: 'MongoDB koleksiyonundaki alanlara göre önerilen grafik türlerini döner.',
  inputSchema: z.object({
    uri: z.string().describe('MongoDB bağlantı URI'),
    dbName: z.string().describe('Veritabanı adı'),
    collectionName: z.string().describe('Koleksiyon adı'),
    sampleSize: z.number().default(20).describe('Örnek veri sayısı')
  }),
  outputSchema: z.array(
    z.object({
      field: z.string().describe('Alan adı'),
      type: z.string().describe('Alan tipi'),
      suggestedGraphs: z.array(z.string()).describe('Önerilen grafik türleri')
    })
  ),
  execute: async (context) => {
    const { uri, dbName, collectionName, sampleSize } = context.input;
    const client = new MongoClient(uri);

    try {
      await client.connect();
      const collection = client.db(dbName).collection(collectionName);
      const samples = await collection.find().limit(sampleSize).toArray();

      const fieldStats: Record<string, any[]> = {};
      for (const doc of samples) {
        for (const [key, value] of Object.entries(doc)) {
          if (!fieldStats[key]) fieldStats[key] = [];
          fieldStats[key].push(value);
        }
      }

      const results = Object.entries(fieldStats).map(([field, values]) => {
        const types = [...new Set(values.map(v => typeof v))];
        const suggestions: string[] = [];

        if (types.includes('number')) {
          suggestions.push('bar chart', 'line chart', 'histogram');
        } else if (types.includes('string')) {
          suggestions.push('pie chart', 'bar chart');
        }

        return {
          field,
          type: types.join(', '),
          suggestedGraphs: suggestions
        };
      });

      return results;
    } finally {
      await client.close();
    }
  }
});
