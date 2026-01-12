const DEFAULT_WORDS = [
  { word: "neuron", meaning: "神经元" },
  { word: "overload", meaning: "超载" },
  { word: "juggle", meaning: "同时应付好几件事" },
  { word: "tone-deaf", meaning: "音痴的" },
  { word: "empathic", meaning: "有同感的" },
];

const STORAGE_KEY = "flashcard_words_v2";

function loadWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WORDS.slice();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
    return DEFAULT_WORDS.slice();
  } catch {
    return DEFAULT_WORDS.slice();
  }
}

function saveWords(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

let words = loadWords();
let i = 0;

// ====== DOM ======
const modeWordsBtn = document.getElementById("modeWords");
const modeImportBtn = document.getElementById("modeImport");
const importPanel = document.getElementById("importPanel");
const wordsPanel = document.getElementById("wordsPanel");

const flashcard = document.getElementById("flashcard");
const wordEl = document.getElementById("word");
const meaningEl = document.getElementById("meaning");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const flipBtn = document.getElementById("flip");

const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const msgEl = document.getElementById("importMsg");

const replaceBtn = document.getElementById("replaceFromFile");
const appendBtn = document.getElementById("appendFromFile");
const exportBtn = document.getElementById("exportToFile");
const templateBtn = document.getElementById("downloadTemplate");
const resetBtn = document.getElementById("resetDefault");

function showMsg(text) {
  if (msgEl) msgEl.textContent = text || "";
}

function setMode(mode) {
  const isWords = mode === "words";
  modeWordsBtn.classList.toggle("active", isWords);
  modeImportBtn.classList.toggle("active", !isWords);

  wordsPanel.classList.toggle("hidden", !isWords);
  importPanel.classList.toggle("hidden", isWords);

  showMsg("");
}

// ====== Flashcard ======
function render() {
  if (!words.length) {
    wordEl.textContent = "（空）";
    meaningEl.textContent = "请在“导入模式”导入单词";
    flashcard.classList.remove("flipped");
    return;
  }
  i = (i + words.length) % words.length;
  wordEl.textContent = words[i].word;
  meaningEl.textContent = words[i].meaning;
  flashcard.classList.remove("flipped");
}

function flip() {
  flashcard.classList.toggle("flipped");
}

prevBtn.onclick = () => { if (!words.length) return; i = (i - 1 + words.length) % words.length; render(); };
nextBtn.onclick = () => { if (!words.length) return; i = (i + 1) % words.length; render(); };
flipBtn.onclick = flip;
flashcard.onclick = flip;

// ====== File import helpers ======
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}

function looksLikeHeader(a, b) {
  const x = String(a || "").toLowerCase();
  const y = String(b || "").toLowerCase();
  const headerWords = ["word", "meaning", "definition", "释义", "含义", "单词"];
  return headerWords.some(k => x.includes(k)) && headerWords.some(k => y.includes(k));
}

function parseTextToWords(text) {
  const lines = text
    .replace(/\uFEFF/g, "") // BOM
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

  const out = [];

  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx];

    // 去掉行首序号：1. / 1、 / 1- / 1) 等
    line = line.replace(/^\s*\d+\s*[\.\、\-\)]\s*/, "");

    // 优先：tab 分列
    let parts = line.split("\t").map(s => s.trim()).filter(Boolean);

    // 其次：CSV 逗号分列（只分成两列，避免含义里也有逗号）
    if (parts.length < 2 && line.includes(",")) {
      const p = line.split(",");
      if (p.length >= 2) {
        parts = [p[0].trim(), p.slice(1).join(",").trim()];
      }
    }

    // 再其次：常见连接符（— – - :）
    if (parts.length < 2) {
      const p = line.split(/\s*(?:—|–|:|-)\s*/).filter(Boolean);
      if (p.length >= 2) parts = [p[0].trim(), p.slice(1).join(" - ").trim()];
    }

    if (parts.length >= 2) {
      const w = parts[0];
      const m = parts[1];

      // 跳过表头
      if (idx === 0 && looksLikeHeader(w, m)) continue;

      if (w && m) out.push({ word: w, meaning: m });
    }
  }

  return out;
}

let selectedFile = null;
let selectedText = "";

async function loadSelectedFile(file) {
  selectedFile = file;
  selectedText = await readFileAsText(file);
  showMsg(`已选择文件：${file.name}（${selectedText.length} 字符）`);
}

// 拖拽交互
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file) return;
  await loadSelectedFile(file);
});

// 点击选择文件
fileInput.addEventListener("change", async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  await loadSelectedFile(file);
});

function applyImport(mode) {
  if (!selectedFile || !selectedText) {
    showMsg("请先选择/拖拽一个文件。");
    return;
  }
  const parsed = parseTextToWords(selectedText);
  if (!parsed.length) {
    showMsg("没有识别到有效内容：请确保每行至少包含“单词 + 含义”（两列）。");
    return;
  }

  if (mode === "replace") {
    words = parsed;
    i = 0;
    saveWords(words);
    render();
    showMsg(`✅ 覆盖导入成功：${words.length} 条`);
  } else {
    words = words.concat(parsed);
    saveWords(words);
    render();
    showMsg(`✅ 追加导入成功：+${parsed.length} 条（当前 ${words.length} 条）`);
  }
}

replaceBtn.onclick = () => applyImport("replace");
appendBtn.onclick = () => applyImport("append");

resetBtn.onclick = () => {
  words = DEFAULT_WORDS.slice();
  i = 0;
  saveWords(words);
  render();
  showMsg("已恢复示例单词。");
};

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

templateBtn.onclick = () => {
  const tpl = [
    "word\tmeaning",
    "neuron\t神经元",
    "tone-deaf\t音痴的",
    "juggle\t同时应付好几件事"
  ].join("\n");
  downloadText("words_template.tsv", tpl);
  showMsg("已下载模板（TSV）。");
};

exportBtn.onclick = () => {
  const text = ["word\tmeaning"]
    .concat(words.map(x => `${x.word}\t${x.meaning}`))
    .join("\n");
  downloadText("my_words.tsv", text);
  showMsg("已导出当前列表（TSV）。");
};

// ====== Mode buttons ======
modeWordsBtn.onclick = () => setMode("words");
modeImportBtn.onclick = () => setMode("import");

// 初始化
setMode("words");
render();
