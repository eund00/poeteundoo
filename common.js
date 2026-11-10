const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.getElementById("sidebar");
const sidebarClose = document.getElementById("sidebar-close");
const sidebarOverlay = document.getElementById("sidebar-overlay");

function openSidebar() {
  sidebar.classList.add("is-open");
  sidebarOverlay.classList.add("is-open");
  document.body.classList.add("menu-open");

  sidebar.setAttribute("aria-hidden", "false");
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", "메뉴 닫기");

  sidebarClose.focus();
}

function closeSidebar() {
  sidebar.classList.remove("is-open");
  sidebarOverlay.classList.remove("is-open");
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
