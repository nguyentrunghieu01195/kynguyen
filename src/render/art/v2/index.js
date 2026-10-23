// Bộ đồ hoạ V2 — "Chibi Dark Fantasy" (nhân vật: chibi.js qua heroDraw.js)
import { iso } from '../../iso.js';
import { itemRarity, itemFull } from '../../../systems/items.js';
import { drawHero, HERO_HEIGHT } from './heroDraw.js';
import { drawMob, mobHeight } from './monsters.js';
import { makePaintMap, makeDrawDeco } from './environment.js';
import { itemIconHTML, makeDrawDrop } from './items.js';
import { makeDrawFx, makeDrawProjectile } from './fx.js';

export default {
  id: 'v2',
  name: 'V2 Chibi Dark Fantasy',
  paintMap: makePaintMap(iso),
  drawDeco: makeDrawDeco(iso),
  drawHero,
  drawMob: (c, m, t) => drawMob(c, m, t, iso),
  drawDrop: makeDrawDrop(iso, itemRarity, (it) => (it.exc ? '★' : '') + itemFull(it)),
  drawFx: makeDrawFx(iso),
  drawProjectile: makeDrawProjectile(iso),
  itemIconHTML,
  mobHeight,
  heroHeight: HERO_HEIGHT,
};
