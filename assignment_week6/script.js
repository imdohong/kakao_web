const plants = document.querySelectorAll(".plant");
const terrarium = document.getElementById("terrarium");

// 각 식물에 drag 이벤트 리스너 추가
plants.forEach(plant => {
  plant.addEventListener("dragstart", dragStart);
  plant.addEventListener("dragend", dragEnd);
});

// 테라리움에 드롭 가능하게 설정
terrarium.addEventListener("dragover", dragOver);
terrarium.addEventListener("drop", drop);

function dragStart(e) {
  e.dataTransfer.setData("text/plain", e.target.id);
  e.target.style.opacity = "0.5";
}

function dragEnd(e) {
  e.target.style.opacity = "1";
}

function dragOver(e) {
  e.preventDefault(); // 기본 동작 취소해야 drop 이벤트 허용됨
}

function drop(e) {
  e.preventDefault();
  const id = e.dataTransfer.getData("text/plain");
  const plant = document.getElementById(id);

  // 테라리움 내부 좌표 계산
  const rect = terrarium.getBoundingClientRect();
  const x = e.clientX - rect.left - 40; // 식물 중앙 보정
  const y = e.clientY - rect.top - 40;

  plant.style.position = "absolute";
  plant.style.left = `${x}px`;
  plant.style.top = `${y}px`;

  terrarium.appendChild(plant);
}
