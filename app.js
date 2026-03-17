let words = [];
let currentTrainingSet = [];
let currentWord = null;
let dictionaryVisibleCount = 100;

const statsKey = "dictionary_stats_v1";
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let stats = loadStats();

fetch("./words.json")
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(data => {
    words = data;   // весь словарь
    renderDictionary();
    renderStats();
  })
  .catch(err => {
    console.error("Ошибка загрузки words.json:", err);
  });

function loadStats() {
  try {
    const raw = localStorage.getItem(statsKey);
    if (!raw) {
      return {
        total: 0,
        known: 0,
        unknown: 0,
        hardWords: {}
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      total: 0,
      known: 0,
      unknown: 0,
      hardWords: {}
    };
  }
}

function saveStats() {
  localStorage.setItem(statsKey, JSON.stringify(stats));
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === tabName);
  });

  if (tabName === "stats") {
    renderStats();
  }
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function getFilteredDictionaryWords() {
  const q = document.getElementById("search").value.toLowerCase().trim();
  const level = document.getElementById("levelFilter").value;
  const type = document.getElementById("typeFilter").value;

  return words.filter(w => {
    const matchesQuery =
      String(w.english).toLowerCase().includes(q) ||
      String(w.greek).toLowerCase().includes(q);

    const matchesLevel = level === "ALL" ? true : w.level === level;
    const matchesType = type === "ALL" ? true : w.type === type;

    return matchesQuery && matchesLevel && matchesType;
  });
}

function renderDictionary(reset = true) {
  const list = document.getElementById("list");
  const q = document.getElementById("search").value.toLowerCase().trim();
  const level = document.getElementById("levelFilter").value;
  const type = document.getElementById("typeFilter").value;

  if (reset) {
    dictionaryVisibleCount = 100;
  }

  const allFiltered = words.filter(w => {
    const matchesQuery =
      String(w.english).toLowerCase().includes(q) ||
      String(w.greek).toLowerCase().includes(q);

    const matchesLevel = level === "ALL" ? true : w.level === level;
    const matchesType = type === "ALL" ? true : w.type === type;

    return matchesQuery && matchesLevel && matchesType;
  });

  const filtered = allFiltered.slice(0, dictionaryVisibleCount);

  list.innerHTML = "";

  if (allFiltered.length === 0) {
    list.innerHTML = `<div class="card">No words found</div>`;
    return;
  }

  const info = document.createElement("div");
  info.className = "card";
  info.textContent = `Found: ${allFiltered.length}. Showing ${filtered.length}.`;
  list.appendChild(info);

  const fragment = document.createDocumentFragment();

  filtered.forEach(w => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <div><b>${escapeHtml(w.english)}</b></div>
      <div>${escapeHtml(w.greek)}</div>
      <div class="muted">${escapeHtml(w.level)} • ${escapeHtml(w.type || "")}</div>
	  <button onclick="speak('${w.greek}', 'el-GR')">🔊</button>
    `;

    fragment.appendChild(div);
  });

  list.appendChild(fragment);

  if (dictionaryVisibleCount < allFiltered.length) {
    const moreBtn = document.createElement("button");
    moreBtn.textContent = "Load more";
    moreBtn.addEventListener("click", () => {
      dictionaryVisibleCount += 100;
      renderDictionary(false);
    });
    list.appendChild(moreBtn);
  }
}

document.getElementById("search").addEventListener("input", () => renderDictionary(true));
document.getElementById("levelFilter").addEventListener("change", () => renderDictionary(true));
document.getElementById("typeFilter").addEventListener("change", () => renderDictionary(true));

document.getElementById("startTraining").addEventListener("click", () => {
  const level = document.getElementById("trainLevel").value;
  const type = document.getElementById("trainType").value;

  currentTrainingSet = words.filter(w => {
    const matchesLevel = level === "ALL" ? true : w.level === level;
    const matchesType = type === "ALL" ? true : w.type === type;
    return matchesLevel && matchesType;
  });

  if (currentTrainingSet.length === 0) {
    alert("No words for selected filters");
    return;
  }

  document.getElementById("trainingCard").classList.remove("hidden");
  nextTrainingWord();
});

function speak(text, lang="el-GR") {

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  speechSynthesis.speak(utterance);

}

function nextTrainingWord() {
  const mode = document.getElementById("trainMode").value;
  const randomIndex = Math.floor(Math.random() * currentTrainingSet.length);
  currentWord = currentTrainingSet[randomIndex];

  document.getElementById("answerBlock").classList.add("hidden");

  if (mode === "en-gr") {
    document.getElementById("question").textContent = currentWord.english;
    document.getElementById("answer").textContent = `${currentWord.greek} (${currentWord.level} • ${currentWord.type})`;
  } else {
    document.getElementById("question").textContent = currentWord.greek;
    document.getElementById("answer").textContent = `${currentWord.english} (${currentWord.level} • ${currentWord.type})`;
  }
}

document.getElementById("showAnswer").addEventListener("click", () => {
  document.getElementById("answerBlock").classList.remove("hidden");
});

document.getElementById("know").addEventListener("click", () => {
  stats.total += 1;
  stats.known += 1;
  saveStats();
  renderStats();
  nextTrainingWord();
});

document.getElementById("dontKnow").addEventListener("click", () => {
  stats.total += 1;
  stats.unknown += 1;

  const key = `${currentWord.english} — ${currentWord.greek}`;
  stats.hardWords[key] = (stats.hardWords[key] || 0) + 1;

  saveStats();
  renderStats();
  nextTrainingWord();
});

function renderStats() {
  document.getElementById("statTotal").textContent = stats.total;
  document.getElementById("statKnown").textContent = stats.known;
  document.getElementById("statUnknown").textContent = stats.unknown;

  const rate = stats.total === 0
    ? 0
    : Math.round((stats.known / stats.total) * 100);

  document.getElementById("statRate").textContent = `${rate}%`;

  const hardWords = Object.entries(stats.hardWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const container = document.getElementById("hardWords");

  if (hardWords.length === 0) {
    container.textContent = "No data yet";
    return;
  }

  container.innerHTML = hardWords
    .map(([word, count]) => `${escapeHtml(word)} — ${count}`)
    .join("<br>");
}

document.getElementById("resetStats").addEventListener("click", () => {
  stats = {
    total: 0,
    known: 0,
    unknown: 0,
    hardWords: {}
  };
  saveStats();
  renderStats();
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}