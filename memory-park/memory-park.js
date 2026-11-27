/* ========================================
   MEMORY PARK (Supabase 연동 버전)
======================================== */

(() => {
  "use strict";

  // Supabase 설정
  const SUPABASE_URL = "https://jxyucxgpdlfidzwizski.supabase.co";
  const SUPABASE_KEY = "sb_publishable_hhdmoi0xScMatNS8Nb9ZVA_FG-DQoG-";
  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
  );

  const memoryList = document.getElementById("memory-list");
  const loadingScreen = document.getElementById("memory-loading");

  // 메인 페이지에 메모리 영역이 없으면 종료
  if (!memoryList) return;

  // 모달 요소
  const modal = document.getElementById("memory-modal");
  const modalImage = document.getElementById("modal-image");
  const modalDate = document.getElementById("modal-date");
  const modalTitle = document.getElementById("modal-title");
  const modalDescription = document.getElementById("modal-description");
  const modalItem = document.getElementById("modal-item");
  const modalCloseButtons = modal
    ? modal.querySelectorAll("[data-modal-close]")
    : [];

  let memoryItems = [];
  let previousFocus = null;
  let previousOverflow = "";

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

  function createCard(item, index) {
    const imageURL = validImageURL(item.image);

    return `
      <article
        class="memory-card swiper-slide"
        role="button"
        tabindex="0"
        data-memory-index="${index}"
        aria-label="${escapeHTML(item.title)} 상세 보기"
      >

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

          <span>${escapeHTML(item.date)}</span>

          <h3><small>${escapeHTML(item.has_item)}</small> ${escapeHTML(item.title)}</h3>

          <p>
            ${escapeHTML(item.description).replace(/\n/g, "<br>")}
          </p>

        </div>

      </article>
    `;
  }

  /* ========================================
4. OPEN MODAL
  ======================================== */

  function openModal(item) {
    if (!modal) return;

    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;

    const imageURL = validImageURL(item.image);

    // 이미지
    if (imageURL) {
      modalImage.src = imageURL;
      modalImage.alt = item.title || "";
      modalImage.style.display = "block";
    } else {
      modalImage.removeAttribute("src");
      modalImage.alt = "";
      modalImage.style.display = "none";
    }

    // 물건 정보
    modalDate.textContent = item.date || "";
    modalTitle.textContent = item.title || "";
    modalDescription.textContent = item.description || "";

    if (modalItem) {
      modalItem.textContent = item.has_item ? `${item.has_item}` : "";
    }

    // 모달 열기
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    // 배경 스크롤 방지
    document.body.style.overflow = "hidden";

    // 닫기 버튼에 포커스
    const closeButton = modal.querySelector(".memory-modal__close");

    if (closeButton) {
      closeButton.focus();
    }
  }

  /* ========================================
5. CLOSE MODAL
  ======================================== */

  function closeModal() {
    if (!modal || !modal.classList.contains("is-open")) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    // 스크롤 복구
    document.body.style.overflow = previousOverflow;

    // 이미지 초기화
    modalImage.removeAttribute("src");

    // 이전 카드로 포커스 복구
    if (previousFocus && previousFocus.isConnected) {
      previousFocus.focus();
    }
  }

  /* ========================================
6. CARD CLICK EVENT
  ======================================== */

  memoryList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-memory-index]");

    if (!card) return;

    const index = Number(card.dataset.memoryIndex);
    const item = memoryItems[index];

    if (item) {
      openModal(item);
    }
  });

  /* ========================================
7. KEYBOARD EVENT
  ======================================== */

  memoryList.addEventListener("keydown", (event) => {
    const card = event.target.closest("[data-memory-index]");

    if (!card) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      const index = Number(card.dataset.memoryIndex);
      const item = memoryItems[index];

      if (item) {
        openModal(item);
      }
    }
  });

  // ESC 키로 닫기
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  // 닫기 버튼 및 배경 클릭
  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  /* ========================================
8. LOAD MEMORY DATA
  ======================================== */

  async function loadMemory() {
    const loadingStart = Date.now();

    // 로딩 화면 표시
    if (loadingScreen) {
      loadingScreen.classList.remove("is-hidden");
    }

    try {
      // visible이 true인 데이터만 최신순(created_at 내림차순)으로 조회
      const { data, error } = await supabaseClient
        .from("memory_items")
        .select("*")
        .eq("visible", true)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Supabase created_at(2026-11-16T15:00:00+00:00)을 '2026.11.16' 형식으로 변환
      memoryItems = (data || []).map((item) => ({
        ...item,
        date: item.created_at
          ? item.created_at.slice(0, 10).replace(/-/g, ".")
          : "",
      }));

      if (loadingScreen) {
        const elapsed = Date.now() - loadingStart;
        const remaining = Math.max(0, 2500 - elapsed);

        await new Promise((resolve) => {
          setTimeout(resolve, remaining);
        });
      }

      // 카드 생성
      memoryList.innerHTML = memoryItems.length
        ? memoryItems.map((item, index) => createCard(item, index)).join("")
        : "<p>아직 등록된 기억이 없습니다.</p>";

      // 물건 개수 표시
      const memoryCount = document.getElementById("memory-count");

      if (memoryCount) {
        memoryCount.textContent = `${memoryItems.length}`;
      }

      // Swiper 업데이트
      if (window.memorySwiper) {
        window.memorySwiper.update();
      }
    } catch (error) {
      console.error("Memory Park:", error);

      if (loadingScreen) {
        const elapsed = Date.now() - loadingStart;
        const remaining = Math.max(0, 2500 - elapsed);

        await new Promise((resolve) => {
          setTimeout(resolve, remaining);
        });
      }

      memoryList.innerHTML = `
        <p>메모리 파크를 불러오지 못했습니다.</p>
      `;
    } finally {
      // 로딩 화면 닫기
      if (loadingScreen) {
        loadingScreen.classList.add("is-hidden");
      }
    }
  }

  /* ========================================
9. INITIALIZE
  ======================================== */

  loadMemory();
})();
