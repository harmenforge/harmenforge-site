const root = document.documentElement;
const desktopMagnetQuery = window.matchMedia("(min-width: 721px) and (hover: hover) and (pointer: fine)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let magnetCleanup = null;

function setViewportHeight() {
  root.style.setProperty("--viewport-height", `${window.innerHeight}px`);
}

setViewportHeight();
window.addEventListener("resize", setViewportHeight, { passive: true });

document.querySelector("[data-refresh-home]")?.addEventListener("click", (event) => {
  event.preventDefault();
  window.location.reload();
});

const musicPlayer = setupMusicPlayer();
setupLoadingScreen(musicPlayer?.playOnOpen);
setupWordMagnet();
desktopMagnetQuery.addEventListener("change", setupWordMagnet);
reducedMotionQuery.addEventListener("change", setupWordMagnet);

function setupLoadingScreen(startMusic) {
  const loader = document.querySelector("[data-loader]");
  const backgroundImage = document.querySelector(".background-media img");
  const minimumDelay = wait(1500);
  const backgroundReady = waitForImage(backgroundImage);

  Promise.all([backgroundReady, minimumDelay]).then(() => {
    if (loader) {
      loader.classList.add("is-hidden");
      loader.setAttribute("aria-hidden", "true");
    }

    if (typeof startMusic === "function") {
      window.setTimeout(startMusic, 160);
    }
  });
}

function wait(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function waitForImage(image) {
  if (!image) {
    return Promise.resolve();
  }

  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}

function setupMusicPlayer() {
  const player = document.querySelector("[data-music-player]");
  const audio = document.querySelector("#background-music");

  if (!player || !audio) {
    return null;
  }

  audio.volume = 0.38;

  function setPlayingState(isPlaying) {
    player.classList.toggle("is-playing", isPlaying);
    player.classList.toggle("is-paused", !isPlaying);
    player.setAttribute("aria-pressed", String(isPlaying));
    player.setAttribute("aria-label", isPlaying ? "Pause background music" : "Play background music");
  }

  async function playMusic(options = {}) {
    const shouldStartMuted = options.mutedStart === true;
    const wasMuted = audio.muted;

    try {
      if (shouldStartMuted) {
        audio.muted = true;
      }

      await audio.play();
      setPlayingState(true);

      if (shouldStartMuted) {
        window.setTimeout(() => {
          audio.muted = wasMuted;
        }, 80);
      }
    } catch {
      audio.muted = wasMuted;
      setPlayingState(false);
    }
  }

  player.addEventListener("click", async () => {
    if (audio.paused) {
      await playMusic();
      return;
    }

    audio.pause();
    setPlayingState(false);
  });

  audio.addEventListener("pause", () => setPlayingState(false));
  audio.addEventListener("play", () => setPlayingState(true));
  setPlayingState(false);
  return {
    play: playMusic,
    playOnOpen: () => playMusic({ mutedStart: true })
  };
}

function setupWordMagnet() {
  if (magnetCleanup) {
    magnetCleanup();
    magnetCleanup = null;
  }

  if (!desktopMagnetQuery.matches || reducedMotionQuery.matches) {
    resetMagnetWords();
    return;
  }

  wrapMagnetWords();

  const groups = [...document.querySelectorAll(".statement h1, .statement__body--above, .statement__body--below")];
  const radius = 112;
  const force = 30;
  let animationFrame = 0;

  function moveWords(group, pointerX, pointerY) {
    const words = [...group.querySelectorAll(".word-magnet__word")];

    words.forEach((word) => {
      const rect = word.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = centerX - pointerX;
      const deltaY = centerY - pointerY;
      const distance = Math.hypot(deltaX, deltaY);

      if (!distance || distance > radius) {
        word.style.transform = "translate3d(0, 0, 0)";
        return;
      }

      const pull = (1 - distance / radius) * force;
      const x = (deltaX / distance) * pull;
      const y = (deltaY / distance) * pull;
      word.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });
  }

  function resetGroup(group) {
    group.querySelectorAll(".word-magnet__word").forEach((word) => {
      word.style.transform = "translate3d(0, 0, 0)";
    });
  }

  const listeners = groups.map((group) => {
    const onPointerMove = (event) => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(() => {
        moveWords(group, event.clientX, event.clientY);
      });
    };

    const onPointerLeave = () => resetGroup(group);
    group.addEventListener("pointermove", onPointerMove);
    group.addEventListener("pointerleave", onPointerLeave);
    return { group, onPointerMove, onPointerLeave };
  });

  magnetCleanup = () => {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    listeners.forEach(({ group, onPointerMove, onPointerLeave }) => {
      group.removeEventListener("pointermove", onPointerMove);
      group.removeEventListener("pointerleave", onPointerLeave);
      resetGroup(group);
    });
  };
}

function wrapMagnetWords() {
  document.querySelectorAll(".statement h1, .statement__body p").forEach((paragraph) => {
    if (paragraph.dataset.wordMagnetReady === "true") {
      return;
    }

    wrapTextNodes(paragraph);
    paragraph.dataset.wordMagnetReady = "true";
  });
}

function wrapTextNodes(node) {
  [...node.childNodes].forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent;
      if (!text || !text.trim()) {
        return;
      }

      const fragment = document.createDocumentFragment();
      text.split(/(\s+)/).forEach((part) => {
        if (!part) {
          return;
        }

        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }

        const word = document.createElement("span");
        word.className = "word-magnet__word";
        word.textContent = part;
        fragment.appendChild(word);
      });

      child.replaceWith(fragment);
      return;
    }

    if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains("word-magnet__word")) {
      wrapTextNodes(child);
    }
  });
}

function resetMagnetWords() {
  document.querySelectorAll(".word-magnet__word").forEach((word) => {
    word.style.transform = "translate3d(0, 0, 0)";
  });
}
