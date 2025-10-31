const quotes = [
  'When you have eliminated the impossible, whatever remains, however improbable, must be the truth.',
  'There is nothing more deceptive than an obvious fact.',
  'I never make exceptions. An exception disproves the rule.',
  'What one man can invent another can discover.',
  'Education never ends, Watson. It is a series of lessons, with the greatest for the last.'
];

let words = [];
let wordIndex = 0;
let startTime = 0;

const quoteElement = document.getElementById('quote');
const messageElement = document.getElementById('message');
const typedValueElement = document.getElementById('typed-value');
const startButton = document.getElementById('start');

// Start 버튼 클릭 이벤트
startButton.addEventListener('click', () => {
  const quoteIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[quoteIndex];
  words = quote.split(' ');
  wordIndex = 0;

  // 단어별 span 추가
  const spanWords = words.map(word => `<span>${word} </span>`);
  quoteElement.innerHTML = spanWords.join('');
  quoteElement.childNodes[0].className = 'highlight';
  messageElement.innerText = '';

  typedValueElement.value = '';
  typedValueElement.disabled = false;
  startButton.disabled = true;
  typedValueElement.focus();

  startTime = new Date().getTime();
});

// input 이벤트
typedValueElement.addEventListener('input', () => {
  const currentWord = words[wordIndex];
  const typedValue = typedValueElement.value;

  // 마지막 단어까지 입력 완료 시
  if (typedValue === currentWord && wordIndex === words.length - 1) {
    const elapsedTime = new Date().getTime() - startTime;
    const message = `🎉 CONGRATULATIONS! You finished in ${(elapsedTime / 1000).toFixed(2)} seconds.`;
    messageElement.innerText = message;

    // 게임 종료 처리
    typedValueElement.disabled = true;
    startButton.disabled = false;
    startButton.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Restart';
  }
  // 단어 하나 완성 후 다음 단어로 이동
  else if (typedValue.endsWith(' ') && typedValue.trim() === currentWord) {
    typedValueElement.value = '';
    wordIndex++;
    for (const wordElement of quoteElement.childNodes) {
      wordElement.className = '';
    }
    quoteElement.childNodes[wordIndex].className = 'highlight';
  }
  // 맞게 입력 중
  else if (currentWord.startsWith(typedValue)) {
    typedValueElement.className = '';
  }
  // 오타일 때
  else {
    typedValueElement.className = 'error';
  }
});
