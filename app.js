const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const PICKER_RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = ["s", "h", "d", "c"];
const SUIT_META = {
  s: { name: "黑桃", symbol: "♠", red: false },
  c: { name: "梅花", symbol: "♣", red: false },
  h: { name: "红桃", symbol: "♥", red: true },
  d: { name: "方片", symbol: "♦", red: true },
};
const PICKER_SUITS = ["s", "c", "h", "d"];
const RANK_VALUE = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 2]));

const state = {
  hero: ["As", "Kh"],
  board: ["Qs", "Jd", "2c", "", ""],
  activePick: null,
  activeVillain: "庄位",
  folded: new Set(),
  dealer: "庄位",
  playerCount: 9,
  roleLabels: {},
  autoBlindSeats: new Set(),
  committedPot: 0,
  villainStyles: {},
  actionLog: [],
  actionRound: 1,
  nextActionId: 1,
};

const RANGE_PRESETS = {
  standard: {
    label: "标",
    fullLabel: "标准",
    range: "22+, A2s+, KTs+, QTs+, JTs, T9s, ATo+, KQo",
  },
  tight: {
    label: "紧",
    fullLabel: "紧",
    range: "66+, A9s+, KQs, AJo+, KQo",
  },
  loose: {
    label: "松",
    fullLabel: "松",
    range: "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, 54s, A2o+, K9o+, Q9o+, J9o+, T9o",
  },
};

const villainRanges = {
  庄位: "22+, A2s+, KTs+, QTs+, JTs, T9s, ATo+, KQo",
  小盲: "22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, A9o+, KJo+",
  抓位1: "22+, A2s+, K9s+, QTs+, JTs, T9s, ATo+, KQo",
  抓位2: "44+, A8s+, KTs+, QTs+, JTs, AJo+, KQo",
  抓位3: "33+, A7s+, KTs+, QTs+, JTs, ATo+, KQo",
  抓位4: "44+, A9s+, KJs+, QJs, AJo+, KQo",
  抓位5: "55+, ATs+, KQs, AJo+",
  抓位6: "66+, AJs+, KQs, AQo+",
};

const PLAYER_ORDER = ["庄位", "小盲", "我", "抓位1", "抓位2", "抓位3", "抓位4", "抓位5", "抓位6"];
const VILLAIN_ORDER = PLAYER_ORDER.filter((seat) => seat !== "我");
const betRecordTimers = new Map();
const lastRecordedBets = new Map();

const analyzeButton = document.querySelector("#analyzeButton");
const resetButton = document.querySelector("#resetButton");
const playerCountInput = document.querySelector("#playerCount");
const dealerSeatInput = document.querySelector("#dealerSeat");
const smallBlindInput = document.querySelector("#smallBlind");
const bigBlindInput = document.querySelector("#bigBlind");
const applyBlindsButton = document.querySelector("#applyBlindsButton");
const endRoundButton = document.querySelector("#endRoundButton");
const heroFoldButton = document.querySelector("#heroFoldButton");
const clearActionsButton = document.querySelector("#clearActionsButton");
const villainRangeInput = document.querySelector("#villainRange");
const iterationsInput = document.querySelector("#iterations");
const errorMessage = document.querySelector("#errorMessage");
const rangeButtons = document.querySelectorAll(".quick-ranges button");
const cardPicker = document.querySelector("#cardPicker");
const suitGrid = document.querySelector("#suitGrid");
const closePickerButton = document.querySelector("#closePickerButton");
const clearCardButton = document.querySelector("#clearCardButton");
const activeVillainLabel = document.querySelector("#activeVillain");
const betInputs = document.querySelectorAll("[data-bet]");

const output = {
  heroEquity: document.querySelector("#heroEquity"),
  rangeCount: document.querySelector("#rangeCount"),
  equityFill: document.querySelector("#equityFill"),
  winRate: document.querySelector("#winRate"),
  tieRate: document.querySelector("#tieRate"),
  loseRate: document.querySelector("#loseRate"),
  insights: document.querySelector("#insights"),
  rangePreview: document.querySelector("#rangePreview"),
  potTotal: document.querySelector("#potTotal"),
  tablePotTotal: document.querySelector("#tablePotTotal"),
  callAmount: document.querySelector("#callAmount"),
  neededRate: document.querySelector("#neededRate"),
  actionLog: document.querySelector("#actionLog"),
  actionRoundLabel: document.querySelector("#actionRoundLabel"),
  actionCount: document.querySelector("#actionCount"),
};

function buildDeck() {
  return RANKS.flatMap((rank) => SUITS.map((suit) => `${rank}${suit}`));
}

function selectedCards() {
  return [...state.hero, ...state.board].filter(Boolean);
}

function assertUnique(cards) {
  const seen = new Set();
  for (const card of cards) {
    if (seen.has(card)) throw new Error(`牌 ${formatCard(card)} 重复了。`);
    seen.add(card);
  }
}

function expandRange(rangeText, deadCards) {
  const tokens = rangeText
    .replace(/[，]/g, ",")
    .split(",")
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
  const combos = new Map();

  for (const token of tokens) {
    for (const hand of expandToken(token)) {
      for (const combo of handToCombos(hand, deadCards)) {
        combos.set(combo.join(" "), combo);
      }
    }
  }

  return [...combos.values()];
}

function expandToken(token) {
  const plus = token.endsWith("+");
  const base = plus ? token.slice(0, -1) : token;
  const match = base.match(/^([2-9TJQKA])([2-9TJQKA])([SO])?$/);
  if (!match) throw new Error(`范围 "${token}" 暂不支持，请用 22+、A2s+、KQo 这类写法。`);

  const [, first, second, suitedness] = match;
  if (first === second) {
    if (!plus) return [base];
    return RANKS.slice(RANKS.indexOf(first)).map((rank) => `${rank}${rank}`);
  }

  const high = RANK_VALUE[first] > RANK_VALUE[second] ? first : second;
  const low = RANK_VALUE[first] > RANK_VALUE[second] ? second : first;
  const suffix = suitedness || "";

  if (!plus) return [`${high}${low}${suffix}`];

  const lows = RANKS.slice(RANKS.indexOf(low), RANKS.indexOf(high));
  return lows.map((nextLow) => `${high}${nextLow}${suffix}`);
}

function handToCombos(hand, deadCards) {
  const [a, b, suitedness] = hand;
  const dead = new Set(deadCards);
  const combos = [];

  if (a === b) {
    for (let i = 0; i < SUITS.length; i += 1) {
      for (let j = i + 1; j < SUITS.length; j += 1) {
        const combo = [`${a}${SUITS[i]}`, `${b}${SUITS[j]}`];
        if (!combo.some((card) => dead.has(card))) combos.push(combo);
      }
    }
    return combos;
  }

  for (const suitA of SUITS) {
    for (const suitB of SUITS) {
      if (suitedness === "S" && suitA !== suitB) continue;
      if (suitedness === "O" && suitA === suitB) continue;
      const combo = [`${a}${suitA}`, `${b}${suitB}`];
      if (!combo.some((card) => dead.has(card))) combos.push(combo);
    }
  }
  return combos;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function evaluateSeven(cards) {
  const fiveCardHands = combinations(cards, 5);
  let best = null;
  for (const hand of fiveCardHands) {
    const score = evaluateFive(hand);
    if (!best || compareScores(score, best) > 0) best = score;
  }
  return best;
}

function combinations(items, size) {
  const result = [];
  const path = [];
  function walk(start) {
    if (path.length === size) {
      result.push([...path]);
      return;
    }
    for (let i = start; i <= items.length - (size - path.length); i += 1) {
      path.push(items[i]);
      walk(i + 1);
      path.pop();
    }
  }
  walk(0);
  return result;
}

function evaluateFive(cards) {
  const values = cards.map((card) => RANK_VALUE[card[0]]).sort((a, b) => b - a);
  const suits = cards.map((card) => card[1]);
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);

  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const isFlush = suits.every((suit) => suit === suits[0]);
  const straightHigh = getStraightHigh(values);

  if (isFlush && straightHigh) return [8, straightHigh];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
  if (isFlush) return [5, ...values];
  if (straightHigh) return [4, straightHigh];
  if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map(([value]) => value).sort((a, b) => b - a)];
  if (groups[0][1] === 2 && groups[1][1] === 2) return [2, Math.max(groups[0][0], groups[1][0]), Math.min(groups[0][0], groups[1][0]), groups[2][0]];
  if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map(([value]) => value).sort((a, b) => b - a)];
  return [0, ...values];
}

function getStraightHigh(values) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let i = 0; i <= unique.length - 5; i += 1) {
    const run = unique.slice(i, i + 5);
    if (run[0] - run[4] === 4) return run[0];
  }
  return 0;
}

function compareScores(a, b) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function runSimulation(heroCards, boardCards, villainCombos, iterations) {
  const dead = new Set([...heroCards, ...boardCards]);
  const deck = buildDeck().filter((card) => !dead.has(card));
  let wins = 0;
  let ties = 0;
  let losses = 0;

  for (let i = 0; i < iterations; i += 1) {
    const villain = villainCombos[Math.floor(Math.random() * villainCombos.length)];
    if (villain.some((card) => dead.has(card))) {
      i -= 1;
      continue;
    }

    const available = deck.filter((card) => !villain.includes(card));
    const runout = shuffle([...available]).slice(0, 5 - boardCards.length);
    const fullBoard = [...boardCards, ...runout];
    const comparison = compareScores(evaluateSeven([...heroCards, ...fullBoard]), evaluateSeven([...villain, ...fullBoard]));
    if (comparison > 0) wins += 1;
    else if (comparison === 0) ties += 1;
    else losses += 1;
  }

  return {
    wins,
    ties,
    losses,
    winRate: wins / iterations,
    tieRate: ties / iterations,
    loseRate: losses / iterations,
    equity: (wins + ties / 2) / iterations,
  };
}

function boardTexture(boardCards) {
  if (boardCards.length < 3) return ["还没有翻牌，当前结果主要看你这两张牌和对手可能手牌的对比。"];

  const ranks = boardCards.map((card) => RANK_VALUE[card[0]]);
  const suits = boardCards.map((card) => card[1]);
  const suitCounts = countItems(suits);
  const rankCounts = countItems(ranks);
  const insights = [];

  if (Math.max(...Object.values(suitCounts)) >= 3) insights.push("公共牌同花很多，继续投入前要小心对手已经成同花。");
  if (Math.max(...Object.values(rankCounts)) >= 2) insights.push("公共牌有对子，对手可能有三条、葫芦这类强牌。");
  if (hasConnectedRanks(ranks)) insights.push("公共牌比较连，顺子和两对会更常见。");
  if (!insights.length) insights.push("公共牌比较散，你手里的高牌或对子更容易保持价值。");
  return insights;
}

function countItems(items) {
  return items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
}

function hasConnectedRanks(ranks) {
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  for (let i = 0; i < unique.length - 1; i += 1) {
    if (unique[i + 1] - unique[i] <= 2) return true;
  }
  return false;
}

function strategyHint(equity) {
  if (equity >= 0.62) return "你现在比较领先，可以考虑是不是要多拿一点价值。";
  if (equity >= 0.48) return "局面很接近，先看对方下注多少，再决定跟不跟。";
  if (equity >= 0.34) return "你现在偏落后，继续投入前要看底池够不够划算。";
  return "你现在明显落后，通常要少往里面放分。";
}

function renderResults(result, villainCombos, boardCards) {
  const win = formatPercent(result.winRate);
  const tie = formatPercent(result.tieRate);
  const lose = formatPercent(result.loseRate);
  const equity = formatPercent(result.equity);

  output.heroEquity.textContent = equity;
  output.winRate.textContent = win;
  output.tieRate.textContent = tie;
  output.loseRate.textContent = lose;
  output.equityFill.style.width = equity;
  output.rangeCount.textContent = `${villainCombos.length} 种可能`;

  output.insights.innerHTML = "";
  const messages = [strategyHint(result.equity), ...boardTexture(boardCards)];
  for (const [index, message] of messages.entries()) {
    const item = document.createElement("div");
    item.className = `insight${index === 0 && result.equity < 0.48 ? " warning" : ""}`;
    item.textContent = message;
    output.insights.appendChild(item);
  }

  output.rangePreview.innerHTML = "";
  for (const combo of villainCombos.slice(0, 100)) {
    const chip = document.createElement("span");
    chip.className = "combo-chip";
    chip.textContent = combo.map(formatCard).join(" ");
    output.rangePreview.appendChild(chip);
  }
}

function analyze() {
  errorMessage.textContent = "";
  const betInfo = updatePot();
  if (state.folded.has(state.activeVillain)) {
    throw new Error(`${state.activeVillain} 已弃牌，请选择还在局里的对手。`);
  }
  const heroCards = state.hero.filter(Boolean);
  const boardCards = state.board.filter(Boolean);
  if (heroCards.length !== 2) throw new Error("请先选满你的两张手牌。");
  if (boardCards.length > 5) throw new Error("公共牌最多 5 张。");
  assertUnique([...heroCards, ...boardCards]);

  villainRanges[state.activeVillain] = villainRangeInput.value;
  const villainCombos = expandRange(villainRangeInput.value, [...heroCards, ...boardCards]);
  if (!villainCombos.length) throw new Error("对手可能手牌里没有可用牌，请调整。");

  const result = runSimulation(heroCards, boardCards, villainCombos, Number(iterationsInput.value));
  renderResults(result, villainCombos, boardCards);
  renderBetHint(result.equity, betInfo);
}

function renderCards() {
  document.querySelectorAll(".card-slot").forEach((slot) => {
    const zone = slot.dataset.zone;
    const index = Number(slot.dataset.index);
    const card = state[zone][index];
    slot.classList.toggle("filled", Boolean(card));
    slot.classList.toggle("red-card", Boolean(card && SUIT_META[card[1]].red));
    slot.innerHTML = card ? `${card[0]}<small>${SUIT_META[card[1]].symbol}</small>` : "+";
    slot.setAttribute("aria-label", card ? formatCard(card) : "选择牌");
  });
}

function renderPicker() {
  suitGrid.innerHTML = "";
  const used = new Set(selectedCards());
  const current = state.activePick ? state[state.activePick.zone][state.activePick.index] : "";
  if (current) used.delete(current);

  for (const suit of PICKER_SUITS) {
    const section = document.createElement("section");
    section.className = "suit-section";
    const title = document.createElement("div");
    title.className = "suit-title";
    title.textContent = `${SUIT_META[suit].name} ${SUIT_META[suit].symbol}`;
    section.appendChild(title);

    const ranks = document.createElement("div");
    ranks.className = "rank-grid";
    for (const rank of PICKER_RANKS) {
      const card = `${rank}${suit}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `pick-card${SUIT_META[suit].red ? " red-card" : ""}`;
      button.textContent = rank;
      button.setAttribute("aria-label", formatCard(card));
      button.disabled = used.has(card);
      button.addEventListener("click", () => chooseCard(card));
      ranks.appendChild(button);
    }
    section.appendChild(ranks);
    suitGrid.appendChild(section);
  }
}

function openPicker(zone, index) {
  state.activePick = { zone, index };
  renderPicker();
  cardPicker.showModal();
}

function chooseCard(card) {
  if (!state.activePick) return;
  state[state.activePick.zone][state.activePick.index] = card;
  renderCards();
  cardPicker.close();
  safeAnalyze();
}

function clearActiveCard() {
  if (!state.activePick) return;
  state[state.activePick.zone][state.activePick.index] = "";
  renderCards();
  cardPicker.close();
  safeAnalyze();
}

function setActiveVillain(position) {
  if (state.folded.has(position)) {
    errorMessage.textContent = `${position} 已弃牌，不能作为当前分析对象。`;
    return;
  }
  villainRanges[state.activeVillain] = villainRangeInput.value;
  state.activeVillain = position;
  villainRangeInput.value = villainRanges[position];
  activeVillainLabel.textContent = state.roleLabels[position] || position;
  renderSeatStates();
  safeAnalyze();
}

function resetAll() {
  state.hero = ["", ""];
  state.board = ["", "", "", "", ""];
  state.activeVillain = "庄位";
  state.dealer = "庄位";
  state.playerCount = 9;
  state.committedPot = 0;
  state.villainStyles = {};
  state.actionLog = [];
  state.actionRound = 1;
  state.nextActionId = 1;
  state.folded.clear();
  state.autoBlindSeats.clear();
  playerCountInput.value = "9";
  dealerSeatInput.value = "庄位";
  smallBlindInput.value = "1";
  bigBlindInput.value = "2";
  Object.assign(villainRanges, {
    庄位: "22+, A2s+, KTs+, QTs+, JTs, T9s, ATo+, KQo",
    小盲: "22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, A9o+, KJo+",
    抓位1: "22+, A2s+, K9s+, QTs+, JTs, T9s, ATo+, KQo",
    抓位2: "44+, A8s+, KTs+, QTs+, JTs, AJo+, KQo",
    抓位3: "33+, A7s+, KTs+, QTs+, JTs, ATo+, KQo",
    抓位4: "44+, A9s+, KJs+, QJs, AJo+, KQo",
    抓位5: "55+, ATs+, KQs, AJo+",
    抓位6: "66+, AJs+, KQs, AQo+",
  });
  betInputs.forEach((input) => (input.value = "0"));
  syncRecordedBets();
  applyBlindSettings();
  renderCards();
  renderSeatStates();
  renderActionLog();
  setActiveVillain("庄位");
  resetAnalysisOutputs();
  updatePot();
}

function resetAnalysisOutputs() {
  output.heroEquity.textContent = "--";
  output.winRate.textContent = "--";
  output.tieRate.textContent = "--";
  output.loseRate.textContent = "--";
  output.equityFill.style.width = "0";
  output.rangeCount.textContent = "-- 种可能";
  output.insights.innerHTML = "";
  output.rangePreview.innerHTML = "";
  errorMessage.textContent = "";
}

function toggleFold(position) {
  const wasFolded = state.folded.has(position);
  if (state.folded.has(position)) {
    state.folded.delete(position);
  } else {
    state.folded.add(position);
  }

  if (state.folded.has(state.activeVillain)) {
    const next = activeVillainSeats().find((seat) => !state.folded.has(seat));
    if (next) {
      state.activeVillain = next;
      villainRangeInput.value = villainRanges[next];
      activeVillainLabel.textContent = state.roleLabels[next] || next;
    }
  }

  renderSeatStates();
  recordAction(position, wasFolded ? "恢复行动" : "弃牌");
  safeAnalyze();
}

function renderSeatStates() {
  const activeSeats = new Set(activePlayers());
  const actionMap = preflopActionMap();
  document.querySelectorAll(".villain-seat").forEach((seat) => {
    const position = seat.dataset.villain;
    const visible = activeSeats.has(position);
    const folded = state.folded.has(position);
    const active = position === state.activeVillain && !folded;
    const label = state.roleLabels[position] || position;
    seat.classList.toggle("is-hidden", !visible);
    seat.classList.toggle("active", active);
    seat.classList.toggle("folded", folded);
    renderDealerChip(seat, position, visible);
    renderStyleButtons(seat, position, visible);
    const name = seat.querySelector(".seat-name");
    name.textContent = active ? `${label} 对手` : label;
    renderActionBadge(seat, visible ? actionMap[position] : "");
    const select = seat.querySelector(".seat-select");
    select.disabled = folded;
    const foldButton = seat.querySelector(".fold-toggle");
    foldButton.textContent = folded ? "恢复" : "弃牌";
    foldButton.classList.toggle("is-folded", folded);
  });
  const heroLabel = document.querySelector(".hero-seat .seat-name");
  heroLabel.textContent = state.roleLabels["我"] || "我";
  const heroSeat = document.querySelector(".hero-seat");
  renderDealerChip(heroSeat, "我", activeSeats.has("我"));
  renderActionBadge(heroSeat, actionMap["我"]);
  activeVillainLabel.textContent = state.roleLabels[state.activeVillain] || state.activeVillain;
}

function renderStyleButtons(seat, position, visible) {
  if (!seat) return;
  let group = seat.querySelector(".style-tags");
  if (!group) {
    group = document.createElement("div");
    group.className = "style-tags";
    for (const [style, preset] of Object.entries(RANGE_PRESETS)) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.style = style;
      button.textContent = preset.label;
      button.setAttribute("aria-label", preset.fullLabel);
      group.appendChild(button);
    }
    const foldButton = seat.querySelector(".fold-toggle");
    seat.insertBefore(group, foldButton);
  }
  group.hidden = !visible;
  const currentStyle = state.villainStyles[position] || "standard";
  group.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.style === currentStyle);
  });
}

function renderDealerChip(seat, position, visible) {
  if (!seat) return;
  let chip = seat.querySelector(".dealer-chip");
  if (!chip) {
    chip = document.createElement("button");
    chip.type = "button";
    chip.className = "dealer-chip";
    chip.textContent = "D";
    seat.appendChild(chip);
  }
  chip.dataset.dealer = position;
  chip.hidden = !visible;
  chip.classList.toggle("is-dealer", position === state.dealer);
  chip.setAttribute("aria-label", position === state.dealer ? "当前庄位" : "设为庄位");
}

function updatePot() {
  const active = new Set(activePlayers());
  const values = Object.fromEntries(
    [...betInputs].map((input) => {
      const seat = input.dataset.bet;
      return [seat, active.has(seat) ? Math.max(0, Number(input.value) || 0) : 0];
    }),
  );
  const roundTotal = Object.values(values).reduce((sum, value) => sum + value, 0);
  const total = state.committedPot + roundTotal;
  const heroBet = values["我"] || 0;
  const villainBet = values[state.activeVillain] || 0;
  const callAmount = Math.max(0, villainBet - heroBet);
  const neededRate = callAmount > 0 ? callAmount / (total + callAmount) : 0;
  output.potTotal.textContent = `${total} 积分`;
  output.tablePotTotal.textContent = total;
  output.callAmount.textContent = `${callAmount} 积分`;
  output.neededRate.textContent = callAmount > 0 ? formatPercent(neededRate) : "--";
  return { total, roundTotal, heroBet, villainBet, callAmount, neededRate };
}

function endBettingRound() {
  const { roundTotal } = updatePot();
  recordAction("牌桌", `第 ${state.actionRound} 圈结束，收进底池 ${roundTotal} 积分`);
  state.committedPot += roundTotal;
  state.actionRound += 1;
  betInputs.forEach((input) => {
    input.value = "0";
  });
  syncRecordedBets();
  state.autoBlindSeats.clear();
  renderActionLog();
  updatePot();
  safeAnalyze();
}

function finishHandByHeroFold() {
  recordAction("我", "弃牌，进入下一手");
  startNextHand();
}

function startNextHand() {
  const nextDealer = getSeatAfter(state.dealer, 1);
  state.hero = ["", ""];
  state.board = ["", "", "", "", ""];
  state.dealer = nextDealer;
  state.committedPot = 0;
  state.actionLog = [];
  state.actionRound = 1;
  state.nextActionId = 1;
  state.folded.clear();
  state.autoBlindSeats.clear();
  betInputs.forEach((input) => {
    input.value = "0";
  });
  syncRecordedBets();
  dealerSeatInput.value = nextDealer;
  renderCards();
  applyBlindSettings();
  renderActionLog();
  resetAnalysisOutputs();
  updatePot();
}

function applyBlindSettings() {
  state.playerCount = Number(playerCountInput.value);
  updateDealerOptions();
  state.dealer = dealerSeatInput.value;
  if (!activePlayers().includes(state.dealer)) {
    state.dealer = activePlayers()[0];
    dealerSeatInput.value = state.dealer;
  }
  buildRoleLabels();
  state.folded = new Set([...state.folded].filter((seat) => activePlayers().includes(seat)));

  state.autoBlindSeats.forEach((seat) => {
    const input = document.querySelector(`[data-bet="${seat}"]`);
    if (input) input.value = "0";
  });
  state.autoBlindSeats.clear();

  const sbSeat = getSeatAfter(state.dealer, 1);
  const bbSeat = getSeatAfter(state.dealer, 2);
  const smallBlind = Math.max(0, Number(smallBlindInput.value) || 0);
  const bigBlind = Math.max(0, Number(bigBlindInput.value) || 0);
  setSeatBet(sbSeat, smallBlind);
  setSeatBet(bbSeat, bigBlind);
  state.autoBlindSeats.add(sbSeat);
  state.autoBlindSeats.add(bbSeat);
  PLAYER_ORDER.filter((seat) => !activePlayers().includes(seat)).forEach((seat) => setSeatBet(seat, 0));
  if (!activeVillainSeats().includes(state.activeVillain) || state.folded.has(state.activeVillain)) {
    state.activeVillain = activeVillainSeats().find((seat) => !state.folded.has(seat)) || activeVillainSeats()[0];
    villainRangeInput.value = villainRanges[state.activeVillain];
  }

  renderSeatStates();
  safeAnalyze();
}

function setDealerFromSeat(seat) {
  if (!activePlayers().includes(seat)) return;
  state.dealer = seat;
  dealerSeatInput.value = seat;
  applyBlindSettings();
}

function setVillainStyle(seat, style) {
  if (!RANGE_PRESETS[style] || !activeVillainSeats().includes(seat)) return;
  state.villainStyles[seat] = style;
  villainRanges[seat] = RANGE_PRESETS[style].range;
  if (seat === state.activeVillain) {
    villainRangeInput.value = villainRanges[seat];
    safeAnalyze();
  }
  renderSeatStates();
}

function buildRoleLabels() {
  const labels = {};
  const dealer = state.dealer;
  const sbSeat = getSeatAfter(dealer, 1);
  const bbSeat = getSeatAfter(dealer, 2);
  labels[dealer] = "庄位";
  labels[sbSeat] = "小盲";
  labels[bbSeat] = bbSeat === "我" ? "我 大盲" : "大盲";

  let catchIndex = 1;
  for (let offset = 3; offset < activePlayers().length; offset += 1) {
    const seat = getSeatAfter(dealer, offset);
    labels[seat] = seat === "我" ? "我" : `抓位${catchIndex}`;
    catchIndex += seat === "我" ? 0 : 1;
  }
  state.roleLabels = labels;
}

function getSeatAfter(seat, offset) {
  const players = activePlayers();
  const index = players.indexOf(seat);
  return players[(index + offset) % players.length];
}

function setSeatBet(seat, value) {
  const input = document.querySelector(`[data-bet="${seat}"]`);
  if (input) {
    input.value = String(value);
    lastRecordedBets.set(seat, Math.max(0, Number(value) || 0));
  }
}

function activePlayers() {
  return PLAYER_ORDER.slice(0, state.playerCount);
}

function activeVillainSeats() {
  return activePlayers().filter((seat) => seat !== "我");
}

function updateDealerOptions() {
  const active = new Set(activePlayers());
  [...dealerSeatInput.options].forEach((option) => {
    option.hidden = !active.has(option.value);
    option.disabled = !active.has(option.value);
  });
}

function preflopActionMap() {
  const players = activePlayers();
  const start = getSeatAfter(state.dealer, 3);
  const startIndex = players.indexOf(start);
  const ordered = [...players.slice(startIndex), ...players.slice(0, startIndex)];
  return Object.fromEntries(ordered.map((seat, index) => [seat, `行动${index + 1}`]));
}

function renderActionBadge(seat, text) {
  if (!seat) return;
  let badge = seat.querySelector(".action-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "action-badge";
    const anchor = seat.querySelector(".seat-name");
    anchor.insertAdjacentElement("afterend", badge);
  }
  badge.textContent = text || "";
  badge.hidden = !text;
}

function recordBetChange(input) {
  const seat = input.dataset.bet;
  const value = Math.max(0, Number(input.value) || 0);
  const active = new Set(activePlayers());
  if (!active.has(seat) || state.autoBlindSeats.has(seat)) return;
  if (lastRecordedBets.get(seat) === value) return;

  const otherBets = [...betInputs]
    .filter((betInput) => betInput !== input && active.has(betInput.dataset.bet))
    .map((betInput) => Math.max(0, Number(betInput.value) || 0));
  const highestOtherBet = Math.max(0, ...otherBets);

  if (value === 0) {
    recordAction(seat, "清空下注");
  } else if (value > highestOtherBet) {
    recordAction(seat, `${highestOtherBet > 0 ? "加注" : "下注"}到 ${value}`);
  } else if (value === highestOtherBet) {
    recordAction(seat, `跟注到 ${value}`);
  } else {
    recordAction(seat, `下注到 ${value}`);
  }
  lastRecordedBets.set(seat, value);
}

function scheduleBetRecord(input) {
  const seat = input.dataset.bet;
  window.clearTimeout(betRecordTimers.get(seat));
  betRecordTimers.set(
    seat,
    window.setTimeout(() => {
      recordBetChange(input);
      betRecordTimers.delete(seat);
    }, 450),
  );
}

function syncRecordedBets() {
  betInputs.forEach((input) => {
    lastRecordedBets.set(input.dataset.bet, Math.max(0, Number(input.value) || 0));
  });
}

function recordBlindAction() {
  const sbSeat = getSeatAfter(state.dealer, 1);
  const bbSeat = getSeatAfter(state.dealer, 2);
  recordAction("牌桌", `应用盲注：${state.roleLabels[sbSeat] || sbSeat} ${smallBlindInput.value}，${state.roleLabels[bbSeat] || bbSeat} ${bigBlindInput.value}`);
}

function recordAction(seat, action) {
  state.actionLog.push({
    id: state.nextActionId,
    round: state.actionRound,
    seat,
    label: state.roleLabels[seat] || seat,
    action,
  });
  state.nextActionId += 1;
  renderActionLog();
}

function clearActionLog() {
  state.actionLog = [];
  state.actionRound = 1;
  state.nextActionId = 1;
  renderActionLog();
}

function renderActionLog() {
  output.actionRoundLabel.textContent = `第 ${state.actionRound} 圈`;
  output.actionCount.textContent = `${state.actionLog.length} 步`;
  output.actionLog.innerHTML = "";

  if (!state.actionLog.length) {
    const empty = document.createElement("li");
    empty.className = "action-empty";
    empty.textContent = "还没有记录行动。";
    output.actionLog.appendChild(empty);
    return;
  }

  for (const item of state.actionLog.slice(-12)) {
    const row = document.createElement("li");
    const meta = document.createElement("span");
    const body = document.createElement("strong");
    meta.textContent = `第 ${item.round} 圈 · ${item.id}`;
    body.textContent = `${item.label}：${item.action}`;
    row.append(meta, body);
    output.actionLog.appendChild(row);
  }
}

function renderBetHint(equity, betInfo) {
  if (!betInfo.callAmount) return;
  const item = document.createElement("div");
  item.className = `insight${equity < betInfo.neededRate ? " warning" : ""}`;
  item.textContent =
    equity >= betInfo.neededRate
      ? "按当前下注看，胜率大于需要值，跟注在数学上是划算的。"
      : "按当前下注看，胜率低于需要值，跟注不太划算。";
  output.insights.appendChild(item);
}

function safeAnalyze() {
  try {
    analyze();
  } catch (error) {
    errorMessage.textContent = error.message;
  }
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCard(card) {
  return `${card[0]}${SUIT_META[card[1]].symbol}`;
}

document.querySelectorAll(".card-slot").forEach((slot) => {
  slot.addEventListener("click", () => openPicker(slot.dataset.zone, Number(slot.dataset.index)));
});

document.querySelectorAll(".villain-seat .seat-select").forEach((button) => {
  button.addEventListener("click", () => setActiveVillain(button.closest(".villain-seat").dataset.villain));
});

document.querySelectorAll("[data-fold]").forEach((button) => {
  button.addEventListener("click", () => toggleFold(button.dataset.fold));
});

document.addEventListener("click", (event) => {
  const chip = event.target.closest(".dealer-chip");
  if (!chip) return;
  event.stopPropagation();
  setDealerFromSeat(chip.dataset.dealer);
});

document.addEventListener("click", (event) => {
  const styleButton = event.target.closest(".style-tags button");
  if (!styleButton) return;
  event.stopPropagation();
  const seat = styleButton.closest(".villain-seat")?.dataset.villain;
  setVillainStyle(seat, styleButton.dataset.style);
});

betInputs.forEach((input) => {
  input.addEventListener("input", () => {
    updatePot();
    scheduleBetRecord(input);
  });
  input.addEventListener("change", () => recordBetChange(input));
});

playerCountInput.addEventListener("change", applyBlindSettings);
dealerSeatInput.addEventListener("change", applyBlindSettings);
smallBlindInput.addEventListener("change", applyBlindSettings);
bigBlindInput.addEventListener("change", applyBlindSettings);
applyBlindsButton.addEventListener("click", () => {
  applyBlindSettings();
  recordBlindAction();
});
endRoundButton.addEventListener("click", endBettingRound);
heroFoldButton.addEventListener("click", finishHandByHeroFold);
clearActionsButton.addEventListener("click", clearActionLog);

rangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    villainRangeInput.value = button.dataset.range;
    villainRanges[state.activeVillain] = button.dataset.range;
    const matchingPreset = Object.entries(RANGE_PRESETS).find(([, preset]) => preset.range === button.dataset.range);
    state.villainStyles[state.activeVillain] = matchingPreset ? matchingPreset[0] : "standard";
    renderSeatStates();
    safeAnalyze();
  });
});

analyzeButton.addEventListener("click", safeAnalyze);
resetButton.addEventListener("click", resetAll);
closePickerButton.addEventListener("click", () => cardPicker.close());
clearCardButton.addEventListener("click", clearActiveCard);
villainRangeInput.addEventListener("change", () => {
  villainRanges[state.activeVillain] = villainRangeInput.value;
  const matchingPreset = Object.entries(RANGE_PRESETS).find(([, preset]) => preset.range === villainRangeInput.value);
  if (matchingPreset) state.villainStyles[state.activeVillain] = matchingPreset[0];
  else delete state.villainStyles[state.activeVillain];
  renderSeatStates();
});

renderCards();
applyBlindSettings();
renderActionLog();
setActiveVillain("庄位");
