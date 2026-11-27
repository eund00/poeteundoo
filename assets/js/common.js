const commonScriptUrl = document.currentScript.src;

function initFooterTopButton() {
  const footer = document.querySelector("footer");

  if (!footer) return;

  const container = document.createElement("div");
  container.className = "footer-top";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "footer-topBtn";
  button.setAttribute("aria-label", "맨 위로 이동");
  container.appendChild(button);
  footer.appendChild(container);

  function updateVisibility() {
    const footerTop = footer.getBoundingClientRect().top;
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const defaultBottom = isMobile ? window.innerWidth * 0.05 : 50;
    const footerGap = 16;
    const bottom = Math.max(
      defaultBottom,
      window.innerHeight - footerTop + footerGap,
    );

    container.style.bottom = `${bottom}px`;
    container.classList.toggle("show", window.scrollY > 300);
  }

  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updateVisibility);
  updateVisibility();

  button.addEventListener("click", () => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth";

    window.scrollTo({ top: 0, behavior });
  });
}

function createDesktopMenu(sidebarNav) {
  const nav = document.createElement("nav");
  const list = document.createElement("ul");

  nav.className = "gnb";
  list.className = "gnb__list";

  sidebarNav.querySelectorAll("a").forEach((sidebarLink) => {
    if (sidebarLink.dataset.enabled === "false") {
      return;
    }

    const listItem = document.createElement("li");
    const link = document.createElement("a");
    const number = sidebarLink.querySelector("span");

    listItem.className = "gnb__item";
    link.href = sidebarLink.getAttribute("href");
    link.textContent = sidebarLink.textContent
      .replace(number ? number.textContent : "", "")
      .trim();
    listItem.appendChild(link);
    list.appendChild(listItem);
  });

  nav.appendChild(list);
  return nav;
}

async function loadSharedHeader() {
  const placeholder = document.getElementById("shared-header");

  if (!placeholder) {
    return;
  }

  const partialUrl = new URL("../../components/header.html", commonScriptUrl);
  const response = await fetch(partialUrl);

  if (!response.ok) {
    throw new Error(`Header load failed: ${response.status}`);
  }

  const template = document.createElement("template");
  template.innerHTML = await response.text();

  if (
    !template.content.querySelector(".header") ||
    !template.content.querySelector("#shared-sidebar")
  ) {
    throw new Error("Header markup is incomplete.");
  }

  placeholder.replaceWith(template.content);
}

async function loadSharedSidebar() {
  const placeholder = document.getElementById("shared-sidebar");

  if (!placeholder) {
    return;
  }

  const partialUrl = new URL("../../components/sidebar.html", commonScriptUrl);
  const response = await fetch(partialUrl);

  if (!response.ok) {
    throw new Error(`Sidebar load failed: ${response.status}`);
  }

  const template = document.createElement("template");
  template.innerHTML = await response.text();

  const overlay = template.content.querySelector("#sidebar-overlay");
  const sidebar = template.content.querySelector("#sidebar");
  const sidebarNav = template.content.querySelector(".sidebar__nav");

  if (!overlay || !sidebar || !sidebarNav) {
    throw new Error("Sidebar markup is incomplete.");
  }

  sidebarNav.querySelectorAll('a[data-enabled="false"]').forEach((link) => {
    link.hidden = true;
  });

  placeholder.replaceWith(template.content);

  const headerInner = document.querySelector(".header__inner");
  const menuToggle = document.getElementById("menu-toggle");
  const sidebarClose = document.getElementById("sidebar-close");

  if (headerInner && !headerInner.querySelector(".gnb")) {
    headerInner.insertBefore(createDesktopMenu(sidebarNav), menuToggle);
  }

  if (!menuToggle || !sidebarClose) {
    return;
  }

  function openSidebar() {
    sidebar.classList.add("is-open");
    overlay.classList.add("is-open");
    document.body.classList.add("menu-open");

    sidebar.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "메뉴 닫기");

    sidebarClose.focus();
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-open");
    document.body.classList.remove("menu-open");

    sidebar.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "메뉴 열기");

    menuToggle.focus();
  }

  menuToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("is-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  sidebarClose.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar.classList.contains("is-open")) {
      closeSidebar();
    }
  });

  sidebarNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900 && sidebar.classList.contains("is-open")) {
      closeSidebar();
    }
  });
}

async function loadSharedLayout() {
  await loadSharedHeader();
  await loadSharedSidebar();
}

loadSharedLayout().catch((error) => {
  console.error("공통 헤더와 사이드바를 불러오지 못했습니다.", error);
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFooterTopButton, {
    once: true,
  });
} else {
  initFooterTopButton();
}
