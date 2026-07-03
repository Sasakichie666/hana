// cards.js
// ============================================================
// 牌库定义、配对规则、组合检测等核心数据与逻辑
// 所有函数均为纯函数，不依赖游戏状态，可独立使用
// ============================================================

'use strict';

// ---------- 牌库定义 ----------
const CARD_DEFS = [
    { id: 'm01_hana_01', name: '松', month: 1, types: ['hana'], icon: '🌲', season: 'winter' },
    { id: 'm01_hana_02', name: '松', month: 1, types: ['hana'], icon: '🌲', season: 'winter' },
    { id: 'm01_kemono', name: '鹤', month: 1, types: ['kemono'], icon: '🦩', season: 'winter' },
    { id: 'm02_hana_01', name: '梅', month: 2, types: ['hana'], icon: '🌸', season: 'spring' },
    { id: 'm02_hana_02', name: '梅', month: 2, types: ['hana'], icon: '🌸', season: 'spring' },
    { id: 'm02_kemono', name: '莺', month: 2, types: ['kemono'], icon: '🐦', season: 'spring' },
    { id: 'm03_hana_01', name: '樱', month: 3, types: ['hana'], icon: '💮', season: 'spring' },
    { id: 'm03_hana_02', name: '樱', month: 3, types: ['hana'], icon: '💮', season: 'spring' },
    { id: 'm03_mono', name: '樱下幕', month: 3, types: ['mono', 'kei'], icon: '🎪', season: 'spring' },
    { id: 'm04_hana_01', name: '藤', month: 4, types: ['hana'], icon: '🪻', season: 'spring' },
    { id: 'm04_hana_02', name: '藤', month: 4, types: ['hana'], icon: '🪻', season: 'spring' },
    { id: 'm04_kemono', name: '杜鹃', month: 4, types: ['kemono'], icon: '🕊️', season: 'summer' },
    { id: 'm05_hana_01', name: '菖', month: 5, types: ['hana'], icon: '🌿', season: 'summer' },
    { id: 'm05_hana_02', name: '菖', month: 5, types: ['hana'], icon: '🌿', season: 'summer' },
    { id: 'm05_mono_01', name: '八桥', month: 5, types: ['mono'], icon: '🌉', season: 'summer' },
    { id: 'm05_mono_02', name: '五月雨', month: 5, types: ['mono', 'kei'], icon: '🌧️', season: 'summer' },
    { id: 'm06_hana_01', name: '牡丹', month: 6, types: ['hana'], icon: '🏵️', season: 'summer' },
    { id: 'm06_hana_02', name: '牡丹', month: 6, types: ['hana'], icon: '🏵️', season: 'summer' },
    { id: 'm06_kemono', name: '蝶', month: 6, types: ['kemono'], icon: '🦋', season: 'summer' },
    { id: 'm07_hana_01', name: '萩', month: 7, types: ['hana'], icon: '🌾', season: 'summer' },
    { id: 'm07_hana_02', name: '萩', month: 7, types: ['hana'], icon: '🌾', season: 'summer' },
    { id: 'm07_kemono', name: '猪', month: 7, types: ['kemono'], icon: '🐗', season: 'autumn' },
    { id: 'm08_hana_01', name: '芒', month: 8, types: ['hana'], icon: '🌾', season: 'autumn' },
    { id: 'm08_hana_02', name: '芒', month: 8, types: ['hana'], icon: '🌾', season: 'autumn' },
    { id: 'm08_kemono', name: '雁', month: 8, types: ['kemono'], icon: '🪿', season: 'autumn' },
    { id: 'm08_mono', name: '满月', month: 8, types: ['mono', 'kei'], icon: '🌕', season: 'autumn' },
    { id: 'm09_hana_01', name: '菊', month: 9, types: ['hana'], icon: '🌼', season: 'autumn' },
    { id: 'm09_hana_02', name: '菊', month: 9, types: ['hana'], icon: '🌼', season: 'autumn' },
    { id: 'm09_mono', name: '酒', month: 9, types: ['mono'], icon: '🍶', season: 'autumn' },
    { id: 'm10_hana_01', name: '红叶', month: 10, types: ['hana'], icon: '🍁', season: 'autumn' },
    { id: 'm10_hana_02', name: '红叶', month: 10, types: ['hana'], icon: '🍁', season: 'autumn' },
    { id: 'm10_kemono', name: '鹿', month: 10, types: ['kemono'], icon: '🦌', season: 'winter' },
    { id: 'm11_hana_01', name: '柳', month: 11, types: ['hana'], icon: '🌿', season: 'winter' },
    { id: 'm11_hana_02', name: '柳', month: 11, types: ['hana'], icon: '🌿', season: 'winter' },
    { id: 'm11_kemono', name: '燕', month: 11, types: ['kemono'], icon: '🐦', season: 'winter' },
    { id: 'm12_hana_01', name: '桐', month: 12, types: ['hana'], icon: '🌳', season: 'winter' },
    { id: 'm12_hana_02', name: '桐', month: 12, types: ['hana'], icon: '🌳', season: 'winter' },
    { id: 'm12_kemono', name: '凤', month: 12, types: ['kemono'], icon: '🦚', season: 'winter' },
    { id: 'tanzaku_spring', name: '春·歌', month: 0, types: ['bun'], icon: '📜', season: 'spring' },
    { id: 'tanzaku_summer', name: '夏·句', month: 0, types: ['bun'], icon: '📜', season: 'summer' },
    { id: 'tanzaku_autumn', name: '秋·吟', month: 0, types: ['bun'], icon: '📜', season: 'autumn' },
    { id: 'tanzaku_winter', name: '冬·诗', month: 0, types: ['bun'], icon: '📜', season: 'winter' },
    { id: 'toy_crane_01', name: '千纸鹤', month: 0, types: ['asobi', 'mono'], icon: '🪈' },
    { id: 'toy_crane_02', name: '千纸鹤', month: 0, types: ['asobi', 'mono'], icon: '🪈' },
    { id: 'toy_cat_01', name: '招财猫', month: 0, types: ['asobi', 'mono'], icon: '🐱' },
    { id: 'toy_cat_02', name: '招财猫', month: 0, types: ['asobi', 'mono'], icon: '🐱' },
    { id: 'toy_daruma_01', name: '达摩', month: 0, types: ['asobi', 'mono'], icon: '🎎' },
    { id: 'toy_daruma_02', name: '达摩', month: 0, types: ['asobi', 'mono'], icon: '🎎' },
    { id: 'toy_dog_01', name: '犬张子', month: 0, types: ['asobi', 'mono'], icon: '🐶' },
    { id: 'toy_dog_02', name: '犬张子', month: 0, types: ['asobi', 'mono'], icon: '🐶' },
    { id: 'mask_noh', name: '能面', month: 0, types: ['men', 'mono'], icon: '🎭' },
    { id: 'mask_oni', name: '鬼面', month: 0, types: ['men', 'mono'], icon: '👹', pairAny: true },
    { id: 'mask_kitsune', name: '狐面', month: 0, types: ['men', 'mono'], icon: '🦊' },
    { id: 'mask_tengu', name: '天狗面', month: 0, types: ['men', 'mono'], icon: '👺' },
    { id: 'shrine_torii', name: '鸟居', month: 0, types: ['mono', 'kei'], icon: '⛩️' },
    { id: 'shrine_ema', name: '绘马', month: 0, types: ['mono'], icon: '🪵' },
    { id: 'shrine_omamori', name: '御守', month: 0, types: ['mono'], icon: '🎀' },
    { id: 'shrine_lantern', name: '灯笼', month: 0, types: ['mono'], icon: '🏮' },
    { id: 'oiran_oiran', name: '花魁', month: 0, types: ['special'], icon: '👘', isOiran: true },
    { id: 'oiran_umbrella', name: '伞', month: 0, types: ['mono'], icon: '☂️' },
    { id: 'oiran_geta', name: '木屐', month: 0, types: ['mono'], icon: '👡' },
    { id: 'oiran_fan', name: '折扇', month: 0, types: ['mono'], icon: '🪭' },
    { id: 'garden_lantern', name: '石灯笼', month: 0, types: ['mono'], icon: '🪨' },
    { id: 'garden_pond', name: '池塘', month: 0, types: ['mono'], icon: '🌊' },
    { id: 'inner_bonsai', name: '盆栽', month: 0, types: ['hana', 'mono'], icon: '🪴' },
    { id: 'inner_armor', name: '大铠', month: 0, types: ['mono'], icon: '🛡️' },
    { id: 'inner_screen', name: '屏风', month: 0, types: ['mono'], icon: '🖼️' },
    { id: 'special_bamboo', name: '竹', month: 0, types: ['hana'], icon: '🎋' },
    { id: 'special_orchid', name: '兰', month: 0, types: ['hana'], icon: '🌺' },

    // ---- 新增牌 ----
    { id: 'yukata', name: '浴衣', month: 0, types: ['mono'], icon: '👘' },
    { id: 'uchiwa', name: '团扇', month: 0, types: ['mono'], icon: '🪭' },
    { id: 'hanabi', name: '花火', month: 0, types: ['mono', 'kei'], icon: '🎇' },
    { id: 'koto', name: '琴', month: 0, types: ['mono'], icon: '🪕' },
    { id: 'yokku', name: '祝句', month: 0, types: ['bun', 'mono'], icon: '📜', season: null },
    { id: 'tsuzumi', name: '鼓', month: 0, types: ['mono'], icon: '🥁' },
    { id: 'kanagawa', name: '神奈川', month: 0, types: ['mono', 'kei'], icon: '🌊' },
    { id: 'fune', name: '舟', month: 0, types: ['mono'], icon: '🚢' },
    { id: 'kaze', name: '风', month: 0, types: ['mono', 'kei'], icon: '🍃' },
    { id: 'yuki', name: '雪', month: 0, types: ['mono', 'kei'], icon: '❄️' },
    { id: 'fuji', name: '富士山', month: 0, types: ['mono', 'kei'], icon: '🗻' },
    { id: 'hi', name: '日', month: 0, types: ['mono', 'kei'], icon: '☀️' },
    { id: 'fue', name: '笛', month: 0, types: ['mono'], icon: '🎶' },
];

// ---------- 工具函数 ----------

function getCardDef(id) {
    return CARD_DEFS.find(c => c.id === id);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function initDeck() {
    return shuffle(CARD_DEFS.map(c => c.id));
}

// ---------- 配对规则 ----------

function canPair(a, b) {
    if (a === b) return false;
    const da = getCardDef(a);
    const db = getCardDef(b);
    if (!da || !db) return false;
    if (da.name === db.name) return false;
    if (da.isOiran || db.isOiran || da.pairAny || db.pairAny) return true;
    if (da.month > 0 && db.month > 0 && da.month === db.month) return true;
    for (const ta of da.types) {
        for (const tb of db.types) {
            if (ta === tb) return true;
        }
    }
    if (da.types.includes('bun') && db.types.includes('hana') && da.season && db.season === da.season && db.month > 0) return true;
    if (db.types.includes('bun') && da.types.includes('hana') && db.season && da.season === db.season && da.month > 0) return true;
    return false;
}

// ---------- 组合检测 ----------

function detectCombos(cardIds) {
    const combos = [];
    const cardSet = new Set(cardIds);
    const has = id => cardSet.has(id);
    const defs = cardIds.map(id => getCardDef(id)).filter(Boolean);

    const monthGroups = {};
    defs.forEach(d => {
        if (d.month > 0) {
            if (!monthGroups[d.month]) monthGroups[d.month] = { hana: [], kemono: [], mono: [] };
            if (d.types.includes('hana')) monthGroups[d.month].hana.push(d.id);
            if (d.types.includes('kemono')) monthGroups[d.month].kemono.push(d.id);
            if (d.types.includes('mono')) monthGroups[d.month].mono.push(d.id);
        }
    });

    for (const [m, grp] of Object.entries(monthGroups)) {
        for (const hid of grp.hana) for (const kid of grp.kemono) if (has(hid) && has(kid)) combos.push({ name: `${m}月花兽`, score: 1, cards: [hid, kid] });
        for (const hid of grp.hana) for (const mid of grp.mono) if (has(hid) && has(mid)) combos.push({ name: `${m}月花物`, score: 1, cards: [hid, mid] });
        if (parseInt(m) === 8 && has('m08_mono') && has('m08_kemono')) combos.push({ name: '月下雁', score: 1, cards: ['m08_mono', 'm08_kemono'] });
    }

    const monthsWithHana = new Set();
    defs.forEach(d => { if (d.types.includes('hana') && d.month > 0) monthsWithHana.add(d.month); });
    if (monthsWithHana.size >= 12) combos.push({ name: '十二花', score: 2, cards: [] });

    const uniqHana = new Set(defs.filter(d => d.types.includes('hana')).map(d => d.name));
    if (uniqHana.size >= 6) combos.push({ name: '六花', score: 1, cards: [] });

    const uniqMono = new Set(defs.filter(d => d.types.includes('mono') && !d.types.includes('kei')).map(d => d.name));
    if (uniqMono.size >= 6) combos.push({ name: '六物', score: 1, cards: [] });

    const uniqKemono = new Set(defs.filter(d => d.types.includes('kemono')).map(d => d.name));
    if (uniqKemono.size >= 6) combos.push({ name: '六兽', score: 2, cards: [] });

    // 六景
    const uniqKei = new Set(defs.filter(d => d.types.includes('kei')).map(d => d.name));
    if (uniqKei.size >= 6) combos.push({ name: '六景', score: 1, cards: [] });

    const tanzaku = ['tanzaku_spring', 'tanzaku_summer', 'tanzaku_autumn', 'tanzaku_winter'];
    if (tanzaku.every(has)) combos.push({ name: '四季册', score: 4, cards: tanzaku });

    const toySets = [['toy_crane_01', 'toy_crane_02'], ['toy_cat_01', 'toy_cat_02'], ['toy_daruma_01', 'toy_daruma_02'], ['toy_dog_01', 'toy_dog_02']];
    if (toySets.every(ids => ids.some(has))) combos.push({ name: '四玩具', score: 4, cards: [] });

    const shrine = ['shrine_torii', 'shrine_ema', 'shrine_omamori', 'shrine_lantern'];
    if (shrine.every(has)) combos.push({ name: '神社初诣', score: 4, cards: shrine });

    const oiranSet = ['oiran_oiran', 'oiran_umbrella', 'oiran_geta', 'oiran_fan'];
    if (oiranSet.every(has)) combos.push({ name: '花魁道中', score: 6, cards: oiranSet });

    if (has('garden_lantern') && has('garden_pond') && (has('m01_hana_01') || has('m01_hana_02')))
        combos.push({ name: '外庭', score: 3, cards: ['garden_lantern', 'garden_pond', has('m01_hana_01') ? 'm01_hana_01' : 'm01_hana_02'] });

    const inner = ['inner_bonsai', 'inner_armor', 'inner_screen'];
    if (inner.every(has)) combos.push({ name: '内室', score: 3, cards: inner });

    if (has('mask_kitsune') && has('shrine_torii')) combos.push({ name: '狐面+鸟居', score: 2, cards: ['mask_kitsune', 'shrine_torii'] });
    if (has('mask_noh') && has('oiran_fan')) combos.push({ name: '能面+折扇', score: 2, cards: ['mask_noh', 'oiran_fan'] });
    if (has('m09_mono') && has('m03_mono')) combos.push({ name: '酒+樱下幕', score: 2, cards: ['m09_mono', 'm03_mono'] });
    if (has('m08_mono') && has('m03_mono')) combos.push({ name: '月+樱下幕', score: 2, cards: ['m08_mono', 'm03_mono'] });

    const springFlowers = ['m02_hana_01','m02_hana_02','m03_hana_01','m03_hana_02','m04_hana_01','m04_hana_02'];
    const summerFlowers = ['m05_hana_01','m05_hana_02','m06_hana_01','m06_hana_02','m07_hana_01','m07_hana_02'];
    const autumnFlowers = ['m08_hana_01','m08_hana_02','m09_hana_01','m09_hana_02','m10_hana_01','m10_hana_02'];
    const winterFlowers = ['m11_hana_01','m11_hana_02','m12_hana_01','m12_hana_02','m01_hana_01','m01_hana_02'];

    const hasSpring = (has('m02_hana_01')||has('m02_hana_02')) && (has('m03_hana_01')||has('m03_hana_02')) && (has('m04_hana_01')||has('m04_hana_02'));
    const hasSummer = (has('m05_hana_01')||has('m05_hana_02')) && (has('m06_hana_01')||has('m06_hana_02')) && (has('m07_hana_01')||has('m07_hana_02'));
    const hasAutumn = (has('m08_hana_01')||has('m08_hana_02')) && (has('m09_hana_01')||has('m09_hana_02')) && (has('m10_hana_01')||has('m10_hana_02'));
    const hasWinter = (has('m11_hana_01')||has('m11_hana_02')) && (has('m12_hana_01')||has('m12_hana_02')) && (has('m01_hana_01')||has('m01_hana_02'));

    if (hasSpring) {
        const cards = defs.filter(d => springFlowers.includes(d.id)).map(d => d.id);
        combos.push({ name: '春花', score: 2, cards });
        if (has('tanzaku_spring')) combos.push({ name: '春花+春·歌', score: 2, cards: [...cards, 'tanzaku_spring'] });
    }
    if (hasSummer) {
        const cards = defs.filter(d => summerFlowers.includes(d.id)).map(d => d.id);
        combos.push({ name: '夏花', score: 2, cards });
        if (has('tanzaku_summer')) combos.push({ name: '夏花+夏·句', score: 2, cards: [...cards, 'tanzaku_summer'] });
    }
    if (hasAutumn) {
        const cards = defs.filter(d => autumnFlowers.includes(d.id)).map(d => d.id);
        combos.push({ name: '秋花', score: 2, cards });
        if (has('tanzaku_autumn')) combos.push({ name: '秋花+秋·吟', score: 2, cards: [...cards, 'tanzaku_autumn'] });
    }
    if (hasWinter) {
        const cards = defs.filter(d => winterFlowers.includes(d.id)).map(d => d.id);
        combos.push({ name: '冬花', score: 2, cards });
        if (has('tanzaku_winter')) combos.push({ name: '冬花+冬·诗', score: 2, cards: [...cards, 'tanzaku_winter'] });
    }
    if (hasSpring && hasSummer) {
        const cards = [...defs.filter(d => springFlowers.includes(d.id)), ...defs.filter(d => summerFlowers.includes(d.id))].map(d => d.id);
        combos.push({ name: '春夏相连', score: 3, cards });
    }
    if (hasAutumn && hasWinter) {
        const cards = [...defs.filter(d => autumnFlowers.includes(d.id)), ...defs.filter(d => winterFlowers.includes(d.id))].map(d => d.id);
        combos.push({ name: '秋冬相连', score: 3, cards });
    }

    const bunCards = [];
    if (has('tanzaku_spring')) bunCards.push('tanzaku_spring');
    if (has('tanzaku_summer')) bunCards.push('tanzaku_summer');
    if (has('tanzaku_autumn')) bunCards.push('tanzaku_autumn');
    if (has('tanzaku_winter')) bunCards.push('tanzaku_winter');
    if (has('m09_mono') && bunCards.length > 0) combos.push({ name: '对酒当歌', score: 1, cards: [bunCards[0], 'm09_mono'] });

    if (has('mask_tengu') && (has('m10_hana_01') || has('m10_hana_02'))) {
        const redLeaf = has('m10_hana_01') ? 'm10_hana_01' : 'm10_hana_02';
        combos.push({ name: '天狗面+红叶', score: 2, cards: [redLeaf, 'mask_tengu'] });
    }

    if (has('m02_kemono') && has('m04_kemono') && has('m11_kemono')) combos.push({ name: '莺鹃燕', score: 3, cards: ['m02_kemono', 'm04_kemono', 'm11_kemono'] });
    if (has('m07_kemono') && has('m10_kemono') && has('m06_kemono')) combos.push({ name: '猪鹿蝶', score: 6, cards: ['m07_kemono', 'm10_kemono', 'm06_kemono'] });
    if (has('m01_kemono') && has('m12_kemono')) combos.push({ name: '鹤凤双瑞', score: 3, cards: ['m01_kemono', 'm12_kemono'] });

    if (has('oiran_oiran') && has('oiran_umbrella') && has('m05_mono_01') && has('m05_mono_02'))
        combos.push({ name: '伞下雨桥', score: 5, cards: ['oiran_oiran', 'oiran_umbrella', 'm05_mono_01', 'm05_mono_02'] });

    const masks = ['mask_noh', 'mask_oni', 'mask_kitsune', 'mask_tengu'];
    if (masks.every(has)) combos.push({ name: '四面具', score: 4, cards: masks });

    // 新组合
    if (has('yukata') && has('uchiwa') && has('hanabi')) combos.push({ name: '夏祭', score: 3, cards: ['yukata', 'uchiwa', 'hanabi'] });
    if (has('oiran_oiran') && has('koto') && has('fune')) combos.push({ name: '乐艺', score: 2, cards: ['oiran_oiran', 'koto', 'fune'] });

    if (has('oiran_oiran') && has('yokku')) {
        const otherBun = tanzaku.find(id => id !== 'yokku' && has(id));
        if (otherBun) combos.push({ name: '文艺', score: 2, cards: ['oiran_oiran', 'yokku', otherBun] });
    }

    if (has('special_bamboo') && has('yokku')) combos.push({ name: '七夕', score: 1, cards: ['special_bamboo', 'yokku'] });
    if (has('tsuzumi') && has('kanagawa') && has('fune')) combos.push({ name: '破浪祭', score: 3, cards: ['tsuzumi', 'kanagawa', 'fune'] });

    const sakura = (has('m03_hana_01') || has('m03_hana_02')) ? (has('m03_hana_01') ? 'm03_hana_01' : 'm03_hana_02') : null;
    if (sakura && has('m02_kemono') && has('kaze') && has('m08_mono')) combos.push({ name: '花鸟风月', score: 6, cards: [sakura, 'm02_kemono', 'kaze', 'm08_mono'] });
    if (sakura && has('kaze') && has('yuki') && has('m08_mono')) combos.push({ name: '风花雪月', score: 5, cards: [sakura, 'kaze', 'yuki', 'm08_mono'] });
    if (has('fuji') && has('kanagawa') && has('shrine_torii')) combos.push({ name: '浮世三绘', score: 3, cards: ['fuji', 'kanagawa', 'shrine_torii'] });
    if (has('fuji') && has('hi')) combos.push({ name: '日出之山', score: 1, cards: ['fuji', 'hi'] });
    if (has('hi') && has('m08_mono') && has('yuki') && has('m05_mono_02')) combos.push({ name: '四天象', score: 4, cards: ['hi', 'm08_mono', 'yuki', 'm05_mono_02'] });

    const yanagi = (has('m11_hana_01') || has('m11_hana_02')) ? (has('m11_hana_01') ? 'm11_hana_01' : 'm11_hana_02') : null;
    if (yanagi && has('kaze')) combos.push({ name: '柳间风', score: 1, cards: [yanagi, 'kaze'] });

    if (has('special_orchid') && has('fue')) combos.push({ name: '兰与笛', score: 2, cards: ['special_orchid', 'fue'] });

    if (has('tsuzumi') && has('koto') && has('fue')) combos.push({ name: '三乐', score: 3, cards: ['tsuzumi', 'koto', 'fue'] });

    // 新增：山雪景，雪下伞
    if (has('fuji') && has('yuki')) combos.push({ name: '山雪景', score: 1, cards: ['fuji', 'yuki'] });
    if (has('oiran_umbrella') && has('yuki')) combos.push({ name: '雪下伞', score: 1, cards: ['oiran_umbrella', 'yuki'] });

    const plum = has('m02_hana_01') || has('m02_hana_02');
    const orchid = has('special_orchid');
    const bamboo = has('special_bamboo');
    const chrys = has('m09_hana_01') || has('m09_hana_02');
    if (plum && orchid && bamboo && chrys) combos.push({ name: '四君子', score: 6, cards: [] });

    const matsu = has('m01_hana_01') || has('m01_hana_02');
    if (matsu && bamboo && plum) combos.push({ name: '岁寒三友', score: 3, cards: [] });

    // 去重
    const seen = new Set();
    return combos.filter(c => {
        const k = c.name + '|' + (c.cards ? c.cards.sort().join(',') : '');
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

// ---------- 组合覆盖牌逻辑 ----------

function getCoveredCardsForCombo(combo, cardIds) {
    if (combo.cards && combo.cards.length > 0) return combo.cards;

    const defs = cardIds.map(id => getCardDef(id)).filter(Boolean);
    switch (combo.name) {
        case '六花': return defs.filter(d => d.types.includes('hana')).map(d => d.id);
        case '六物': return defs.filter(d => d.types.includes('mono') && !d.types.includes('kei')).map(d => d.id);
        case '六兽': return defs.filter(d => d.types.includes('kemono')).map(d => d.id);
        case '六景': return defs.filter(d => d.types.includes('kei')).map(d => d.id);
        case '四玩具': return defs.filter(d => d.types.includes('asobi')).map(d => d.id);
        case '神社初诣': return defs.filter(d => ['shrine_torii','shrine_ema','shrine_omamori','shrine_lantern'].includes(d.id)).map(d => d.id);
        case '花魁道中': return defs.filter(d => ['oiran_oiran','oiran_umbrella','oiran_geta','oiran_fan'].includes(d.id)).map(d => d.id);
        case '外庭': return defs.filter(d => ['garden_lantern','garden_pond'].includes(d.id) || d.id.startsWith('m01_hana')).map(d => d.id);
        case '内室': return defs.filter(d => ['inner_bonsai','inner_armor','inner_screen'].includes(d.id)).map(d => d.id);
        case '四君子': return defs.filter(d => ['m02_hana_01','m02_hana_02','special_orchid','special_bamboo','m09_hana_01','m09_hana_02'].includes(d.id)).map(d => d.id);
        case '岁寒三友': return defs.filter(d => d.id.startsWith('m01_hana') || d.id === 'special_bamboo' || d.id.startsWith('m02_hana')).map(d => d.id);
        case '十二花': return defs.filter(d => d.types.includes('hana') && d.month > 0).map(d => d.id);
        default: return [];
    }
}

function getOrphanCards(cardIds) {
    const combos = detectCombos(cardIds);
    const covered = new Set();
    for (const combo of combos) {
        const cards = getCoveredCardsForCombo(combo, cardIds);
        cards.forEach(id => covered.add(id));
    }
    return cardIds.filter(id => !covered.has(id));
}

function calculateScores(ids) {
    const combos = detectCombos(ids);
    return { combos, totalScore: combos.reduce((s, c) => s + c.score, 0) };
}

// ---------- 理论组合查询 ----------

let _allCombosCache = null;

function getAllTheoreticalCombos() {
    if (_allCombosCache) return _allCombosCache;
    const allCardIds = CARD_DEFS.map(c => c.id);
    _allCombosCache = detectCombos(allCardIds);
    return _allCombosCache;
}

function getTheoreticalCombosForCard(cardId) {
    const allCombos = getAllTheoreticalCombos();
    const allCardIds = CARD_DEFS.map(c => c.id);
    const result = [];
    for (const combo of allCombos) {
        if (combo.cards && combo.cards.length > 0) {
            if (combo.cards.includes(cardId)) {
                result.push({ name: combo.name, score: combo.score });
            }
        } else {
            const covered = getCoveredCardsForCombo(combo, allCardIds);
            if (covered.includes(cardId)) {
                result.push({ name: combo.name, score: combo.score });
            }
        }
    }
    return result;
}