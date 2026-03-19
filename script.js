const models = window.HARMEN_FORGE_MODELS || [];
const modelsGrid = document.querySelector("#models-grid");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const progressBar = document.querySelector("#scroll-progress-bar");
const form = document.querySelector("#contact-form");
const formNote = document.querySelector("#form-note");
const submittedAtField = document.querySelector("#submitted-at");
const modelModal = document.querySelector("#model-modal");
const modelModalTitle = document.querySelector("#model-modal-title");
const modelModalDescription = document.querySelector("#model-modal-description");
const modelModalMeta = document.querySelector("#model-modal-meta");
const modelModalGallery = document.querySelector("#model-modal-gallery");
const modelModalClose = document.querySelector(".model-modal__close");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let activeModalTimer = null;
let revealElements = [];
let lastRevealScrollY = window.scrollY;
let currentScrollDirection = "down";
let revealTicking = false;
const scrollMotionState = {
  current: window.scrollY,
  target: window.scrollY,
  rafId: 0,
};

renderModels();
setupScrollMotion();
setupNavigation();
setupAnchorNavigation();
setupModelExperience();
setupRevealAnimations();
setupFaqBehavior();
setupContactForm();

function renderModels() {
  if (!modelsGrid) {
    return;
  }

  if (!models.length) {
    modelsGrid.innerHTML = `
      <article class="model-card model-card--empty reveal is-visible">
        <div class="model-card__body">
          <div class="model-card__eyebrow">No models yet</div>
          <h3 class="model-card__title">Add your first digital muse</h3>
          <p class="model-card__summary">
            Add a model entry and her image set to turn this section into a premium product display.
          </p>
        </div>
      </article>
    `;
    return;
  }

  modelsGrid.innerHTML = models
    .map(
      (model, index) => `
        <article
          class="model-card reveal"
          data-model-index="${index}"
          tabindex="0"
          role="button"
          aria-haspopup="dialog"
          aria-controls="model-modal"
        >
          <div class="model-card__media">
            <img
              src="${model.cover.src}"
              alt="${model.cover.alt}"
              loading="${index === 0 ? "eager" : "lazy"}"
            />
          </div>
          <div class="model-card__body">
            <div class="model-card__eyebrow">${model.imageCount} campaign images</div>
            <h3 class="model-card__title">${model.title}</h3>
            <p class="model-card__summary">${model.description}</p>
            <span class="model-card__cta">Open model pack</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function setupNavigation() {
  if (!menuToggle || !siteNav) {
    return;
  }

  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setupScrollMotion() {
  updateScrollEffects(window.scrollY);
  requestRevealStateUpdate();

  if (prefersReducedMotion) {
    window.addEventListener("scroll", () => {
      updateScrollDirection(window.scrollY);
      updateScrollEffects(window.scrollY);
      requestRevealStateUpdate();
    }, { passive: true });
    window.addEventListener("resize", () => {
      updateScrollEffects(window.scrollY);
      requestRevealStateUpdate();
    });
    return;
  }

  window.addEventListener(
    "scroll",
    () => {
      updateScrollDirection(window.scrollY);
      scrollMotionState.target = window.scrollY;
      startScrollMotionLoop();
      requestRevealStateUpdate();
    },
    { passive: true },
  );

  window.addEventListener("resize", () => {
    updateScrollDirection(window.scrollY);
    scrollMotionState.target = window.scrollY;
    scrollMotionState.current = window.scrollY;
    updateScrollEffects(window.scrollY);
    requestRevealStateUpdate();
  });
}

function setupAnchorNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") {
        return;
      }

      const target = document.querySelector(href);
      if (!target) {
        return;
      }

      event.preventDefault();
      const headerOffset = document.querySelector(".site-header")?.offsetHeight ?? 0;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset - 16;

      window.scrollTo({
        top: clamp(targetTop, 0, getScrollLimit()),
        behavior: "smooth",
      });

      if (siteNav) {
        siteNav.classList.remove("is-open");
      }

      if (menuToggle) {
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  });
}

function setupModelExperience() {
  if (!modelModal || !modelModalTitle || !modelModalDescription || !modelModalMeta || !modelModalGallery) {
    return;
  }

  document.querySelectorAll("[data-model-index]").forEach((card) => {
    card.addEventListener("click", () => {
      const index = Number(card.getAttribute("data-model-index"));
      openModelModal(index);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const index = Number(card.getAttribute("data-model-index"));
        openModelModal(index);
      }
    });
  });

  modelModal.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.hasAttribute("data-close-modal")) {
      closeModelModal();
    }
  });

  if (modelModalClose) {
    modelModalClose.addEventListener("click", closeModelModal);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modelModal && !modelModal.hidden) {
      closeModelModal();
    }
  });
}

function openModelModal(index) {
  const model = models[index];
  if (!model || !modelModal) {
    return;
  }

  if (activeModalTimer) {
    window.clearTimeout(activeModalTimer);
    activeModalTimer = null;
  }

  modelModalTitle.textContent = model.title;
  modelModalDescription.textContent = model.description;
  modelModalMeta.textContent = `${model.imageCount} images in this model pack`;
  modelModalGallery.innerHTML = model.images
    .map(
      (image, imageIndex) => `
        <figure class="model-modal__shot ${imageIndex === 0 ? "model-modal__shot--feature" : ""}">
          <img src="${image.src}" alt="${image.alt}" loading="${imageIndex < 2 ? "eager" : "lazy"}" />
        </figure>
      `,
    )
    .join("");

  modelModal.hidden = false;
  document.body.classList.add("modal-open");

  window.requestAnimationFrame(() => {
    modelModal.classList.add("is-open");
  });

  if (modelModalClose) {
    modelModalClose.focus();
  }
}

function closeModelModal() {
  if (!modelModal || modelModal.hidden) {
    return;
  }

  modelModal.classList.remove("is-open");
  document.body.classList.remove("modal-open");

  activeModalTimer = window.setTimeout(() => {
    modelModal.hidden = true;
  }, 280);
}

function setupRevealAnimations() {
  splitRevealText();
  revealElements = [...document.querySelectorAll(".reveal")];

  if (prefersReducedMotion) {
    revealElements.forEach((element) => {
      element.classList.remove("is-pending");
      element.classList.add("is-visible");
    });
    return;
  }

  revealElements.forEach((element) => {
    element.classList.add("is-pending");
    element.style.setProperty("--reveal-delay", "0ms");
    element.dataset.revealDir = "down";
  });
  updateRevealStates();
}

function updateScrollEffects(scrollTop) {
  const parallaxItems = [...document.querySelectorAll("[data-parallax]")];
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }

  parallaxItems.forEach((item) => {
    const speed = Number(item.dataset.parallax || 0);
    const offset = scrollTop * speed;
    item.style.transform = `translate3d(0, ${offset}px, 0)`;
  });
}

function startScrollMotionLoop() {
  if (scrollMotionState.rafId) {
    return;
  }

  const step = () => {
    const diff = scrollMotionState.target - scrollMotionState.current;
    scrollMotionState.current += diff * 0.052;

    if (Math.abs(diff) < 0.1) {
      scrollMotionState.current = scrollMotionState.target;
    }

    updateScrollEffects(scrollMotionState.current);

    if (Math.abs(scrollMotionState.target - scrollMotionState.current) >= 0.1) {
      scrollMotionState.rafId = window.requestAnimationFrame(step);
      return;
    }

    scrollMotionState.rafId = 0;
  };

  scrollMotionState.rafId = window.requestAnimationFrame(step);
}

function splitRevealText() {
  const textTargets = [
    ".hero h1",
    ".hero__lede",
    ".hero__feature p",
    ".hero__stats span",
    ".section-heading h2",
    ".section-heading p",
    ".panel h3",
    ".panel p",
    ".step-card h3",
    ".step-card p",
    ".timeline-item h3",
    ".timeline-item p",
    ".service-card h3",
    ".service-card p",
    ".faq-item summary",
    ".faq-item p",
    ".contact-copy h2",
    ".contact-copy p",
    ".model-card__title",
    ".model-card__summary",
    ".model-card__cta",
    ".model-modal__header h2",
    ".model-modal__header p",
    ".model-modal__meta",
  ];

  document.querySelectorAll(textTargets.join(",")).forEach((element) => {
    if (element.dataset.splitReady === "true") {
      return;
    }

    let wordIndex = 0;
    wrapTextNodes(element);
    element.querySelectorAll(".reveal-word").forEach((word) => {
      word.style.setProperty("--word-index", String(wordIndex));
      wordIndex += 1;
    });
    element.classList.add("reveal-text");
    element.dataset.splitReady = "true";
  });
}

function wrapTextNodes(node) {
  const childNodes = [...node.childNodes];
  childNodes.forEach((child) => {
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

        const span = document.createElement("span");
        span.className = "reveal-word";
        span.textContent = part;
        fragment.appendChild(span);
      });

      child.replaceWith(fragment);
      return;
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      wrapTextNodes(child);
    }
  });
}

function updateScrollDirection(scrollY) {
  if (scrollY > lastRevealScrollY) {
    currentScrollDirection = "down";
  } else if (scrollY < lastRevealScrollY) {
    currentScrollDirection = "up";
  }

  lastRevealScrollY = scrollY;
}

function requestRevealStateUpdate() {
  if (revealTicking) {
    return;
  }

  revealTicking = true;
  window.requestAnimationFrame(() => {
    updateRevealStates();
    revealTicking = false;
  });
}

function updateRevealStates() {
  if (!revealElements.length) {
    return;
  }

  const enterStart = window.innerHeight * 0.92;
  const enterEnd = window.innerHeight * 0.08;

  revealElements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const isInView = rect.top < enterStart && rect.bottom > enterEnd;

    if (isInView) {
      element.dataset.revealDir = currentScrollDirection;
      element.classList.remove("is-pending");
      element.classList.add("is-visible");
      return;
    }

    element.dataset.revealDir = currentScrollDirection;
    element.classList.remove("is-visible");
    element.classList.add("is-pending");
  });
}

function getScrollLimit() {
  return Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setupFaqBehavior() {
  const faqItems = [...document.querySelectorAll(".faq-item")];

  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) {
        return;
      }

      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.removeAttribute("open");
        }
      });
    });
  });
}

function setupContactForm() {
  if (!form || !formNote) {
    return;
  }
  setFormNote(
    "Complete the form and we will open your mail app with the inquiry ready to send.",
    "info",
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const brand = String(data.get("brand") || "").trim();
    const email = String(data.get("email") || "").trim();
    const scope = String(data.get("scope") || "").trim();

    if (!name || !brand || !email || !scope) {
      setFormNote("Please complete all fields before submitting.", "error");
      return;
    }

    if (submittedAtField) {
      submittedAtField.value = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }

    setFormNote("Opening your mail app with a prepared draft...", "success");

    const subject = `New inquiry from ${name} / ${brand}`;
    const body = [
      "Hi Harmen Forge Studio,",
      "",
      "I would like to discuss a project.",
      "",
      `Name: ${name}`,
      `Brand: ${brand}`,
      `Email: ${email}`,
      `Submitted: ${submittedAtField ? submittedAtField.value : ""}`,
      `Source: Harmen Forge Studio website`,
      "",
      "Project scope:",
      scope,
    ].join("\n");

    const mailtoUrl =
      `mailto:harmenforge@gmail.com?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
  });
}

function setFormNote(message, state) {
  if (!formNote) {
    return;
  }

  formNote.textContent = message;
  formNote.classList.remove("is-error", "is-success");

  if (state === "error") {
    formNote.classList.add("is-error");
  }

  if (state === "success") {
    formNote.classList.add("is-success");
  }
}
