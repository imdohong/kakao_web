const usdInput = document.getElementById('usdInput');
const convertBtn = document.getElementById('convertBtn');
const resultDiv = document.getElementById('result');

// 환율 API 주소 (미국 달러 -> 한국 원화)
// 이 API는 무료이며 별도의 키가 필요 없습니다.
const apiURL = "https://api.frankfurter.app/latest?from=USD&to=KRW";

async function convertCurrency() {
  const amount = usdInput.value;
  
  if (amount === "") {
    resultDiv.innerText = "금액을 입력해주세요!";
    return;
  }

  resultDiv.innerText = "계산 중...";

  try {
    // 1. API 호출
    const response = await fetch(apiURL);
    const data = await response.json();

    // 2. 환율 정보 추출 (1달러당 원화 가격)
    const rate = data.rates.KRW;
    
    // 3. 계산 (입력 금액 * 환율)
    const convertedAmount = (amount * rate).toFixed(0); // 소수점 제거
    
    // 4. 결과 출력 (천 단위 콤마 추가)
    resultDiv.innerText = `${Number(convertedAmount).toLocaleString()} 원 (₩)`;
    
  } catch (error) {
    console.error(error);
    resultDiv.innerText = "에러가 발생했습니다.";
  }
}

// 버튼 클릭 시 실행
convertBtn.addEventListener('click', convertCurrency);

// 엔터키를 눌러도 실행되게 하기
usdInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    convertCurrency();
  }
});