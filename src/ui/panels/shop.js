import { G } from '../../core/state.js';
import { fmt } from '../../core/utils.js';
import { SHOP_ITEMS, buy } from '../../systems/shop.js';
import { btn } from '../components.js';
import { act } from '../../net/actions.js';

export default {
  id: 'shop',
  title: '🏪 Cửa hàng',
  render() {
    const S = G.S;
    return (
      '<div class="tip">Zen: <b style="color:#ffd54a">' + fmt(S.zen) + '</b> · Bình máu: ' + S.pot.hp + ' · Bình mana: ' + S.pot.mp + ' · Bùa: ' + S.charm + '</div>' +
      Object.entries(SHOP_ITEMS).map(([key, it]) => {
        const price = it.price();
        return '<div class="stat"><div><b>' + it.name + '</b><div class="muted">' + it.desc + ' · ' + fmt(price) + ' Zen/cái</div></div><div class="row">' +
          it.qty.map((n) => btn('x' + n, 'buy', { t: key, n }, { cls: 'sm', disabled: S.zen < price * n })).join('') + '</div></div>';
      }).join('') +
      '<p class="muted" style="margin-top:10px">Trong bản thương mại, Bùa Bảo Hộ, thẻ VIP, ngoại hình… là các vật phẩm có thể bán bằng tiền thật.</p>'
    );
  },
  actions: { buy: (d) => act('buy', d.t, +d.n) },
};
