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
const messageElement = document.getElementById('message'); // 이제 모달이 대신하지만, 혹시 모르니 남겨둡니다.
const typedValueElement = document.getElementById('typed-value');
const startButton = document.getElementById('start');

// --- NEW: 모달 및 최고 점수 요소 ---
const modalOverlay = document.getElementById('modal-overlay');
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modal-message');
const modalNewRecord = document.getElementById('modal-new-record');
const closeModalButton = document.getElementById('modal-close-btn');
const highScoreElement = document.getElementById('high-score');

// --- NEW: 최고 점수 불러오기 및 표시 함수 ---
const displayHighScore = () => {
  // localStorage에서 'highScore' 키로 값을 가져옵니다.
  const highScore = parseFloat(localStorage.getItem('typingGameHighScore')) || 0;
  if (highScore > 0) {
    highScoreElement.innerText = `Best Time: ${(highScore / 1000).toFixed(2)}s`;
  } else {
    highScoreElement.innerText = 'Best Time: N/A';
  }
};

// --- NEW: 모달 닫기 함수 ---
const closeModal = () => {
  modalOverlay.classList.remove('show');
  modal.classList.remove('show');
};

// 페이지 로드 시 최고 점수 표시
document.addEventListener('DOMContentLoaded', displayHighScore);

// 모달 닫기 이벤트 리스너
closeModalButton.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);


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
  messageElement.innerText = ''; // 메시지 초기화

  typedValueElement.value = '';
  typedValueElement.disabled = false;
  typedValueElement.className = ''; // NEW: 입력창 클래스 초기화
  startButton.disabled = true;
  startButton.innerHTML = '<i class="fa-solid fa-play"></i> Start'; // 아이콘 리셋
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
    
    // --- NEW: 최고 점수 확인 및 저장 ---
    const oldHighScore = parseFloat(localStorage.getItem('typingGameHighScore')) || 0;
    let newRecordText = '';

    if (!oldHighScore || elapsedTime < oldHighScore) {
      localStorage.setItem('typingGameHighScore', elapsedTime);
      newRecordText = '🎉 New High Score! 🎉';
      displayHighScore(); // 최고 점수 UI 업데이트
    }
    
    // --- NEW: 모달창에 결과 표시 ---
    modalMessage.innerText = `You finished in ${(elapsedTime / 1000).toFixed(2)} seconds.`;
    modalNewRecord.innerText = newRecordText;
    
    modalOverlay.classList.add('show');
    modal.classList.add('show');

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
    typedValueElement.className = ''; // NEW: 다음 단어로 갈 때 클래스 초기화
  } 
  // --- UPDATED: 입력 중 CSS 효과 ---
  else if (currentWord.startsWith(typedValue)) {
    typedValueElement.className = 'correct'; // 맞게 입력 중
  } 
  else {
    typedValueElement.className = 'error'; // 오타
  }
});