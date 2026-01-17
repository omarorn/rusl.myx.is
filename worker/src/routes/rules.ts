import { Hono } from 'hono';
import type { Env, BinType } from '../types';
import { BIN_INFO } from '../services/iceland-rules';

const rules = new Hono<{ Bindings: Env }>();

// Municipality-specific bin configurations
const MUNICIPALITY_RULES: Record<string, {
  name: string;
  bins: BinType[];
  notes: string[];
}> = {
  reykjavik: {
    name: 'Reykjavík (SORPA)',
    bins: ['paper', 'plastic', 'food', 'mixed'],
    notes: [
      'Málmar fara með plasti',
      'Matarleifar í pappírspoka',
      'Gler fer á endurvinnslustöð',
    ],
  },
  kopavogur: {
    name: 'Kópavogur (SORPA)',
    bins: ['paper', 'plastic', 'food', 'mixed'],
    notes: [
      'Sama kerfi og Reykjavík',
    ],
  },
  akureyri: {
    name: 'Akureyri',
    bins: ['food', 'mixed'],
    notes: [
      'Pappír og plast fer á endurvinnslustöð',
      'Aðeins lífrænt og blandað heima',
    ],
  },
};

// GET /api/rules/:sveitarfelag
rules.get('/:sveitarfelag', (c) => {
  const sveitarfelag = c.req.param('sveitarfelag').toLowerCase();
  const config = MUNICIPALITY_RULES[sveitarfelag];
  
  if (!config) {
    return c.json({ 
      error: 'Sveitarfélag ekki fundið',
      available: Object.keys(MUNICIPALITY_RULES),
    }, 404);
  }
  
  const bins = config.bins.map(bin => ({
    type: bin,
    ...BIN_INFO[bin],
  }));
  
  return c.json({
    sveitarfelag,
    name: config.name,
    bins,
    notes: config.notes,
  });
});

// GET /api/rules (list all)
rules.get('/', (c) => {
  const all = Object.entries(MUNICIPALITY_RULES).map(([key, config]) => ({
    key,
    name: config.name,
    binCount: config.bins.length,
  }));
  
  return c.json({ municipalities: all });
});

export default rules;
