const words = [
  { word: "neuron", meaning: "神经元" },
  { word: "overload", meaning: "超载" },
  { word: "juggle", meaning: "同时应付好几件事" },
  { word: "tone-deaf", meaning: "音痴的" },
  { word: "empathic", meaning: "有同感的" },
];

let i = 0;
const flashcard = document.getElementById("flashcard");
const wordEl = document.getElementById("word");
const meaningEl = document.getElementById("meaning");

function render() {
  wordEl.textContent = words[i].word;
  meaningEl.textContent = words[i].meaning;
  flashcard.classList.remove("flipped");
}

function flip() {
  flashcard.classList.toggle("flipped");
}

document.getElementById("prev").onclick = () => { i = (i - 1 + words.length) % words.length; render(); };
document.getElementById("next").onclick = () => { i = (i + 1) % words.length; render(); };
document.getElementById("flip").onclick = flip;
flashcard.onclick = flip;

render();
