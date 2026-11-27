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

async function loadSharedSidebar() {
  const placeholder = document.getElementById("shared-sidebar");

  if (!placeholder) {
    return;
  }

  const script = document.currentScript;
  const partialUrl = new URL("sidebar.html", script.src);
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

loadSharedSidebar().catch((error) => {
  console.error("공통 사이드바를 불러오지 못했습니다.", error);
});
