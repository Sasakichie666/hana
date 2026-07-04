// game.js
// ============================================================
// 游戏逻辑模块
// 包含：状态管理、渲染、玩家操作、回合流程、计分判定、音效、侧边栏
// 依赖：cards.js 提供的牌数据与组合函数
// ============================================================

'use strict';

// ==================== 音效引擎 ====================
const AudioEngine = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    play(f, d, t, v = 0.05) {
        this.init();
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = t;
        o.frequency.value = f;
        g.gain.setValueAtTime(v, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + d);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start();
        o.stop(this.ctx.currentTime + d);
    },
    uiClick() { this.play(800, 0.05, 'sine', 0.03); },
    cardSelect() { this.play(400, 0.1, 'sine', 0.04); },
    pair() {
        this.play(500, 0.2, 'triangle', 0.06);
        setTimeout(() => this.play(700, 0.15, 'triangle', 0.05), 80);
    },
    agari() {
        this.play(400, 0.3, 'triangle', 0.08);
        setTimeout(() => this.play(800, 0.4, 'sine', 0.1), 200);
    },
    turnStart() {
        this.play(600, 0.12, 'sine', 0.05);
        setTimeout(() => this.play(800, 0.08, 'sine', 0.04), 80);
    }
};

// ==================== 全局游戏状态 ====================
const GameState = {
    deck: [],
    fieldCards: [],
    players: [],
    currentPlayerIndex: 0,
    myPlayerId: null,
    myHand: [],
    myMelded: [],
    selectedHandCard: null,
    selectedCardCombos: [],          // 选中手牌的理论组合列表（对象数组{name,score}）
    phase: 'waiting',
    koikoiPending: false,
    isHost: false,
    peer: null,
    connections: {},
    roomId: null,
    playerNames: {},
    _oppHands: {},
    _oppMelded: {},
    maxPlayers: 2,
    pendingCover: null,
    scores: {},
    lastConfirmedAgariId: null,
    playerKoikoiUsed: {},
    playerPrevCombos: {},
    sidebarVisible: false,          // 左侧栏（对手副露）是否可见
    rightSidebarVisible: false,     // 右侧栏（组合明细）是否可见
};

// ==================== 辅助函数 ====================

function getFieldTopIds() {
    return GameState.fieldCards.map(fc => typeof fc === 'string' ? fc : fc.top).filter(Boolean);
}

function findFieldPair(handId) {
    return getFieldTopIds().filter(fid => canPair(handId, fid));
}

function hasAnyPair(handIds) {
    const tops = getFieldTopIds();
    return handIds.some(hid => tops.some(fid => canPair(hid, fid)));
}

function addLog(msg) {
    const l = document.getElementById('log');
    if (!l) return;
    l.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
    l.scrollTop = l.scrollHeight;
}

function getFieldCount() {
    return GameState.fieldCards.length;
}

// ==================== 达成判定 ====================

function checkAgari(handIds, meldedIds) {
    const meldedCombos = detectCombos(meldedIds);
    const meldedAllCovered = getOrphanCards(meldedIds).length === 0;
    const meldedScore = meldedCombos.reduce((s, c) => s + c.score, 0);

    if (!meldedAllCovered || meldedScore === 0) {
        return { canAgari: false };
    }

    const handCombos = detectCombos(handIds);
    const handAllCovered = handIds.length === 0 ? true : getOrphanCards(handIds).length === 0;
    const handScore = handCombos.reduce((s, c) => s + c.score, 0);
    const handOk = handAllCovered && (handIds.length === 0 || handScore > 0);

    return {
        canAgari: handOk,
        meldedCombos,
        handCombos,
        meldedScore,
        handScore,
        totalScore: meldedScore * handScore
    };
}

// ==================== 场地补牌 ====================

const MIN_FIELD = 5;

function fillFieldToMinimum() {
    while (getFieldCount() < MIN_FIELD && GameState.deck.length > 0) {
        const card = GameState.deck.pop();
        GameState.fieldCards.push(card);
        addLog(`自动补牌：${getCardDef(card).name} 置入场地`);
    }
}

// ==================== 牌操作 ====================

function removeFieldCardById(cardId) {
    for (let i = 0; i < GameState.fieldCards.length; i++) {
        const fc = GameState.fieldCards[i];
        if (typeof fc === 'string') {
            if (fc === cardId) {
                GameState.fieldCards.splice(i, 1);
                return true;
            }
        } else {
            if (fc.top === cardId) {
                if (fc.cards && fc.cards.length > 0) {
                    fc.top = fc.cards.pop();
                } else {
                    GameState.fieldCards.splice(i, 1);
                }
                return true;
            }
            if (fc.cards && fc.cards.includes(cardId)) {
                fc.cards = fc.cards.filter(c => c !== cardId);
                if (fc.cards.length === 0) {
                    GameState.fieldCards[i] = fc.top;
                }
                return true;
            }
        }
    }
    return false;
}

function removeFieldCard(idx) {
    const fc = GameState.fieldCards[idx];
    if (!fc) return;
    if (typeof fc === 'string') {
        GameState.fieldCards.splice(idx, 1);
    } else if (fc.cards && fc.cards.length) {
        fc.cards.pop();
        GameState.fieldCards[idx] = fc.cards.length ? fc.cards[fc.cards.length - 1] : fc.top;
    } else {
        GameState.fieldCards.splice(idx, 1);
    }
}

// ==================== 玩家交互 ====================

function onHandClick(cardId) {
    if (GameState.phase !== 'playing' ||
        GameState.players[GameState.currentPlayerIndex] !== GameState.myPlayerId ||
        GameState.koikoiPending) return;

    const prev = GameState.selectedHandCard;

    if (prev === cardId) {
        GameState.selectedHandCard = null;
        GameState.selectedCardCombos = [];
        AudioEngine.uiClick();
    } else {
        GameState.selectedHandCard = cardId;
        // 获取该牌理论上可以参与的所有组合
        GameState.selectedCardCombos = getTheoreticalCombosForCard(cardId);
        AudioEngine.cardSelect();
    }

    // 更新右侧边栏（如果可见）
    renderRightSidebar();
    renderField();
    renderHand();
}

function onFieldClick(fieldCardId, index) {
    if (!GameState.selectedHandCard || GameState.koikoiPending) return;
    if (!canPair(GameState.selectedHandCard, fieldCardId)) {
        addLog('不能配对');
        return;
    }

    const handId = GameState.selectedHandCard;
    GameState.selectedHandCard = null;
    GameState.selectedCardCombos = [];
    AudioEngine.pair();

    if (GameState.isHost) {
        GameState.myHand = GameState.myHand.filter(id => id !== handId);
        removeFieldCardById(fieldCardId);
        GameState.myMelded.push(handId, fieldCardId);
        renderAll();
        sendAction({ action: 'pair', handCardId: handId, fieldCardId, fieldIndex: index }, 'pair');
    } else {
        const hostConn = GameState.connections[GameState.players[0]];
        if (hostConn) {
            hostConn.send(JSON.stringify({
                type: 'playerAction',
                action: 'pair',
                handCardId: handId,
                fieldCardId,
                fieldIndex: index,
                playerId: GameState.myPlayerId
            }));
        }
        GameState.myHand = GameState.myHand.filter(id => id !== handId);
        removeFieldCardById(fieldCardId);
        GameState.myMelded.push(handId, fieldCardId);
        renderAll();
    }
}

function discardCard(cardId) {
    if (GameState.koikoiPending) return;
    GameState.selectedHandCard = null;
    GameState.selectedCardCombos = [];

    const hostConn = GameState.isHost ? null : GameState.connections[GameState.players[0]];

    const sendDiscard = (coverIndex) => {
        if (GameState.isHost) {
            GameState.myHand = GameState.myHand.filter(id => id !== cardId);
            if (coverIndex >= 0 && GameState.fieldCards.length >= 8) {
                const fc = GameState.fieldCards[coverIndex];
                if (typeof fc === 'string') {
                    GameState.fieldCards[coverIndex] = { cards: [fc], top: cardId };
                } else {
                    fc.cards.push(fc.top);
                    fc.top = cardId;
                }
            } else {
                GameState.fieldCards.push(cardId);
            }
            GameState.pendingCover = null;
            renderAll();
            sendAction({ action: 'discard', cardId, coverIndex }, 'discard');
        } else {
            if (hostConn) {
                hostConn.send(JSON.stringify({
                    type: 'playerAction',
                    action: 'discard',
                    cardId,
                    coverIndex,
                    playerId: GameState.myPlayerId
                }));
            }
            GameState.myHand = GameState.myHand.filter(id => id !== cardId);
            GameState.pendingCover = null;
            renderAll();
        }
    };

    if (GameState.fieldCards.length >= 8) {
        GameState.pendingCover = cardId;
        const topIds = getFieldTopIds();
        let html = '<div class="modal-overlay"><div class="modal"><h3>选择覆盖的牌</h3><div>';
        topIds.forEach((fid, i) => {
            const def = getCardDef(fid);
            html += `<button class="btn" onclick="window._cover(${i})">${def ? def.name : '?'}</button>`;
        });
        html += '</div><button class="btn" onclick="document.getElementById(\'modal-container\').innerHTML=\'\'">取消</button></div></div>';
        document.getElementById('modal-container').innerHTML = html;
        window._cover = function(idx) {
            document.getElementById('modal-container').innerHTML = '';
            sendDiscard(idx);
        };
    } else {
        sendDiscard(-1);
    }
}

function sendAction(data, actionType = 'pair') {
    if (GameState.isHost) {
        afterAction(GameState.myPlayerId, false, actionType);
    } else {
        const hostConn = GameState.connections[GameState.players[0]];
        if (hostConn) {
            hostConn.send(JSON.stringify({
                type: 'playerAction',
                ...data,
                playerId: GameState.myPlayerId
            }));
        }
    }
}

// ==================== 回合后处理 ====================

function afterAction(pid, isKoikoiResult = false, actionType = 'pair') {
    const isMe = (pid === GameState.myPlayerId);
    let hand = isMe ? [...GameState.myHand] : [...(GameState._oppHands[pid] || [])];
    const melded = isMe ? [...GameState.myMelded] : [...(GameState._oppMelded[pid] || [])];

    let agariCheck = checkAgari(hand, melded);

    if (agariCheck.canAgari && GameState.playerKoikoiUsed[pid]) {
        const allNames = new Set([
            ...agariCheck.meldedCombos.map(c => c.name),
            ...agariCheck.handCombos.map(c => c.name)
        ]);
        const prevNames = GameState.playerPrevCombos[pid] || new Set();
        const hasNew = [...allNames].some(name => !prevNames.has(name));
        if (!hasNew) {
            agariCheck = { canAgari: false };
            if (isMe) addLog('KoiKoi后需要增加新的组合才能达成');
        }
    }

    if (agariCheck.canAgari && actionType !== 'discard') {
        GameState.koikoiPending = true;
        if (isMe) {
            showAgariModal();
        } else {
            const conn = GameState.connections[pid];
            if (conn) {
                conn.send(JSON.stringify({
                    type: 'canAgari',
                    handCombos: agariCheck.handCombos,
                    meldedCombos: agariCheck.meldedCombos,
                    totalScore: agariCheck.totalScore
                }));
            }
        }
        renderAll();
        return;
    }

    if (!isKoikoiResult && GameState.deck.length > 0) {
        const drawn = GameState.deck.pop();
        if (isMe) {
            GameState.myHand.push(drawn);
            addLog('抽到 ' + getCardDef(drawn).name);
        } else {
            GameState._oppHands[pid].push(drawn);
            const conn = GameState.connections[pid];
            if (conn) conn.send(JSON.stringify({ type: 'drawResult', cards: [drawn] }));
        }

        hand = isMe ? [...GameState.myHand] : [...(GameState._oppHands[pid] || [])];
        agariCheck = checkAgari(hand, melded);

        if (agariCheck.canAgari && GameState.playerKoikoiUsed[pid]) {
            const allNames = new Set([
                ...agariCheck.meldedCombos.map(c => c.name),
                ...agariCheck.handCombos.map(c => c.name)
            ]);
            const prevNames = GameState.playerPrevCombos[pid] || new Set();
            if (![...allNames].some(name => !prevNames.has(name))) {
                agariCheck = { canAgari: false };
            }
        }

        if (agariCheck.canAgari) {
            GameState.koikoiPending = true;
            if (isMe) {
                showAgariModal();
            } else {
                const conn = GameState.connections[pid];
                if (conn) {
                    conn.send(JSON.stringify({
                        type: 'canAgari',
                        handCombos: agariCheck.handCombos,
                        meldedCombos: agariCheck.meldedCombos,
                        totalScore: agariCheck.totalScore
                    }));
                }
            }
            renderAll();
            return;
        }
    }

    if (GameState.deck.length === 0 && !GameState.koikoiPending) {
        if (isMe) {
            showDrawModal();
        } else {
            const conn = GameState.connections[pid];
            if (conn) conn.send(JSON.stringify({ type: 'drawGame' }));
        }
        if (GameState.isHost) {
            Object.values(GameState.connections).forEach(c => {
                if (c.peer !== pid) c.send(JSON.stringify({ type: 'drawGame' }));
            });
            handleDraw();
        }
        renderAll();
        return;
    }

    if (isMe) {
        GameState.selectedHandCard = null;
        GameState.selectedCardCombos = [];
    }
    GameState.currentPlayerIndex = (GameState.currentPlayerIndex + 1) % GameState.players.length;

    if (GameState.isHost) {
        fillFieldToMinimum();
    }

    if (GameState.players[GameState.currentPlayerIndex] === GameState.myPlayerId) {
        AudioEngine.turnStart();
    }

    if (GameState.isHost) {
        broadcastState();
    }

    renderAll();
}

// ==================== 达成与 KoiKoi ====================

function declareAgari() {
    AudioEngine.agari();
    const myPid = GameState.myPlayerId;
    const agariCheck = checkAgari(GameState.myHand, GameState.myMelded);
    const isKoikoi = GameState.playerKoikoiUsed[myPid];
    const totalScore = isKoikoi ? agariCheck.totalScore * 2 : agariCheck.totalScore;
    const agariId = Date.now() + '_' + Math.random();

    const agariData = {
        playerName: GameState.playerNames[myPid] || '房主',
        playerId: myPid,
        meldedCombos: agariCheck.meldedCombos,
        handCombos: agariCheck.handCombos,
        meldedScore: agariCheck.meldedScore,
        handScore: agariCheck.handScore,
        totalScore,
        agariId,
        isKoikoi,
    };

    if (GameState.isHost) {
        showAgariDetailModal(agariData);
        Object.values(GameState.connections).forEach(conn =>
            conn.send(JSON.stringify({ type: 'agariDetail', ...agariData }))
        );
    } else {
        const hostConn = GameState.connections[GameState.players[0]];
        if (hostConn) {
            hostConn.send(JSON.stringify({
                type: 'playerAction',
                action: 'agari',
                playerId: myPid
            }));
        }
    }
}

function doKoiKoi() {
    AudioEngine.uiClick();
    GameState.koikoiPending = false;
    const myPid = GameState.myPlayerId;

    if (GameState.isHost) {
        const handCombos = detectCombos(GameState.myHand);
        const meldedCombos = detectCombos(GameState.myMelded);
        const allNames = new Set([...handCombos.map(c => c.name), ...meldedCombos.map(c => c.name)]);
        GameState.playerPrevCombos[myPid] = allNames;
        GameState.playerKoikoiUsed[myPid] = true;

        if (GameState.deck.length) {
            GameState.myHand.push(GameState.deck.pop());
        }
        addLog('🔥 KoiKoi!');
        Object.values(GameState.connections).forEach(conn => {
            conn.send(JSON.stringify({ type: 'koikoiUsed', playerId: myPid }));
        });
        renderAll();
        afterAction(myPid, true);
    } else {
        const hostConn = GameState.connections[GameState.players[0]];
        if (hostConn) {
            hostConn.send(JSON.stringify({
                type: 'playerAction',
                action: 'koikoi',
                playerId: myPid
            }));
        }
    }
}

function confirmAgari(playerId, score, agariId) {
    if (GameState.lastConfirmedAgariId === agariId) return;
    GameState.lastConfirmedAgariId = agariId;
    GameState.scores[playerId] = (GameState.scores[playerId] || 0) + score;
    resetGame();
    broadcastState();
    renderAll();
}

// ==================== 弹窗与荒牌处理 ====================

function showAgariModal() {
    const canKoikoi = !GameState.playerKoikoiUsed[GameState.myPlayerId];
    const koikoiBtn = canKoikoi ? '<button class="btn" id="modal-koikoi-btn">KoiKoi!</button>' : '';
    document.getElementById('modal-container').innerHTML = `
        <div class="modal-overlay"><div class="modal"><h2>✨ 可以达成！</h2>
        <button class="btn gold" id="modal-agari-btn">宣告达成</button>
        ${koikoiBtn}
        </div></div>`;
    document.getElementById('modal-agari-btn').onclick = () => {
        document.getElementById('modal-container').innerHTML = '';
        declareAgari();
    };
    if (canKoikoi) {
        document.getElementById('modal-koikoi-btn').onclick = () => {
            document.getElementById('modal-container').innerHTML = '';
            doKoiKoi();
        };
    }
}

function showAgariDetailModal(agariData) {
    const { playerName, meldedCombos, handCombos, meldedScore, handScore, totalScore, agariId, isKoikoi } = agariData;
    const meldedText = meldedCombos.map(c => `${c.name}(${c.score}分)`).join('、') || '无';
    const handText = handCombos.map(c => `${c.name}(${c.score}分)`).join('、') || '无';
    const koikoiNote = isKoikoi ? '<p style="color:#e8c84c;">🔥 KoiKoi 达成，得分翻倍！</p>' : '';

    document.getElementById('modal-container').innerHTML = `
        <div class="modal-overlay"><div class="modal agari-detail">
            <h2>🏆 ${playerName} 达成！</h2>
            ${koikoiNote}
            <p><strong>副露组合:</strong> ${meldedText}</p>
            <p><strong>手牌组合:</strong> ${handText}</p>
            <div class="score-formula">副露${meldedScore} × 手牌${handScore} = 总分${totalScore}</div>
            <button class="btn gold" id="modal-confirm-agari">确认</button>
        </div></div>`;

    document.getElementById('modal-confirm-agari').onclick = () => {
        document.getElementById('modal-container').innerHTML = '';
        if (GameState.isHost) {
            confirmAgari(agariData.playerId, totalScore, agariId);
        } else {
            const hostConn = GameState.connections[GameState.players[0]];
            if (hostConn) hostConn.send(JSON.stringify({
                type: 'confirmAgari',
                playerId: agariData.playerId,
                score: totalScore,
                agariId
            }));
        }
    };
}

function showDrawModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="modal-overlay"><div class="modal">
            <h2>🍂 本局荒局</h2>
            <p>牌已抽完，无人达成役牌，本局作废，无人得分。</p>
            <button class="btn gold" id="modal-confirm-draw">确认</button>
        </div></div>`;
    document.getElementById('modal-confirm-draw').onclick = () => {
        document.getElementById('modal-container').innerHTML = '';
        if (GameState.isHost) {
            handleDraw();
        } else {
            const hostConn = GameState.connections[GameState.players[0]];
            if (hostConn) hostConn.send(JSON.stringify({ type: 'confirmDraw' }));
        }
    };
}

function handleDraw() {
    resetGame();
    broadcastState();
    renderAll();
    addLog('本局荒局，重新开始');
}

// ==================== 游戏流程 ====================

function hostStartGame() {
    if (!GameState.isHost || GameState.players.length < GameState.maxPlayers) return;

    GameState.players.forEach(pid => {
        if (!GameState.scores[pid]) GameState.scores[pid] = 0;
    });

    const deck = initDeck();
    const { hands, field, deck: rem } = deal(deck, GameState.players.length);
    GameState.deck = rem;
    GameState.fieldCards = field.map(id => id);
    GameState._oppHands = {};
    GameState._oppMelded = {};
    const startPlayerIndex = Math.floor(Math.random() * GameState.players.length);

    GameState.players.forEach(pid => {
        if (pid === GameState.myPlayerId) {
            GameState.myHand = hands[pid];
            GameState.myMelded = [];
        } else {
            GameState._oppHands[pid] = hands[pid];
            GameState._oppMelded[pid] = [];
            GameState.connections[pid]?.send(JSON.stringify({
                type: 'startGame',
                fieldCards: GameState.fieldCards,
                myHand: hands[pid],
                oppHands: Object.fromEntries(
                    GameState.players.filter(p => p !== pid).map(p => [p, hands[p]])
                ),
                currentPlayerIndex: startPlayerIndex,
                scores: GameState.scores,
            }));
        }
    });

    GameState.currentPlayerIndex = startPlayerIndex;
    GameState.phase = 'playing';
    document.getElementById('game-area').style.display = '';
    renderAll();
    addLog('游戏开始！');

    if (GameState.players[GameState.currentPlayerIndex] === GameState.myPlayerId) {
        AudioEngine.turnStart();
    }
}

function resetGame() {
    GameState.koikoiPending = false;
    GameState.selectedHandCard = null;
    GameState.selectedCardCombos = [];
    GameState.rightSidebarVisible = false;
    document.getElementById('right-sidebar').style.display = 'none';
    GameState.playerKoikoiUsed = {};
    GameState.playerPrevCombos = {};

    const deck = initDeck();
    const { hands, field, deck: rem } = deal(deck, GameState.players.length);
    GameState.deck = rem;
    GameState.fieldCards = field.map(id => id);
    GameState._oppHands = {};
    GameState._oppMelded = {};

    GameState.players.forEach(pid => {
        if (pid === GameState.myPlayerId) {
            GameState.myHand = hands[pid];
            GameState.myMelded = [];
        } else {
            GameState._oppHands[pid] = hands[pid];
            GameState._oppMelded[pid] = [];
            const conn = GameState.connections[pid];
            if (conn) {
                conn.send(JSON.stringify({
                    type: 'newRound',
                    myHand: hands[pid],
                    fieldCards: GameState.fieldCards,
                    currentPlayerIndex: GameState.currentPlayerIndex,
                    deckCount: GameState.deck.length,
                    scores: GameState.scores,
                }));
            }
        }
    });

    GameState.currentPlayerIndex = Math.floor(Math.random() * GameState.players.length);

    if (GameState.players[GameState.currentPlayerIndex] === GameState.myPlayerId) {
        AudioEngine.turnStart();
    }
}

function deal(deck, numPlayers) {
    const hands = {};
    GameState.players.forEach(p => hands[p] = []);
    for (let i = 0; i < 8; i++) {
        GameState.players.forEach(p => hands[p].push(deck.pop()));
    }
    const field = [];
    for (let i = 0; i < 8; i++) field.push(deck.pop());
    return { hands, field, deck };
}

// ==================== 界面渲染 ====================

function createCardEl(id, isMeld = false, covered = false) {
    const def = getCardDef(id);
    const el = document.createElement('div');
    el.className = 'card';
    if (isMeld) {
        el.style.width = '56px';
        el.style.height = '80px';
    }
    if (def) {
        el.innerHTML = `<span class="card-icon">${def.icon}</span><span class="card-name">${def.name}</span>`;

        const typeMap = { hana: '花', kemono: '兽', mono: '物', bun: '文', asobi: '玩', men: '面', special: '特', kei: '景' };
        const seasonMap = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
        const labels = def.types.map(t => typeMap[t] || t);
        if (def.types.includes('hana') && def.season && seasonMap[def.season]) {
            labels.push(seasonMap[def.season]);
        }
        const label = document.createElement('span');
        label.className = 'card-type-label';
        label.innerHTML = labels.join('<br>');
        if (isMeld) label.style.fontSize = '0.4em';
        el.appendChild(label);

        if (def.month > 0) {
            const badge = document.createElement('span');
            badge.style.cssText = 'position:absolute;top:2px;left:2px;font-size:0.5em;color:#8b6914;';
            badge.textContent = def.month + '月';
            el.appendChild(badge);
        }
    } else {
        el.textContent = '?';
    }
    el.dataset.cardId = id;
    if (covered) el.style.opacity = '0.5';
    return el;
}

function renderField() {
    const container = document.getElementById('field-cards');
    container.innerHTML = '';
    GameState.fieldCards.forEach((fc, i) => {
        let topId, under = null;
        if (typeof fc === 'string') {
            topId = fc;
        } else {
            topId = fc.top;
            if (fc.cards && fc.cards.length) under = fc.cards[fc.cards.length - 1];
        }
        if (!topId) return;

        const wrap = document.createElement('div');
        wrap.className = 'card-stack';
        if (under) {
            wrap.appendChild(createCardEl(under, false, true));
        }
        const top = createCardEl(topId);
        if (GameState.selectedHandCard && canPair(GameState.selectedHandCard, topId)) {
            top.classList.add('can-pair');
        }
        top.addEventListener('click', () => onFieldClick(topId, i));
        wrap.appendChild(top);
        container.appendChild(wrap);
    });
}

function renderHand() {
    const container = document.getElementById('hand-cards');
    container.innerHTML = '';
    GameState.myHand.forEach(id => {
        const el = createCardEl(id);
        if (id === GameState.selectedHandCard) el.classList.add('selected');
        el.addEventListener('click', () => onHandClick(id));
        container.appendChild(el);
    });

    updateOrphanDisplay();
    updateHandCombosDisplay();
    updateSelectedCardCombosDisplay();
    updateScorePreview();

    const btnDiscard = document.getElementById('btn-discard-selected');
    const myTurn = GameState.phase === 'playing' &&
        GameState.players[GameState.currentPlayerIndex] === GameState.myPlayerId;
    if (GameState.selectedHandCard && myTurn && !GameState.koikoiPending) {
        btnDiscard.style.display = 'inline-block';
    } else {
        btnDiscard.style.display = 'none';
    }

    // 控制右侧栏按钮的显示（有选中手牌时显示）
    const rightToggleBtn = document.getElementById('right-sidebar-toggle-btn');
    if (rightToggleBtn) {
        rightToggleBtn.style.display = GameState.selectedHandCard ? 'block' : 'none';
    }
}

function updateSelectedCardCombosDisplay() {
    const el = document.getElementById('selected-card-combos-list');
    if (!el) return;
    if (GameState.selectedHandCard && GameState.selectedCardCombos.length > 0) {
        const def = getCardDef(GameState.selectedHandCard);
        const cardName = def ? def.name : '未知';
        const combosText = GameState.selectedCardCombos.map(c => `${c.name}(${c.score}分)`).join('、');
        el.textContent = `【${cardName}】可参与组合: ${combosText}`;
        el.style.color = '#e8c84c';
    } else if (GameState.selectedHandCard && GameState.selectedCardCombos.length === 0) {
        const def = getCardDef(GameState.selectedHandCard);
        const cardName = def ? def.name : '未知';
        el.textContent = `【${cardName}】暂无组合`;
        el.style.color = '#ff8c8c';
    } else {
        el.textContent = '点击手牌查看可参与的组合';
        el.style.color = '#a09080';
    }
}

function renderMelded() {
    const container = document.getElementById('melded-cards');
    container.innerHTML = '';
    const cards = [...GameState.myMelded];
    const categories = {
        hana: { title: '🌸 花', cards: [] },
        kemono: { title: '🐾 兽', cards: [] },
        asobi: { title: '🎎 玩', cards: [] },
        men: { title: '👹 面', cards: [] },
        bun: { title: '📜 文', cards: [] },
        mono: { title: '🏮 物', cards: [] },
    };

    cards.forEach(id => {
        const def = getCardDef(id);
        if (!def) return;
        if (def.types.includes('hana')) categories.hana.cards.push(id);
        else if (def.types.includes('kemono')) categories.kemono.cards.push(id);
        else if (def.types.includes('asobi')) categories.asobi.cards.push(id);
        else if (def.types.includes('men')) categories.men.cards.push(id);
        else if (def.types.includes('bun')) categories.bun.cards.push(id);
        else categories.mono.cards.push(id);
    });

    const sortCards = (ids) => ids.sort((a, b) => {
        const da = getCardDef(a), db = getCardDef(b);
        if (da.month > 0 && db.month > 0) {
            if (da.month !== db.month) return da.month - db.month;
        }
        return (da.name || '').localeCompare(db.name || '');
    });

    for (const [key, cat] of Object.entries(categories)) {
        if (cat.cards.length === 0) continue;
        cat.cards = sortCards(cat.cards);
        const catDiv = document.createElement('div');
        catDiv.className = 'melded-category';
        catDiv.innerHTML = `<h5>${cat.title} (${cat.cards.length})</h5>`;
        const rowDiv = document.createElement('div');
        rowDiv.className = 'cards-row';
        cat.cards.forEach(id => rowDiv.appendChild(createCardEl(id, true)));
        catDiv.appendChild(rowDiv);
        container.appendChild(catDiv);
    }

    const result = calculateScores(GameState.myMelded);
    document.getElementById('my-combos').innerHTML =
        '副露组合: ' + (result.combos.length > 0 ? result.combos.map(c => `${c.name}(${c.score}分)`).join(', ') : '暂无');

    updateOrphanDisplay();
    updateScorePreview();
}

// ==================== 左侧栏（对手副露）====================

function toggleSidebar() {
    GameState.sidebarVisible = !GameState.sidebarVisible;
    const sidebar = document.getElementById('opponent-sidebar');
    if (sidebar) {
        sidebar.style.display = GameState.sidebarVisible ? 'flex' : 'none';
    }
}

function renderSidebarOpponents() {
    const sidebar = document.getElementById('opponent-sidebar-content');
    if (!sidebar) return;
    sidebar.innerHTML = '';

    GameState.players.forEach(pid => {
        if (pid === GameState.myPlayerId) return;
        const name = GameState.playerNames[pid] || pid.substring(0, 6);
        const meldedCards = GameState._oppMelded[pid] || [];

        const section = document.createElement('div');
        section.className = 'sidebar-player-section';
        section.innerHTML = `<h4>${name} 的副露 (${meldedCards.length})</h4>`;

        const categories = {
            hana: { title: '花', cards: [] },
            kemono: { title: '兽', cards: [] },
            asobi: { title: '玩', cards: [] },
            men: { title: '面', cards: [] },
            bun: { title: '文', cards: [] },
            mono: { title: '物', cards: [] },
        };

        meldedCards.forEach(id => {
            const def = getCardDef(id);
            if (!def) return;
            if (def.types.includes('hana')) categories.hana.cards.push(id);
            else if (def.types.includes('kemono')) categories.kemono.cards.push(id);
            else if (def.types.includes('asobi')) categories.asobi.cards.push(id);
            else if (def.types.includes('men')) categories.men.cards.push(id);
            else if (def.types.includes('bun')) categories.bun.cards.push(id);
            else categories.mono.cards.push(id);
        });

        for (const [key, cat] of Object.entries(categories)) {
            if (cat.cards.length === 0) continue;
            const catDiv = document.createElement('div');
            catDiv.className = 'sidebar-category';
            catDiv.innerHTML = `<h5>${cat.title}</h5>`;
            const rowDiv = document.createElement('div');
            rowDiv.className = 'sidebar-cards-row';
            cat.cards.forEach(id => {
                const mini = document.createElement('div');
                mini.className = 'sidebar-card-mini';
                mini.textContent = getCardDef(id)?.name || '?';
                rowDiv.appendChild(mini);
            });
            catDiv.appendChild(rowDiv);
            section.appendChild(catDiv);
        }

        sidebar.appendChild(section);
    });
}

function renderOpponents() {
    const container = document.getElementById('opponents-container');
    if (container) container.innerHTML = '';
    renderSidebarOpponents();
}

// ==================== 右侧栏（组合明细）====================

function toggleRightSidebar() {
    GameState.rightSidebarVisible = !GameState.rightSidebarVisible;
    const sidebar = document.getElementById('right-sidebar');
    if (sidebar) {
        sidebar.style.display = GameState.rightSidebarVisible ? 'flex' : 'none';
        if (GameState.rightSidebarVisible) {
            renderRightSidebar();
        }
    }
}

function renderRightSidebar() {
    const sidebar = document.getElementById('right-sidebar-content');
    if (!sidebar) return;

    if (!GameState.selectedHandCard || GameState.selectedCardCombos.length === 0) {
        sidebar.innerHTML = '<p style="color:#a09080;">请先选择一张手牌</p>';
        return;
    }

    const def = getCardDef(GameState.selectedHandCard);
    const cardName = def ? def.name : '未知';
    let html = `<h4>【${cardName}】可参与的组合明细</h4>`;

    const allCombos = getAllTheoreticalCombos();
    const allCardIds = CARD_DEFS.map(c => c.id);
    const seen = new Set();

    // 需要去重的组合名称列表
    const dedupNames = [
        '六花', '六物', '四玩具', '十二花',
        '春花', '夏花', '秋花', '冬花',
        '春花+春·歌', '夏花+夏·句', '秋花+秋·吟', '冬花+冬·诗',
        '春夏相连', '秋冬相连',
        '四君子', '岁寒三友',
        '风花雪月', '花鸟风月',
        '外庭'
    ];

    for (const combo of allCombos) {
        let covered = [];
        if (combo.cards && combo.cards.length > 0) {
            if (combo.cards.includes(GameState.selectedHandCard)) {
                covered = combo.cards;
            }
        } else {
            covered = getCoveredCardsForCombo(combo, allCardIds);
            if (!covered.includes(GameState.selectedHandCard)) {
                covered = [];
            }
        }

        if (covered.length === 0) continue;

        if (seen.has(combo.name)) continue;
        seen.add(combo.name);

        let rawNames = covered.map(id => {
            const d = getCardDef(id);
            return d ? d.name : id;
        });

        // 对列表中的组合进行牌名去重
        if (dedupNames.includes(combo.name)) {
            rawNames = [...new Set(rawNames)];
        }

        const cardNames = rawNames.join('、');

        html += `<div class="combo-detail-item">
            <span class="combo-name">${combo.name} (${combo.score}分)</span>
            <span class="combo-cards">所需：${cardNames}</span>
        </div>`;
    }

    sidebar.innerHTML = html;
}

// ==================== 其他渲染 ====================

function renderScoresBar() {
    const bar = document.getElementById('scores-bar');
    bar.innerHTML = '';
    GameState.players.forEach(pid => {
        const name = GameState.playerNames[pid] || pid.substring(0, 6);
        const score = GameState.scores[pid] || 0;
        const item = document.createElement('div');
        item.className = 'score-item';
        item.textContent = `${name}: ${score}分`;
        bar.appendChild(item);
    });
}

function updateTurnDisplay() {
    const turnEl = document.getElementById('turn-display');
    if (!GameState.players.length || !GameState.myPlayerId) {
        turnEl.textContent = '等待开始';
        return;
    }
    const currentPid = GameState.players[GameState.currentPlayerIndex];
    if (currentPid === GameState.myPlayerId) {
        turnEl.textContent = '己方回合';
    } else {
        const name = GameState.playerNames[currentPid] || currentPid.substring(0, 6);
        turnEl.textContent = name + '的回合';
    }
}

function updateDeckCount() {
    document.getElementById('deck-count-display').textContent = '牌堆: ' + GameState.deck.length;
}

function updateOrphanDisplay() {
    const handOrphans = getOrphanCards(GameState.myHand);
    const meldedOrphans = getOrphanCards(GameState.myMelded);
    document.getElementById('hand-orphan-list').textContent = handOrphans.length ?
        handOrphans.map(id => getCardDef(id)?.name || '?').join('、') : '无';
    document.getElementById('melded-orphan-list').textContent = meldedOrphans.length ?
        meldedOrphans.map(id => getCardDef(id)?.name || '?').join('、') : '无';
}

function updateHandCombosDisplay() {
    const combos = detectCombos(GameState.myHand);
    document.getElementById('hand-combos-list').textContent = combos.length > 0 ?
        combos.map(c => `${c.name}(${c.score}分)`).join(', ') : '暂无';
}

function updateScorePreview() {
    const meldedScore = calculateScores(GameState.myMelded).totalScore;
    const handScore = calculateScores(GameState.myHand).totalScore;
    document.getElementById('score-value').textContent =
        `副露${meldedScore} × 手牌${handScore} = 总分${meldedScore * handScore}`;
}

function updateButtons() {
    const startBtn = document.getElementById('btn-start');
    startBtn.disabled = !(GameState.isHost && GameState.phase === 'waiting' && GameState.players.length >= GameState.maxPlayers);
    startBtn.style.display = (GameState.isHost && GameState.phase === 'waiting') ? '' : 'none';

    const myTurn = GameState.phase === 'playing' &&
        GameState.players[GameState.currentPlayerIndex] === GameState.myPlayerId;

    document.getElementById('btn-koikoi').style.display = (GameState.koikoiPending && myTurn) ? '' : 'none';
    document.getElementById('btn-declare').style.display = (GameState.koikoiPending && myTurn) ? '' : 'none';
}

function renderAll() {
    renderField();
    renderHand();
    renderMelded();
    renderOpponents();
    renderScoresBar();
    updateDeckCount();
    updateTurnDisplay();
    updateButtons();
    if (GameState.rightSidebarVisible) {
        renderRightSidebar();
    }
}