// blackjack.js

function drawCard() {
  return Math.floor(Math.random() * 11) + 1;
}

let cardOne = drawCard();
let cardTwo = drawCard();
let cardThree = drawCard();
let cardOneBank = drawCard();
let cardTwoBank = drawCard();

let sum = cardOne + cardTwo + cardThree;
let bankSum = cardOneBank + cardTwoBank;

console.log(`당신이 받은 카드: ${cardOne}, ${cardTwo}, ${cardThree}`);
console.log(`딜러가 받은 카드: ${cardOneBank}, ${cardTwoBank}`);
console.log('--------------------');

if (bankSum < 17) {
  let extraCard = drawCard();
  console.log(`딜러는 17점 미만(${bankSum}점)이므로 카드를 한 장 더 받습니다. (+${extraCard})`);
  bankSum += extraCard;
}

console.log(`\n당신의 최종 점수는 ${sum}점 입니다.`);
console.log(`딜러의 최종 점수는 ${bankSum}점 입니다.`);
console.log('--------------------');

if (sum > 21) {
  console.log('21점 초과! 당신이 졌습니다. 😥');
} else if (bankSum > 21) {
  console.log('딜러가 21점 초과! 당신이 이겼습니다! 🎉');
} else if (sum === bankSum) {
  console.log('무승부입니다. 🤝');
} else if (sum > bankSum) {
  console.log('당신이 이겼습니다! 😄');
} else {
  console.log('당신이 졌습니다. 👎');
}
