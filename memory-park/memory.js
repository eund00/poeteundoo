/* ========================================
   MEMORY PARK
======================================== */

(() => {
  "use strict";

  // Google Apps Script API
  const API_URL =
    "https://script.google.com/macros/s/AKfycbx42Xvmc86V9T6HDwPsQzMmOM8xdTvbv-nSko3rzEzXS_ld9u37S7oZ0nZpgQCE6PYx/exec";

  const memoryList = document.getElementById("memory-list");

  // 메인 페이지에 메모리 영역이 없으면 종료
  if (!memoryList) return;

  /* ========================================
     1. HTML ESCAPE
  ======================================== */

  function escapeHTML(str = "") {
    return String(str).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  }

  /* ========================================
     2. IMAGE URL VALIDATION
  ======================================== */

  function validImageURL(url = "") {
    try {
      const parsed = new URL(url);

      return ["http:", "https:"].includes(parsed.protocol) ? url : "";
    } catch {
      return "";
    }
  }

  /* ========================================
     3. CREATE CARD
  ======================================== */

  function createCard(item) {
    const imageURL = validImageURL(item.image);

    return `
      <article class="memory-card swiper-slide">

        <div class="memory-card__image">
          ${
            imageURL
              ? `
                <img
                  src="${escapeHTML(imageURL)}"
                  alt="${escapeHTML(item.title)}"
                  loading="lazy"
                >
              `
              : `
                <div class="memory-card__empty">
                  NO IMAGE
                </div>
              `
          }
        </div>

        <div class="memory-card__info">

          <span>${escapeHTML(item.id)}</span>

          <h3>${escapeHTML(item.title)}</h3>

          <p>
            ${escapeHTML(item.description).replace(/\n/g, "<br>")}
          </p>

          <small>
            🧩 ${escapeHTML(item.date)}
          </small>

        </div>

      </article>
    `;
  }

  /* ========================================
     4. LOAD MEMORY DATA
  ======================================== */

  async function loadMemory() {
    // 로딩 시작 시간
    const loadingStart = Date.now();

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("메모리 데이터를 불러오지 못했습니다.");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "메모리 데이터 오류");
      }

      const items = data.items || [];

      // 최소 2.5초 대기
      const elapsed = Date.now() - loadingStart;
      const remaining = Math.max(0, 2500 - elapsed);

      await new Promise((resolve) => {
        setTimeout(resolve, remaining);
      });

      // 카드 생성
      memoryList.innerHTML = items.length
        ? items.map(createCard).join("")
        : "<p>아직 등록된 기억이 없습니다.</p>";

      // 로딩 완료 후 캡션 숨기기
      const caption = document.querySelector(".memory-park__caption-container");

      if (caption) {
        caption.style.display = "none";
      }

      // Swiper 업데이트
      if (window.memorySwiper) {
        window.memorySwiper.update();
      }
    } catch (error) {
      console.error("Memory Park:", error);

      // 오류가 발생해도 최소 2.5초 유지
      const elapsed = Date.now() - loadingStart;
      const remaining = Math.max(0, 2500 - elapsed);

      await new Promise((resolve) => {
        setTimeout(resolve, remaining);
      });

      memoryList.innerHTML = `
      <p>메모리 파크를 불러오지 못했습니다.</p>
    `;
    }
  }
  /* ========================================
     5. INITIALIZE
  ======================================== */

  loadMemory();
})();
