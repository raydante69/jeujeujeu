// Generates the branching node map for one "leg" (the path leading up to a gym).
// Shaped like a small roguelike map: a start node, a few rows of branching
// choices, then the gym. The player walks row by row choosing the next node.
import { MAP_SHAPE } from '../data/regions.js';
import { ASSETS, itemSprite } from '../assets.js';

export const NODE_TYPES = {
  wild:    { img: ASSETS.grass, label: 'Wild' },
  trainer: { img: ASSETS.trainers.leaders[2], label: 'Trainer' },
  item:    { img: itemSprite('potion'), label: 'Item' },
  catch:   { img: ASSETS.ball, label: 'Catch' },
  rest:    { img: ASSETS.pokecenter, label: 'Rest' },
  tm:      { img: ASSETS.tm, label: 'TM' },
  gym:     { img: ASSETS.gym, label: 'Gym' },
};

function weightedType(rng, legIndex, row) {
  // Guarantee a catch on the first row of the first leg so the player builds a
  // team of at least two before any fight.
  if (legIndex === 0 && row === 1) return 'catch';
  const table = [
    ['wild', 32], ['trainer', 20], ['item', 16], ['catch', 14], ['tm', 10], ['rest', 8],
  ];
  const total = table.reduce((s, [, w]) => s + w, 0);
  let roll = rng.next() * total;
  for (const [t, w] of table) { if ((roll -= w) <= 0) return t; }
  return 'wild';
}

export function generateLeg(rng, legIndex, gym) {
  const rows = [];
  const nodes = {};
  const id = (r, c) => `r${r}c${c}`;

  // Row 0: single start node.
  const start = { id: id(0, 0), row: 0, col: 0, type: 'start', next: [], x: 50, y: 6 };
  nodes[start.id] = start;
  rows.push([start]);

  const rowCount = MAP_SHAPE.rows;
  for (let r = 1; r <= rowCount; r++) {
    const count = rng.int(MAP_SHAPE.minPerRow, MAP_SHAPE.maxPerRow);
    const row = [];
    for (let c = 0; c < count; c++) {
      const node = {
        id: id(r, c), row: r, col: c,
        type: weightedType(rng, legIndex, r),
        next: [],
        x: count === 1 ? 50 : 18 + (c * 64) / (count - 1),
        y: 6 + (r * 80) / (rowCount + 1),
      };
      nodes[node.id] = node;
      row.push(node);
    }
    rows.push(row);
  }

  // Gym row.
  const gymNode = { id: 'gym', row: rowCount + 1, col: 0, type: 'gym', gym, next: [], x: 50, y: 94 };
  nodes[gymNode.id] = gymNode;
  rows.push([gymNode]);

  // Connect each row to the next: every node links to 1–2 nearest columns.
  for (let r = 0; r < rows.length - 1; r++) {
    const cur = rows[r];
    const nxt = rows[r + 1];
    for (const node of cur) {
      if (nxt.length === 1) { node.next = [nxt[0].id]; continue; }
      // nearest column in next row + maybe a neighbour
      const ratio = node.col / Math.max(1, cur.length - 1);
      const target = Math.round(ratio * (nxt.length - 1));
      const links = new Set([target]);
      if (rng.chance(0.5)) links.add(Math.min(nxt.length - 1, target + 1));
      if (rng.chance(0.3)) links.add(Math.max(0, target - 1));
      node.next = [...links].sort().map((c) => nxt[c].id);
    }
  }
  // Ensure every next-row node is reachable (link an orphan from nearest prev).
  for (let r = 1; r < rows.length; r++) {
    for (const node of rows[r]) {
      const hasParent = rows[r - 1].some((p) => p.next.includes(node.id));
      if (!hasParent) {
        const parent = rows[r - 1][Math.min(rows[r - 1].length - 1, node.col)];
        parent.next.push(node.id);
      }
    }
  }

  return { legIndex, gym, rows, nodes, startId: start.id, gymId: 'gym' };
}
