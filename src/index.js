// form fields
const form = document.querySelector('.form-data');
const region = document.querySelector('.region-name');
const apiKey = document.querySelector('.api-key');

// results
const errors = document.querySelector('.errors');
const loading = document.querySelector('.loading');
const results = document.querySelector('.result-container');
const usage = document.querySelector('.carbon-usage');
const fossilfuel = document.querySelector('.fossil-fuel');
const myregion = document.querySelector('.my-region');
const clearBtn = document.querySelector('.clear-btn');

// 초기화
form.addEventListener('submit', (e) => handleSubmit(e));
clearBtn.addEventListener('click', (e) => reset(e));
init();

function reset(e) {
  e.preventDefault();
  localStorage.removeItem('regionName');
  localStorage.removeItem('apiKey');
  init();
}

function init() {
  const storedApiKey = localStorage.getItem('apiKey');
  const storedRegion = localStorage.getItem('regionName');

  if (storedApiKey === null || storedRegion === null) {
    form.style.display = 'block';
    results.style.display = 'none';
    loading.style.display = 'none';
    clearBtn.style.display = 'none';
    errors.textContent = '';
  } else {
    displayCarbonUsage(storedApiKey, storedRegion);
    results.style.display = 'none';
    form.style.display = 'none';
    clearBtn.style.display = 'block';
  }
}

function handleSubmit(e) {
  e.preventDefault();
  setUpUser(apiKey.value, region.value);
}

function setUpUser(apiKeyValue, regionValue) {
  localStorage.setItem('apiKey', apiKeyValue);
  localStorage.setItem('regionName', regionValue);
  loading.style.display = 'block';
  errors.textContent = '';
  clearBtn.style.display = 'block';

  displayCarbonUsage(apiKeyValue, regionValue);
}

async function displayCarbonUsage(apiKey, regionName) {
  try {
    loading.style.display = 'block';
    results.style.display = 'none';
    errors.textContent = '';

    // 예시용 임시 API 요청 (실제 API 사용 시 axios로 대체 가능)
    await new Promise(resolve => setTimeout(resolve, 1500)); // 로딩 시뮬레이션

    // 결과 표시
    loading.style.display = 'none';
    results.style.display = 'block';
    myregion.textContent = regionName;
    usage.textContent = (Math.random() * 300).toFixed(2) + ' gCO₂/kWh';
    fossilfuel.textContent = (Math.random() * 100).toFixed(1) + '%';
  } catch (err) {
    loading.style.display = 'none';
    errors.textContent = '⚠️ Failed to fetch data. Please check your API key.';
  }
}
