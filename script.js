const hintOutput = document.getElementById("hintOutput");
const hintButtons = document.querySelectorAll("button[data-level]");
const levelDots = document.querySelectorAll(".level-dot");
const particlesLayer = document.getElementById("particles");
const problemTextarea = document.getElementById("problemStatement");
const timerDisplay = document.getElementById("timerDisplay");
const resetTimerBtn = document.getElementById("resetTimerBtn");

let typewriterTimer = null;
let timerInterval = null;

const TIMER_STORAGE_KEY = "leetHintBotTimerState";
let timerState = {
  running: false,
  startedAt: null,
  elapsedMs: 0
};

async function getHint(level, problemStatement, currentCode) {
  const response = await fetch("http://127.0.0.1:5000/get-hint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      problem: problemStatement,
      code: currentCode,
      level
    })
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  const data = await response.json();
  if (!data.hint || typeof data.hint !== "string") {
    throw new Error("Invalid response format");
  }

  return data.hint;
}

async function handleHintClick(event) {
  createRipple(event);
  startTimerIfNeeded();
  const level = Number(event.currentTarget.dataset.level);
  const problemStatement = document.getElementById("problemStatement").value.trim();
  const currentCode = document.getElementById("currentCode").value.trim();

  updateLevelIndicator(level);
  showLoadingState();

  try {
    const hint = await getHint(level, problemStatement, currentCode);
    revealHintWithTypewriter(hint);
  } catch (error) {
    hintOutput.textContent = "Something went wrong, try again";
  }
}

function updateLevelIndicator(level) {
  levelDots.forEach((dot) => {
    const step = Number(dot.dataset.step);
    dot.classList.toggle("active", step <= level);
  });
}

function revealHintWithTypewriter(hintText) {
  if (typewriterTimer) {
    clearInterval(typewriterTimer);
  }

  hintOutput.classList.remove("reveal");
  void hintOutput.offsetWidth;
  hintOutput.textContent = "";
  hintOutput.classList.add("reveal");

  let charIndex = 0;
  typewriterTimer = setInterval(() => {
    hintOutput.textContent += hintText[charIndex];
    charIndex += 1;

    if (charIndex >= hintText.length) {
      clearInterval(typewriterTimer);
      typewriterTimer = null;
    }
  }, 16);
}

function showLoadingState() {
  if (typewriterTimer) {
    clearInterval(typewriterTimer);
    typewriterTimer = null;
  }
  hintOutput.classList.remove("reveal");
  void hintOutput.offsetWidth;
  hintOutput.textContent = "Thinking...";
  hintOutput.classList.add("reveal");
}

hintButtons.forEach((button) => {
  button.addEventListener("click", handleHintClick);
});

problemTextarea.addEventListener("paste", () => {
  startTimerIfNeeded();
});

resetTimerBtn.addEventListener("click", resetTimer);

function createRipple(event) {
  const button = event.currentTarget;
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;
  const buttonRect = button.getBoundingClientRect();

  circle.style.width = `${diameter}px`;
  circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - buttonRect.left - radius}px`;
  circle.style.top = `${event.clientY - buttonRect.top - radius}px`;
  circle.classList.add("ripple");

  const existingRipple = button.querySelector(".ripple");
  if (existingRipple) {
    existingRipple.remove();
  }

  button.appendChild(circle);
}

function createParticles() {
  const particleCount = 46;
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");
    const size = Math.random() * 3 + 1;
    const leftPosition = Math.random() * 100;
    const delay = Math.random() * 10;
    const duration = Math.random() * 10 + 10;
    const drift = (Math.random() - 0.5) * 80;

    particle.className = "particle";
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${leftPosition}%`;
    particle.style.bottom = `${Math.random() * 30 - 10}vh`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;
    particle.style.setProperty("--drift", `${drift}px`);
    fragment.appendChild(particle);
  }

  particlesLayer.appendChild(fragment);
}

function loadTimerState() {
  try {
    const rawState = sessionStorage.getItem(TIMER_STORAGE_KEY);
    if (!rawState) {
      updateTimerDisplay(0);
      return;
    }

    const parsed = JSON.parse(rawState);
    if (
      typeof parsed.running !== "boolean" ||
      (parsed.startedAt !== null && typeof parsed.startedAt !== "number") ||
      typeof parsed.elapsedMs !== "number"
    ) {
      updateTimerDisplay(0);
      return;
    }

    timerState = parsed;
    updateTimerDisplay(getElapsedMs());

    if (timerState.running) {
      beginTimerTicker();
    }
  } catch (error) {
    updateTimerDisplay(0);
  }
}

function startTimerIfNeeded() {
  if (timerState.running) {
    return;
  }

  timerState.running = true;
  timerState.startedAt = Date.now();
  saveTimerState();
  beginTimerTicker();
}

function beginTimerTicker() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    const elapsedMs = getElapsedMs();
    updateTimerDisplay(elapsedMs);
    timerState.elapsedMs = elapsedMs;
    timerState.startedAt = Date.now();
    saveTimerState();
  }, 1000);
}

function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  timerState = {
    running: false,
    startedAt: null,
    elapsedMs: 0
  };

  saveTimerState();
  updateTimerDisplay(0);
}

function getElapsedMs() {
  if (!timerState.running || timerState.startedAt === null) {
    return timerState.elapsedMs;
  }

  return timerState.elapsedMs + (Date.now() - timerState.startedAt);
}

function updateTimerDisplay(elapsedMs) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timerDisplay.textContent = `Time spent: ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function saveTimerState() {
  sessionStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
}

window.addEventListener("beforeunload", () => {
  if (timerState.running) {
    timerState.elapsedMs = getElapsedMs();
    timerState.startedAt = Date.now();
    saveTimerState();
  }
});

loadTimerState();
createParticles();
