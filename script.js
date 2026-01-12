const DEFAULT_WORDS = [
  { word: "neuron", meaning: "神经元" },
  { word: "overload", meaning: "超载" },
  { word: "juggle", meaning: "同时应付好几件事" },
  { word: "tone-deaf", meaning: "音痴的" },
  { word: "empathic", meaning: "有同感的" },
];

const STORAGE_KEY = "flashcard_words_v1";

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

const flashcard = document.getElementById("flashcard");
const wordEl = document.getElementById("word");
const meaningEl = document.getElementById("meaning");

function render() {
  if (!words.length) {
    wordEl.textContent = "（空）";
    meaningEl.textContent = "请导入单词表";
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

// 基础按钮
document.getElementById("prev").onclick = () => { i = (i - 1 + words.length) % words.length; render(); };
document.getElementById("next").onclick = () => { i = (i + 1) % words.length; render(); };
document.getElementById("flip").onclick = flip;
flashcard.onclick = flip;

// ====== 导入/追加/导出 ======
const bulkInput = document.getElementById("bulkInput");
const msgEl = document.getElementById("importMsg");

function showMsg(text) {
  if (!msgEl) return;
  msgEl.textContent = text;
}

function parseLinesToWords(text) {
  const lines = text
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

  const out = [];
  for (const line of lines) {
    // 支持：
    // neuron - 神经元
    // 1-neuron-神经元
    // tone-deaf — 音痴的
    // 用各种分隔符尝试拆分：- / — / – / :
    let s = line;

    // 去掉开头序号： 1.  / 1、 / 1- 之类
    s = s.replace(/^\s*\d+\s*[\.\、\-\)]\s*/, "");

    // 如果是 1-neuron-神经元 这种，可能会拆出多个段
    // 我们策略：取第一个“像单词的部分”当 word，最后一段当 meaning
    const parts = s.split(/\s*(?:—|–|:|-)\s*/).filter(Boolean);

    if (parts.length >= 2) {
      const word = parts[0].trim();
      const meaning = parts.slice(1).join(" - ").trim();
      if (word && meaning) out.push({ word, meaning });
    }
  }
  return out;
}

const replaceBtn = document.getElementById("replaceList");
const appendBtn = document.getElementById("appendList");
const exportBtn = document.getElementById("exportList");

if (replaceBtn && appendBtn && exportBtn && bulkInput) {
  replaceBtn.onclick = () => {
    const newList = parseLinesToWords(bulkInput.value);
    if (!newList.length) return showMsg("没有识别到任何有效行（每行要有 单词 + 含义）。");
    words = newList;
    i = 0;
    saveWords(words);
    render();
    showMsg(`✅ 已覆盖导入：${words.length} 条`);
  };

  appendBtn.onclick = () => {
    const addList = parseLinesToWords(bulkInput.value);
    if (!addList.length) return showMsg("没有识别到任何有效行（每行要有 单词 + 含义）。");
    words = words.concat(addList);
    saveWords(words);
    render();
    showMsg(`✅ 已追加：+${addList.length} 条（当前共 ${words.length} 条）`);
  };

  exportBtn.onclick = async () => {
    const text = words.map(x => `${x.word} - ${x.meaning}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showMsg("✅ 已复制到剪贴板（你可以粘贴到任何地方保存）");
    } catch {
      // 复制失败时，放回输入框
      bulkInput.value = text;
      showMsg("已生成导出内容（复制输入框里的文本即可）。");
    }
  };
}

render();
