// Renders the branching leg map into #map-container. Only the current node's
// successors are selectable; resolved nodes are marked done.
import { $, el, clear } from './screens.js';
import { NODE_TYPES } from '../engine/mapgen.js';
import { updateHud } from './hud.js';

const SVGNS = 'http://www.w3.org/2000/svg';

export function renderMap(run, { onNode }) {
  updateHud(run);
  const container = $('#map-container');
  if (!container) return;
  clear(container);

  const map = run.map;
  const cleared = new Set(run.cleared || []);
  const currentNode = map.nodes[run.nodeId];
  const selectable = new Set(currentNode ? currentNode.next : []);

  // Connecting lines (SVG behind the nodes).
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'map-lines');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  for (const node of Object.values(map.nodes)) {
    for (const nid of node.next) {
      const nxt = map.nodes[nid];
      const line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('x1', node.x); line.setAttribute('y1', node.y);
      line.setAttribute('x2', nxt.x); line.setAttribute('y2', nxt.y);
      const onPath = cleared.has(node.id) && (cleared.has(nid) || nid === run.nodeId);
      const active = node.id === run.nodeId && selectable.has(nid);
      line.setAttribute('class', 'map-line' + (onPath ? ' on-path' : '') + (active ? ' active' : ''));
      svg.appendChild(line);
    }
  }
  container.appendChild(svg);

  // Nodes.
  for (const node of Object.values(map.nodes)) {
    if (node.type === 'start') continue;
    const meta = NODE_TYPES[node.type] || { icon: '?', label: node.type };
    const isCurrent = node.id === run.nodeId;
    const isDone = cleared.has(node.id);
    const isSel = selectable.has(node.id) && !isDone;
    const btn = el('button', {
      type: 'button',
      className: `map-node node-${node.type}`
        + (isDone ? ' done' : '') + (isCurrent ? ' current' : '') + (isSel ? ' selectable' : ' locked'),
      style: { left: node.x + '%', top: node.y + '%' },
      'aria-label': meta.label,
    },
      el('span', { className: 'map-node-icon' }, isDone ? '✓' : meta.icon),
      node.type === 'gym' && node.gym ? el('span', { className: 'map-node-tag' }, node.gym.leader) : null,
    );
    if (isSel) btn.addEventListener('click', () => onNode(node.id));
    btn.addEventListener('mouseenter', (e) => showNodeTip(e, node, meta));
    btn.addEventListener('mouseleave', hideNodeTip);
    container.appendChild(btn);
  }
}

function showNodeTip(e, node, meta) {
  const tip = $('#map-node-tooltip');
  if (!tip) return;
  tip.innerHTML = '';
  tip.appendChild(el('div', { className: 'tip-title' }, meta.icon + ' ' + meta.label));
  if (node.type === 'gym' && node.gym) {
    tip.appendChild(el('div', { className: 'tip-sub' }, `${node.gym.leader} · ${node.gym.type}`));
  }
  tip.classList.add('show');
  const r = e.currentTarget.getBoundingClientRect();
  tip.style.left = (r.left + r.width / 2) + 'px';
  tip.style.top = (r.top - 8) + 'px';
}
function hideNodeTip() {
  const tip = $('#map-node-tooltip');
  if (tip) tip.classList.remove('show');
}
