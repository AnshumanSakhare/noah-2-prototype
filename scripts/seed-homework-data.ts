import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index <= 0) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      process.env[key] = value;
    });
  }
}

loadEnvLocal();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: { rejectUnauthorized: false },
});

const MCQ_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --c-grape: #6C5CE7;
      --c-ink-1: #20243A;
      --c-ink-2: #52586F;
      --c-panel: #F6F7FB;
      --c-border: #E5E7F0;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: var(--c-ink-1);
      margin: 0;
      padding: 16px;
      background: transparent;
    }
    .question-text {
      font-size: 1.05rem;
      font-weight: 750;
      line-height: 1.45;
      margin-bottom: 18px;
    }
    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .option-card {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border: 1.5px solid var(--c-border);
      border-radius: 10px;
      background: #ffffff;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 650;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .option-card:hover {
      border-color: var(--c-grape);
      background: var(--c-panel);
    }
    .option-card.selected {
      border-color: var(--c-grape);
      background: rgba(108, 92, 231, 0.08);
      color: var(--c-grape);
    }
    .letter-badge {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--c-panel);
      font-size: 0.76rem;
      font-weight: 850;
      margin-right: 12px;
      color: var(--c-ink-2);
      flex-shrink: 0;
    }
    .option-card.selected .letter-badge {
      background: var(--c-grape);
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="question-text">{{question_text}}</div>
  <div class="options-grid">
    <div class="option-card" onclick="selectOption(0)" id="opt-0"><span class="letter-badge">A</span>{{option_0}}</div>
    <div class="option-card" onclick="selectOption(1)" id="opt-1"><span class="letter-badge">B</span>{{option_1}}</div>
    <div class="option-card" onclick="selectOption(2)" id="opt-2"><span class="letter-badge">C</span>{{option_2}}</div>
    <div class="option-card" onclick="selectOption(3)" id="opt-3"><span class="letter-badge">D</span>{{option_3}}</div>
  </div>

  <script>
    let selected = null;
    function selectOption(idx) {
      selected = idx;
      document.querySelectorAll('.option-card').forEach((card, i) => {
        if (i === idx) card.classList.add('selected');
        else card.classList.remove('selected');
      });
      window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: idx }, '*');
    }
  </script>
</body>
</html>`;

const FILL_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --c-grape: #6C5CE7;
      --c-ink-1: #20243A;
      --c-ink-2: #52586F;
      --c-panel: #F6F7FB;
      --c-border: #E5E7F0;
      --c-mango: #FF9F43;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: var(--c-ink-1);
      margin: 0;
      padding: 16px;
      background: transparent;
    }
    .question-text {
      font-size: 1.05rem;
      font-weight: 750;
      line-height: 1.45;
      margin-bottom: 18px;
    }
    .input-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
    }
    .input-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .text-input {
      flex: 1;
      padding: 12px 14px;
      border: 1.5px solid var(--c-border);
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      outline: none;
      transition: all 0.2s;
    }
    .text-input:focus {
      border-color: var(--c-grape);
      box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
    }
    .unit-tag {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--c-ink-2);
    }
    .hint-box {
      font-size: 0.78rem;
      font-weight: 650;
      color: var(--c-mango);
      background: rgba(255, 159, 67, 0.08);
      padding: 8px 12px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  </style>
</head>
<body>
  <div class="question-text">{{question_text}}</div>
  <div class="input-container">
    <div class="input-row">
      <input type="text" class="text-input" id="ans-input" placeholder="Type your answer..." oninput="reportAnswer()">
      <span class="unit-tag">{{unit}}</span>
    </div>
    <div class="hint-box">
      <span>💡</span>
      <span>Hint: {{hint}}</span>
    </div>
  </div>

  <script>
    function reportAnswer() {
      const val = document.getElementById('ans-input').value;
      window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: val }, '*');
    }
  </script>
</body>
</html>`;

const BLANKS_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --c-grape: #6C5CE7;
      --c-ink-1: #20243A;
      --c-ink-2: #52586F;
      --c-panel: #F6F7FB;
      --c-border: #E5E7F0;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: var(--c-ink-1);
      margin: 0;
      padding: 16px;
      background: transparent;
    }
    .sentence-container {
      font-size: 1.1rem;
      font-weight: 700;
      line-height: 1.8;
      margin-bottom: 24px;
      background: #ffffff;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--c-border);
    }
    .blank-slot {
      display: inline-block;
      min-width: 80px;
      text-align: center;
      border-bottom: 2px dashed var(--c-ink-2);
      color: var(--c-grape);
      margin: 0 6px;
      padding: 0 4px;
      cursor: pointer;
      font-weight: 850;
      transition: all 0.2s;
    }
    .blank-slot.filled {
      border-bottom: 2px solid var(--c-grape);
    }
    .word-bank {
      background: var(--c-panel);
      padding: 16px;
      border-radius: 12px;
      border: 1.5px solid var(--c-border);
    }
    .bank-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      font-weight: 800;
      color: var(--c-ink-2);
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .chips-flex {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .word-chip {
      padding: 8px 14px;
      background: #ffffff;
      border: 1.5px solid var(--c-border);
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }
    .word-chip:hover {
      border-color: var(--c-grape);
      transform: translateY(-1px);
    }
    .word-chip.used {
      opacity: 0.4;
      cursor: not-allowed;
      border-style: dashed;
    }
  </style>
</head>
<body>
  <div class="sentence-container" id="sentence-box">
    <!-- Hydrated sentence with slots goes here -->
  </div>
  
  <div class="word-bank">
    <div class="bank-label">Word Bank (tap to place)</div>
    <div class="chips-flex" id="bank-box">
      <!-- Chips go here -->
    </div>
  </div>

  <script>
    const sentenceTemplate = "{{sentence}}";
    const wordBank = {{wordBank}};
    
    // Determine how many slots exist by counting occurrences of {___}
    const slotCount = (sentenceTemplate.match(/\\{___\\}/g) || []).length;
    const filledValues = new Array(slotCount).fill(null);

    function render() {
      // 1. Render Sentence
      const parts = sentenceTemplate.split('{___}');
      let html = '';
      parts.forEach((part, i) => {
        html += part;
        if (i < slotCount) {
          const val = filledValues[i];
          html += '<span class="blank-slot ' + (val ? 'filled' : '') + '" onclick="removeWord(' + i + ')">' + (val || '_____') + '</span>';
        }
      });
      document.getElementById('sentence-box').innerHTML = html;

      // 2. Render Bank
      let bankHtml = '';
      wordBank.forEach((word) => {
        // Count how many times this word has been used in filledValues
        const usedCount = filledValues.filter(v => v === word).length;
        const totalCount = wordBank.filter(w => w === word).length;
        const isUsed = usedCount >= totalCount;

        bankHtml += '<span class="word-chip ' + (isUsed ? 'used' : '') + '" onclick="' + (isUsed ? '' : 'placeWord(\\'' + word.replace(/'/g, "\\\\'") + '\\')') + '">' + word + '</span>';
      });
      document.getElementById('bank-box').innerHTML = bankHtml;

      // Report answer
      window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: filledValues }, '*');
    }

    function placeWord(word) {
      const firstEmptyIdx = filledValues.indexOf(null);
      if (firstEmptyIdx === -1) return;
      filledValues[firstEmptyIdx] = word;
      render();
    }

    function removeWord(slotIdx) {
      if (filledValues[slotIdx] === null) return;
      filledValues[slotIdx] = null;
      render();
    }

    // Initialize
    render();
  </script>
</body>
</html>`;

const DRAG_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --c-grape: #6C5CE7;
      --c-ink-1: #20243A;
      --c-ink-2: #52586F;
      --c-panel: #F6F7FB;
      --c-border: #E5E7F0;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: var(--c-ink-1);
      margin: 0;
      padding: 16px;
      background: transparent;
    }
    .instruct {
      font-size: 0.8rem;
      color: var(--c-ink-2);
      margin-bottom: 14px;
    }
    .question-text {
      font-size: 1.05rem;
      font-weight: 750;
      margin-bottom: 12px;
    }
    .drag-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .column-title {
      font-size: 0.72rem;
      text-transform: uppercase;
      font-weight: 800;
      color: var(--c-ink-2);
      letter-spacing: 0.05em;
      margin-bottom: 10px;
    }
    .flex-col-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .drag-card {
      padding: 12px 14px;
      border: 1.5px solid var(--c-border);
      border-radius: 8px;
      background: #ffffff;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: grab;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .drag-card:active {
      cursor: grabbing;
    }
    .drag-card.placed-hidden {
      opacity: 0.3;
      border-style: dashed;
      cursor: not-allowed;
    }
    .drag-card.selected {
      border-color: var(--c-grape);
      box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.15);
    }
    .grip-icon {
      color: #cbd5e1;
    }
    .drop-zone {
      padding: 12px 14px;
      border: 1.5px dashed var(--c-border);
      border-radius: 8px;
      background: var(--c-panel);
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--c-ink-2);
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      cursor: pointer;
    }
    .drop-zone.hovered {
      border-color: var(--c-grape);
      background: rgba(108, 92, 231, 0.02);
    }
    .drop-zone.filled {
      border-style: solid;
      border-color: var(--c-grape);
      background: #ffffff;
    }
    .dz-item {
      color: var(--c-grape);
      font-weight: 800;
    }
    .dz-remove {
      font-size: 0.72rem;
      color: #cbd5e1;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
    }
    .dz-remove:hover {
      background: #f1f5f9;
      color: #ef4444;
    }
  </style>
</head>
<body>
  <div class="question-text">{{question_text}}</div>
  <div class="instruct">🖱️ Drag items to matching zones, or tap an item then tap a drop zone.</div>
  
  <div class="drag-container">
    <div>
      <div class="column-title">Items</div>
      <div class="flex-col-stack" id="items-list">
        <!-- Draggables render here -->
      </div>
    </div>
    
    <div>
      <div class="column-title">Drop Zones</div>
      <div class="flex-col-stack" id="zones-list">
        <!-- Target zones render here -->
      </div>
    </div>
  </div>

  <script>
    const rawPairs = {{pairs}}; // [{item: "First Law", zone: "Inertia"}]
    const items = rawPairs.map(p => p.item);
    const zones = rawPairs.map(p => p.zone);
    
    const placements = {}; // zoneId -> itemId
    let selectedItem = null;

    function render() {
      // 1. Render items column
      let itemsHtml = '';
      items.forEach((item) => {
        const isPlaced = Object.values(placements).includes(item);
        const isSelected = selectedItem === item;
        const cls = (isPlaced ? 'placed-hidden' : '') + ' ' + (isSelected ? 'selected' : '');
        itemsHtml += '<div class="drag-card ' + cls + '" draggable="' + (!isPlaced) + '" ondragstart="handleDragStart(event, \\'' + item.replace(/'/g, "\\\\'") + '\\')" onclick="selectItem(\\'' + item.replace(/'/g, "\\\\'") + '\\')"><span class="grip-icon">⠿</span>' + item + '</div>';
      });
      document.getElementById('items-list').innerHTML = itemsHtml;

      // 2. Render drop zones column
      let zonesHtml = '';
      zones.forEach((zone) => {
        const placed = placements[zone];
        if (placed) {
          zonesHtml += '<div class="drop-zone filled"><span style="color:#64748b">' + zone + '</span><span class="dz-item">' + placed + '</span><span class="dz-remove" onclick="removePlaced(event, \\'' + zone.replace(/'/g, "\\\\'") + '\\')">✕</span></div>';
        } else {
          zonesHtml += '<div class="drop-zone" ondragover="allowDrop(event)" ondragleave="handleLeave(event)" ondrop="handleDrop(event, \\'' + zone.replace(/'/g, "\\\\'") + '\\')" onclick="clickZone(\\'' + zone.replace(/'/g, "\\\\'") + '\\')"><span>' + zone + '</span><span style="color:#cbd5e1; font-weight:600; font-size:.78rem">Drop here</span></div>';
        }
      });
      document.getElementById('zones-list').innerHTML = zonesHtml;

      // Report answer to parent
      window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: placements }, '*');
    }

    function selectItem(item) {
      if (Object.values(placements).includes(item)) return;
      selectedItem = selectedItem === item ? null : item;
      render();
    }

    function clickZone(zone) {
      if (!selectedItem) return;
      placements[zone] = selectedItem;
      selectedItem = null;
      render();
    }

    function removePlaced(e, zone) {
      e.stopPropagation();
      delete placements[zone];
      render();
    }

    function handleDragStart(e, item) {
      e.dataTransfer.setData("text/plain", item);
      selectedItem = null;
    }

    function allowDrop(e) {
      e.preventDefault();
      e.currentTarget.classList.add('hovered');
    }

    function handleLeave(e) {
      e.currentTarget.classList.remove('hovered');
    }

    function handleDrop(e, zone) {
      e.preventDefault();
      e.currentTarget.classList.remove('hovered');
      const item = e.dataTransfer.getData("text/plain");
      if (item) {
        // Remove from existing placement if any
        Object.keys(placements).forEach(z => {
          if (placements[z] === item) delete placements[z];
        });
        placements[zone] = item;
        render();
      }
    }

    // Initialize
    render();
  </script>
</body>
</html>`;

const GAME_TAP_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --c-grape: #6C5CE7;
      --c-good: #16B981;
      --c-bad: #F0556B;
      --c-mango: #FF9F43;
      --c-ink-1: #20243A;
      --c-ink-2: #52586F;
      --c-panel: #F6F7FB;
      --c-border: #E5E7F0;
    }
    body {
      font-family: 'Outfit', 'Inter', system-ui, sans-serif;
      color: var(--c-ink-1);
      margin: 0;
      padding: 16px;
      background: transparent;
      text-align: center;
    }
    .title {
      font-size: 1.15rem;
      font-weight: 850;
      margin-bottom: 20px;
    }
    .balance-container {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 10px;
    }
    .number-card {
      width: 150px;
      height: 180px;
      border: 3px solid var(--c-border);
      border-radius: 20px;
      background: #ffffff;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 10px rgba(0,0,0,0.02);
    }
    .number-card:hover {
      transform: translateY(-4px);
      border-color: var(--c-grape);
      box-shadow: 0 10px 20px rgba(108,92,231,0.08);
    }
    .number-card.selected {
      border-color: var(--c-grape);
      background: rgba(108, 92, 231, 0.04);
      box-shadow: 0 10px 25px rgba(108,92,231,0.15);
    }
    .card-digit {
      font-size: 3rem;
      font-weight: 900;
      color: var(--c-ink-1);
      margin-bottom: 12px;
    }
    .dots-grid {
      display: grid;
      grid-template-columns: repeat(3, 14px);
      gap: 6px;
      justify-content: center;
    }
    .dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--c-grape);
    }
  </style>
</head>
<body>
  <div class="title">{{question_text}}</div>
  
  <div class="balance-container">
    <div class="number-card" id="card-A" onclick="selectSide('A')">
      <div class="card-digit" id="val-A">{{numberA}}</div>
      <div class="dots-grid" id="dots-A"></div>
    </div>
    
    <div class="number-card" id="card-B" onclick="selectSide('B')">
      <div class="card-digit" id="val-B">{{numberB}}</div>
      <div class="dots-grid" id="dots-B"></div>
    </div>
  </div>

  <script>
    const numA = {{numberA}};
    const numB = {{numberB}};
    const hideNums = {{hideNumbers}};

    // Hide digit if specified
    if (hideNums) {
      document.getElementById('val-A').style.display = 'none';
      document.getElementById('val-B').style.display = 'none';
    }

    // Render dots
    function renderDots(cardId, num) {
      const container = document.getElementById(cardId);
      container.innerHTML = '';
      for (let i = 0; i < num; i++) {
        const d = document.createElement('div');
        d.className = 'dot';
        container.appendChild(d);
      }
    }
    renderDots('dots-A', numA);
    renderDots('dots-B', numB);

    function selectSide(side) {
      document.querySelectorAll('.number-card').forEach(c => c.classList.remove('selected'));
      document.getElementById('card-' + side).classList.add('selected');
      
      window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: side }, '*');
    }
  </script>
</body>
</html>`;

const GAME_COMPARE_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --c-grape: #6C5CE7;
      --c-ink-1: #20243A;
      --c-ink-2: #52586F;
      --c-panel: #F6F7FB;
      --c-border: #E5E7F0;
    }
    body {
      font-family: 'Outfit', 'Inter', system-ui, sans-serif;
      color: var(--c-ink-1);
      margin: 0;
      padding: 16px;
      background: transparent;
      text-align: center;
    }
    .title {
      font-size: 1.15rem;
      font-weight: 850;
      margin-bottom: 24px;
    }
    .comparison-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-bottom: 30px;
    }
    .num-circle {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: #ffffff;
      border: 3px solid var(--c-border);
      display: grid;
      place-items: center;
      font-size: 2.2rem;
      font-weight: 950;
    }
    .symbol-slot {
      width: 66px;
      height: 66px;
      border: 3.5px dashed var(--c-grape);
      border-radius: 14px;
      background: var(--c-panel);
      display: grid;
      place-items: center;
      font-size: 2.4rem;
      font-weight: 900;
      color: var(--c-grape);
    }
    .symbol-slot.filled {
      border-style: solid;
      background: #ffffff;
    }
    .choices-row {
      display: flex;
      justify-content: center;
      gap: 16px;
    }
    .choice-btn {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      border: 2px solid var(--c-border);
      background: #ffffff;
      font-size: 1.8rem;
      font-weight: 900;
      color: var(--c-ink-2);
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: all 0.2s;
    }
    .choice-btn:hover {
      transform: scale(1.08);
      border-color: var(--c-grape);
      color: var(--c-grape);
    }
    .choice-btn.selected {
      background: var(--c-grape);
      color: #ffffff;
      border-color: var(--c-grape);
    }
  </style>
</head>
<body>
  <div class="title">{{question_text}}</div>
  
  <div class="comparison-row">
    <div class="num-circle">{{numberA}}</div>
    <div class="symbol-slot" id="slot-display">?</div>
    <div class="num-circle">{{numberB}}</div>
  </div>
  
  <div class="choices-row">
    <button class="choice-btn" onclick="selectSymbol('<')" id="btn-lt">&lt;</button>
    <button class="choice-btn" onclick="selectSymbol('=')" id="btn-eq">=</button>
    <button class="choice-btn" onclick="selectSymbol('>')" id="btn-gt">&gt;</button>
  </div>

  <script>
    let selected = null;
    function selectSymbol(sym) {
      selected = sym;
      document.getElementById('slot-display').innerText = sym;
      document.getElementById('slot-display').classList.add('filled');
      
      document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
      if (sym === '<') document.getElementById('btn-lt').classList.add('selected');
      else if (sym === '=') document.getElementById('btn-eq').classList.add('selected');
      else if (sym === '>') document.getElementById('btn-gt').classList.add('selected');
      
      window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: sym }, '*');
    }
  </script>
</body>
</html>`;

const GAME_SORT_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --c-grape: #6C5CE7;
      --c-ink-1: #20243A;
      --c-ink-2: #52586F;
      --c-panel: #F6F7FB;
      --c-border: #E5E7F0;
    }
    body {
      font-family: 'Outfit', 'Inter', system-ui, sans-serif;
      color: var(--c-ink-1);
      margin: 0;
      padding: 16px;
      background: transparent;
      text-align: center;
    }
    .title {
      font-size: 1.15rem;
      font-weight: 850;
      margin-bottom: 24px;
    }
    .sort-row {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 30px;
      min-height: 100px;
    }
    .sort-item {
      padding: 18px 24px;
      background: #ffffff;
      border: 2px solid var(--c-border);
      border-radius: 14px;
      font-size: 2rem;
      font-weight: 900;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sort-item:hover {
      border-color: var(--c-grape);
      transform: translateY(-2px);
    }
    .sort-item.selected {
      background: var(--c-grape);
      color: #ffffff;
      border-color: var(--c-grape);
    }
    .sorted-list {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 10px;
      background: var(--c-panel);
      padding: 16px;
      border-radius: 16px;
      border: 1.5px dashed var(--c-border);
      min-height: 94px;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="title">{{question_text}}</div>
  
  <div style="font-size:0.76rem; color:var(--c-ink-2); margin-bottom:8px">Tap blocks in order from smallest to biggest:</div>
  <div class="sort-row" id="source-row">
    <!-- Unsorted blocks go here -->
  </div>
  
  <div class="sorted-list" id="target-row">
    <!-- Sorted blocks appear here -->
  </div>

  <script>
    const unsortedNumbers = {{numbers}}; // e.g. [7, 2, 5]
    const currentOrder = [];

    function render() {
      // 1. Render Source
      let srcHtml = '';
      unsortedNumbers.forEach((num) => {
        const isPlaced = currentOrder.includes(num);
        if (!isPlaced) {
          srcHtml += '<div class="sort-item" onclick="placeBlock(' + num + ')">' + num + '</div>';
        }
      });
      document.getElementById('source-row').innerHTML = srcHtml;

      // 2. Render Target
      let tgtHtml = '';
      currentOrder.forEach((num) => {
        tgtHtml += '<div class="sort-item selected" onclick="removeBlock(' + num + ')">' + num + '</div>';
      });
      document.getElementById('target-row').innerHTML = tgtHtml;

      // Report answer to parent
      window.parent.postMessage({ type: 'EDUQUEST_ANSWER', answer: [...currentOrder] }, '*');
    }

    function placeBlock(num) {
      if (currentOrder.includes(num)) return;
      currentOrder.push(num);
      render();
    }

    function removeBlock(num) {
      const idx = currentOrder.indexOf(num);
      if (idx !== -1) {
        currentOrder.splice(idx, 1);
        render();
      }
    }

    // Initialize
    render();
  </script>
</body>
</html>`;

async function seedData() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("Seeding question_templates...");
    
    // Seed MCQ Template
    const mcqRes = await client.query(`
      INSERT INTO public.question_templates (slug, grade, topic, subtopic, learning_objective, interaction_type, difficulty, template_html, props_schema, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET template_html = EXCLUDED.template_html, props_schema = EXCLUDED.props_schema
      RETURNING id;
    `, [
      "position-mcq-v1",
      6, // Grade 6 for standard Science
      "Position & Direction",
      "Directional Vocabulary",
      "Differentiate between directional terms",
      "mcq",
      "easy",
      MCQ_TEMPLATE_HTML,
      JSON.stringify({
        type: "object",
        properties: {
          question_text: { type: "string" },
          option_0: { type: "string" },
          option_1: { type: "string" },
          option_2: { type: "string" },
          option_3: { type: "string" }
        },
        required: ["question_text", "option_0", "option_1", "option_2", "option_3"]
      }),
      "active"
    ]);
    const mcqTemplateId = mcqRes.rows[0].id;

    // Seed Fill Template
    const fillRes = await client.query(`
      INSERT INTO public.question_templates (slug, grade, topic, subtopic, learning_objective, interaction_type, difficulty, template_html, props_schema, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET template_html = EXCLUDED.template_html, props_schema = EXCLUDED.props_schema
      RETURNING id;
    `, [
      "position-fill-v1",
      6,
      "Position & Direction",
      "Calculation",
      "Compute acceleration and force vectors",
      "fill",
      "medium",
      FILL_TEMPLATE_HTML,
      JSON.stringify({
        type: "object",
        properties: {
          question_text: { type: "string" },
          unit: { type: "string" },
          hint: { type: "string" }
        },
        required: ["question_text", "unit", "hint"]
      }),
      "active"
    ]);
    const fillTemplateId = fillRes.rows[0].id;

    // Seed Blanks Template
    const blanksRes = await client.query(`
      INSERT INTO public.question_templates (slug, grade, topic, subtopic, learning_objective, interaction_type, difficulty, template_html, props_schema, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET template_html = EXCLUDED.template_html, props_schema = EXCLUDED.props_schema
      RETURNING id;
    `, [
      "position-blanks-v1",
      6,
      "Position & Direction",
      "Conceptual Fill",
      "Identify the missing terminology in Newton's laws",
      "blanks",
      "medium",
      BLANKS_TEMPLATE_HTML,
      JSON.stringify({
        type: "object",
        properties: {
          sentence: { type: "string" },
          wordBank: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["sentence", "wordBank"]
      }),
      "active"
    ]);
    const blanksTemplateId = blanksRes.rows[0].id;

    // Seed Drag Template
    const dragRes = await client.query(`
      INSERT INTO public.question_templates (slug, grade, topic, subtopic, learning_objective, interaction_type, difficulty, template_html, props_schema, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET template_html = EXCLUDED.template_html, props_schema = EXCLUDED.props_schema
      RETURNING id;
    `, [
      "position-drag-v1",
      6,
      "Position & Direction",
      "Matching Pairs",
      "Match terms to their correct definitions",
      "drag",
      "hard",
      DRAG_TEMPLATE_HTML,
      JSON.stringify({
        type: "object",
        properties: {
          question_text: { type: "string" },
          pairs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                zone: { type: "string" }
              },
              required: ["item", "zone"]
            }
          }
        },
        required: ["question_text", "pairs"]
      }),
      "active"
    ]);
    const dragTemplateId = dragRes.rows[0].id;

    // Seed Math Game Tap Template
    const gameTapRes = await client.query(`
      INSERT INTO public.question_templates (slug, grade, topic, subtopic, learning_objective, interaction_type, difficulty, template_html, props_schema, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET template_html = EXCLUDED.template_html, props_schema = EXCLUDED.props_schema
      RETURNING id;
    `, [
      "math-game-tap-v1",
      0, // KG
      "Comparing Numbers",
      "Visual Comparison",
      "Identify the larger number using count cues",
      "game-tap",
      "easy",
      GAME_TAP_TEMPLATE_HTML,
      JSON.stringify({
        type: "object",
        properties: {
          question_text: { type: "string" },
          numberA: { type: "number" },
          numberB: { type: "number" },
          hideNumbers: { type: "boolean" }
        },
        required: ["question_text", "numberA", "numberB", "hideNumbers"]
      }),
      "active"
    ]);
    const gameTapTemplateId = gameTapRes.rows[0].id;

    // Seed Math Game Compare Template
    const gameCompareRes = await client.query(`
      INSERT INTO public.question_templates (slug, grade, topic, subtopic, learning_objective, interaction_type, difficulty, template_html, props_schema, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET template_html = EXCLUDED.template_html, props_schema = EXCLUDED.props_schema
      RETURNING id;
    `, [
      "math-game-compare-v1",
      0, // KG
      "Comparing Numbers",
      "Comparison Symbols",
      "Select correct comparison signs (>, <, =)",
      "game-compare",
      "medium",
      GAME_COMPARE_TEMPLATE_HTML,
      JSON.stringify({
        type: "object",
        properties: {
          question_text: { type: "string" },
          numberA: { type: "number" },
          numberB: { type: "number" }
        },
        required: ["question_text", "numberA", "numberB"]
      }),
      "active"
    ]);
    const gameCompareTemplateId = gameCompareRes.rows[0].id;

    // Seed Math Game Sort Template
    const gameSortRes = await client.query(`
      INSERT INTO public.question_templates (slug, grade, topic, subtopic, learning_objective, interaction_type, difficulty, template_html, props_schema, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET template_html = EXCLUDED.template_html, props_schema = EXCLUDED.props_schema
      RETURNING id;
    `, [
      "math-game-sort-v1",
      0, // KG
      "Comparing Numbers",
      "Sorting Order",
      "Arrange numbers from smallest to largest",
      "game-sort",
      "hard",
      GAME_SORT_TEMPLATE_HTML,
      JSON.stringify({
        type: "object",
        properties: {
          question_text: { type: "string" },
          numbers: {
            type: "array",
            items: { type: "number" }
          }
        },
        required: ["question_text", "numbers"]
      }),
      "active"
    ]);
    const gameSortTemplateId = gameSortRes.rows[0].id;

    console.log("Seeding question_variations...");

    // Helper to seed variations safely
    const seedVariation = async (templateId: string, index: number, variationData: any, answerKey: any, difficulty: string, locale: string, status: string, topic: string) => {
      // Fetch topic/details from template to make it consistent
      await client.query(`
        INSERT INTO public.question_variations (template_id, variation_index, variation_data, answer_key, difficulty, locale, status, verifier_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'verified')
        ON CONFLICT (template_id, variation_index) DO UPDATE 
        SET variation_data = EXCLUDED.variation_data, answer_key = EXCLUDED.answer_key, status = EXCLUDED.status, verifier_status = 'verified';
      `, [templateId, index, JSON.stringify(variationData), JSON.stringify(answerKey), difficulty, locale, status]);
    };

    // --- SCIENCE VARIATIONS ---
    // Newton's 1st Law (lo1) MCQ
    await seedVariation(mcqTemplateId, 1, {
      question_text: "Which of Newton's laws says an object at rest stays at rest unless a force acts on it?",
      option_0: "First Law",
      option_1: "Second Law",
      option_2: "Third Law",
      option_3: "Law of Gravity"
    }, { correct: 0 }, "easy", "en-IN", "active", "lo1");

    // Newton's 3rd Law (lo3) MCQ
    await seedVariation(mcqTemplateId, 2, {
      question_text: "A swimmer pushes water backward with her hands. What is the reaction force?",
      option_0: "Gravity pulling down",
      option_1: "Water pushing her forward",
      option_2: "Her kick",
      option_3: "The wall"
    }, { correct: 1 }, "easy", "en-IN", "active", "lo3");

    // Inertia (lo4) MCQ
    await seedVariation(mcqTemplateId, 3, {
      question_text: "A heavy truck and a bicycle move at the same speed. Which is harder to stop?",
      option_0: "Bicycle — less friction",
      option_1: "Truck — more inertia from mass",
      option_2: "They're equal",
      option_3: "Truck — stronger engine"
    }, { correct: 1 }, "easy", "en-IN", "active", "lo4");

    // Newton's 1st Law (lo1) MCQ 2
    await seedVariation(mcqTemplateId, 4, {
      question_text: "What is another common name for Newton's First Law of Motion?",
      option_0: "Law of Inertia",
      option_1: "Law of Acceleration",
      option_2: "Law of Action-Reaction",
      option_3: "Law of Gravity"
    }, { correct: 0 }, "easy", "en-IN", "active", "lo1");

    // F=ma (lo2) Fill
    await seedVariation(fillTemplateId, 1, {
      question_text: "A 5 kg box is pushed with 20 N of force. What is its acceleration?",
      unit: "m/s²",
      hint: "Use F = ma → a = F ÷ m"
    }, { correct: "4" }, "medium", "en-IN", "active", "lo2");

    // F=ma (lo2) Fill 2
    await seedVariation(fillTemplateId, 2, {
      question_text: "If Force = mass × ___, fill in the missing term.",
      unit: "",
      hint: "The second part of F = ma"
    }, { correct: "acceleration" }, "medium", "en-IN", "active", "lo2");

    // F=ma (lo2) Fill 3
    await seedVariation(fillTemplateId, 3, {
      question_text: "A 500 kg rocket has 10,000 N thrust up and 4,900 N gravity down. What is the net upward force?",
      unit: "N",
      hint: "Net force = thrust − gravity"
    }, { correct: "5100" }, "medium", "en-IN", "active", "lo2");

    // Inertia (lo4) Fill
    await seedVariation(fillTemplateId, 4, {
      question_text: "The tendency of an object to resist changes in its state of motion is called ___.",
      unit: "",
      hint: "It starts with the letter I"
    }, { correct: "inertia" }, "medium", "en-IN", "active", "lo4");

    // Action-Reaction (lo3) Blanks
    await seedVariation(blanksTemplateId, 1, {
      sentence: "For every {___}, there is an equal and opposite {___}.",
      wordBank: ["force", "action", "motion", "reaction"]
    }, { correct: ["action", "reaction"] }, "medium", "en-IN", "active", "lo3");

    // Inertia (lo4) Blanks
    await seedVariation(blanksTemplateId, 2, {
      sentence: "An object in {___} stays in motion unless acted on by a {___}.",
      wordBank: ["motion", "force", "speed", "gravity"]
    }, { correct: ["motion", "force"] }, "medium", "en-IN", "active", "lo4");

    // Action-Reaction (lo3) Blanks 2
    await seedVariation(blanksTemplateId, 3, {
      sentence: "When you jump off a small boat, you push the boat {___} and you move {___}.",
      wordBank: ["forward", "backward", "downward", "upward"]
    }, { correct: ["backward", "forward"] }, "medium", "en-IN", "active", "lo3");

    // Newton's 1st Law (lo1) Drag Matching
    await seedVariation(dragTemplateId, 1, {
      question_text: "Match each law to its key concept:",
      pairs: [
        { item: "First Law", zone: "Inertia" },
        { item: "Second Law", zone: "F = ma" },
        { item: "Third Law", zone: "Action–Reaction" }
      ]
    }, { correct: { "Inertia": "First Law", "F = ma": "Second Law", "Action–Reaction": "Third Law" } }, "hard", "en-IN", "active", "lo1");

    // F=ma (lo2) Drag Matching
    await seedVariation(dragTemplateId, 2, {
      question_text: "Match the mass and acceleration to the resulting net force (F = ma):",
      pairs: [
        { item: "Mass 2 kg, Accel 3 m/s²", zone: "Force = 6 N" },
        { item: "Mass 10 kg, Accel 2 m/s²", zone: "Force = 20 N" },
        { item: "Mass 5 kg, Accel 5 m/s²", zone: "Force = 25 N" }
      ]
    }, { correct: { "Force = 6 N": "Mass 2 kg, Accel 3 m/s²", "Force = 20 N": "Mass 10 kg, Accel 2 m/s²", "Force = 25 N": "Mass 5 kg, Accel 5 m/s²" } }, "hard", "en-IN", "active", "lo2");

    // Action-Reaction (lo3) Drag Matching
    await seedVariation(dragTemplateId, 3, {
      question_text: "Match each example to the correct Newton's Law:",
      pairs: [
        { item: "Bus stops → passengers lurch", zone: "First Law" },
        { item: "Rocket accelerating upward", zone: "Second Law" },
        { item: "Walking (push ground back)", zone: "Third Law" }
      ]
    }, { correct: { "First Law": "Bus stops → passengers lurch", "Second Law": "Rocket accelerating upward", "Third Law": "Walking (push ground back)" } }, "hard", "en-IN", "active", "lo3");


    // --- MATH VARIATIONS (KG comparing numbers) ---
    // Tap Bigger
    await seedVariation(gameTapTemplateId, 1, {
      question_text: "Which side has more? Tap the bigger number!",
      numberA: 8,
      numberB: 7,
      hideNumbers: true
    }, { correct: "A" }, "easy", "en-IN", "active", "kg-comparing-numbers");

    await seedVariation(gameTapTemplateId, 2, {
      question_text: "Count the dots! Which side has more?",
      numberA: 8,
      numberB: 9,
      hideNumbers: true
    }, { correct: "B" }, "easy", "en-IN", "active", "kg-comparing-numbers");

    await seedVariation(gameTapTemplateId, 3, {
      question_text: "Count carefully! Which side has more dots?",
      numberA: 7,
      numberB: 8,
      hideNumbers: true
    }, { correct: "B" }, "easy", "en-IN", "active", "kg-comparing-numbers");

    // Compare Alligator
    await seedVariation(gameCompareTemplateId, 1, {
      question_text: "The alligator is hungry and wants to eat the bigger number! Which symbol goes between 5 and 4?",
      numberA: 5,
      numberB: 4
    }, { correct: ">" }, "medium", "en-IN", "active", "kg-comparing-numbers");

    await seedVariation(gameCompareTemplateId, 2, {
      question_text: "The alligator is hungry and wants to eat the bigger number! Which symbol goes between 7 and 8?",
      numberA: 7,
      numberB: 8
    }, { correct: "<" }, "medium", "en-IN", "active", "kg-comparing-numbers");

    await seedVariation(gameCompareTemplateId, 3, {
      question_text: "Wow, both numbers look the same! Which symbol shows they are equal?",
      numberA: 6,
      numberB: 6
    }, { correct: "=" }, "medium", "en-IN", "active", "kg-comparing-numbers");

    // Sort blocks
    await seedVariation(gameSortTemplateId, 1, {
      question_text: "Sort the number blocks from SMALLEST to BIGGEST to build the tall tower!",
      numbers: [7, 2, 5]
    }, { correct: [2, 5, 7] }, "hard", "en-IN", "active", "kg-comparing-numbers");

    await seedVariation(gameSortTemplateId, 2, {
      question_text: "Sort the number blocks from SMALLEST to BIGGEST to build the tall tower!",
      numbers: [9, 4, 6]
    }, { correct: [4, 6, 9] }, "hard", "en-IN", "active", "kg-comparing-numbers");

    await seedVariation(gameSortTemplateId, 3, {
      question_text: "Sort the number blocks from SMALLEST to BIGGEST to build the tall tower!",
      numbers: [6, 2, 8, 4]
    }, { correct: [2, 4, 6, 8] }, "hard", "en-IN", "active", "kg-comparing-numbers");

    // We can update the template topic/subtopic details for the math items to match
    await client.query(`
      UPDATE public.question_templates 
      SET topic = 'Comparing Numbers', subtopic = 'Comparing' 
      WHERE slug IN ('math-game-tap-v1', 'math-game-compare-v1', 'math-game-sort-v1');
    `);

    // Let's also create templates and variations for Intro to Fractions (g3-intro-fractions) and Pythagoras (g7-pythagoras)
    // to give rich coverage for grade levels. We can use standard MCQ / Fill / Blanks / Drag templates.
    
    // G3 fractions MCQ
    await seedVariation(mcqTemplateId, 5, {
      question_text: "If a pizza is cut into 8 equal slices and you eat 3 of them, what fraction of the pizza did you eat?",
      option_0: "3/5",
      option_1: "5/8",
      option_2: "3/8",
      option_3: "8/3"
    }, { correct: 2 }, "easy", "en-IN", "active", "g3-intro-fractions");

    // G7 Pythagoras MCQ
    await seedVariation(mcqTemplateId, 6, {
      question_text: "In a right triangle, if side a = 3 and side b = 4, what is the length of the hypotenuse c?",
      option_0: "5",
      option_1: "7",
      option_2: "12",
      option_3: "25"
    }, { correct: 0 }, "easy", "en-IN", "active", "g7-pythagoras");

    // G3 Fractions Fill
    await seedVariation(fillTemplateId, 5, {
      question_text: "In the fraction 3/4, what do we call the top number '3'?",
      unit: "",
      hint: "It starts with N! It is the opposite of denominator."
    }, { correct: "numerator" }, "medium", "en-IN", "active", "g3-intro-fractions");

    // G7 Pythagoras Fill
    await seedVariation(fillTemplateId, 6, {
      question_text: "In a right triangle, what is the special name given to the longest side opposite the 90-degree angle?",
      unit: "",
      hint: "It starts with H and is the longest side of a right triangle."
    }, { correct: "hypotenuse" }, "medium", "en-IN", "active", "g7-pythagoras");

    // G3 Fractions Blanks
    await seedVariation(blanksTemplateId, 5, {
      sentence: "The top part of a fraction is the {___}, and the bottom part is the {___}.",
      wordBank: ["denominator", "division", "numerator", "slice"]
    }, { correct: ["numerator", "denominator"] }, "medium", "en-IN", "active", "g3-intro-fractions");

    // G7 Pythagoras Blanks
    await seedVariation(blanksTemplateId, 6, {
      sentence: "Pythagoras' Theorem is written as a² + b² = {___}, where the letter c represents the {___}.",
      wordBank: ["c²", "c", "hypotenuse", "triangle"]
    }, { correct: ["c²", "hypotenuse"] }, "medium", "en-IN", "active", "g7-pythagoras");

    // G3 Fractions Drag Matching
    await seedVariation(dragTemplateId, 5, {
      question_text: "Match each fraction with its visual description:",
      pairs: [
        { item: "1/2", zone: "Half a pizza" },
        { item: "1/4", zone: "Quarter a pizza" },
        { item: "4/4", zone: "One whole pizza" }
      ]
    }, { correct: { "Half a pizza": "1/2", "Quarter a pizza": "1/4", "One whole pizza": "4/4" } }, "hard", "en-IN", "active", "g3-intro-fractions");

    // G7 Pythagoras Drag Matching
    await seedVariation(dragTemplateId, 6, {
      question_text: "Match the right triangle side lengths (a, b) with their correct hypotenuse length (c):",
      pairs: [
        { item: "3 and 4", zone: "Hypotenuse: 5" },
        { item: "6 and 8", zone: "Hypotenuse: 10" },
        { item: "5 and 12", zone: "Hypotenuse: 13" }
      ]
    }, { correct: { "Hypotenuse: 5": "3 and 4", "Hypotenuse: 10": "6 and 8", "Hypotenuse: 13": "5 and 12" } }, "hard", "en-IN", "active", "g7-pythagoras");

    // Set G3 & G7 templates topic focus appropriately for query join mapping
    await client.query(`
      UPDATE public.question_templates 
      SET topic = 'Introduction to Fractions', subtopic = 'Fractions', grade = 3
      WHERE id IN (
        SELECT template_id FROM public.question_variations WHERE id IN (
          SELECT id FROM public.question_variations 
          WHERE variation_data->>'question_text' LIKE '%pizza%' OR variation_data->>'sentence' LIKE '%fraction%'
        )
      );
    `);

    await client.query(`
      UPDATE public.question_templates 
      SET topic = 'Pythagoras Theorem', subtopic = 'Pythagoras', grade = 7
      WHERE id IN (
        SELECT template_id FROM public.question_variations WHERE id IN (
          SELECT id FROM public.question_variations 
          WHERE variation_data->>'question_text' LIKE '%triangle%' OR variation_data->>'sentence' LIKE '%Pythagoras%'
        )
      );
    `);

    // Let's align all science variation topics
    await client.query(`
      UPDATE public.question_templates 
      SET topic = 'Position & Direction', subtopic = 'Physics'
      WHERE slug IN ('position-mcq-v1', 'position-fill-v1', 'position-blanks-v1', 'position-drag-v1');
    `);

    await client.query("COMMIT");
    console.log("✅ Database successfully seeded with templates and variations!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding database:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedData();
