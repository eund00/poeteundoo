/* ========================================
   1. 작품 슬라이더
======================================== */

document.addEventListener("DOMContentLoaded", initWorkSlider);

async function initWorkSlider() {
  const workList = document.getElementById("work-list");
  const viewport = document.querySelector(".work-slider__viewport");
  const prevButton = document.getElementById("work-prev");
  const nextButton = document.getElementById("work-next");

  if (!workList || !viewport || !prevButton || !nextButton) return;

  const AUTO_DELAY = 3000;
  const DRAG_THRESHOLD = 6;
  const SWIPE_THRESHOLD = 50;

  let currentIndex = 0;
  let autoSlide = null;
  let isDragging = false;
  let dragMoved = false;
  let startX = 0;
  let startTranslate = 0;
  let activePointerId = null;
  let suppressClick = false;
  let clickResetTimer = null;

  try {
    const response = await fetch("works/works.json");

    if (!response.ok) {
      throw new Error(`작품 데이터 요청 실패: ${response.status}`);
    }

    const works = await response.json();

    // 최신 작품부터 표시
    const sortedWorks = [...works].reverse();

    if (!sortedWorks.length) return;

    renderWorks(sortedWorks);
    updateSlider();
    startAutoSlide();

    /* 작품 렌더링 */

    function renderWorks(works) {
      const imageNumbers = Array.from(
        { length: works.length },
        (_, index) => index + 1,
      );

      // 배경 이미지 번호 무작위 배정
      for (let i = imageNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [imageNumbers[i], imageNumbers[j]] = [imageNumbers[j], imageNumbers[i]];
      }

      const fragment = document.createDocumentFragment();

      works.forEach((work, index) => {
        const card = document.createElement("article");
        card.className = "work-card";

        const link = document.createElement("a");
        link.className = "work-card__link";
        link.href = `works/work-detail.html?id=${encodeURIComponent(work.id)}`;

        const background = document.createElement("img");
        background.className = "work-card__background";
        background.src = `img/img_bg (${imageNumbers[index]}).jpeg`;
        background.alt = "";
        background.draggable = false;

        const meta = document.createElement("div");
        meta.className = "work-card__meta";

        const publication = document.createElement("div");
        publication.className = "work-card__publication";

        const year = document.createElement("span");
        year.textContent = work.year ?? "";

        const separator = document.createElement("span");
        separator.textContent = " · ";
        separator.setAttribute("aria-hidden", "true");

        const publicationName = document.createElement("span");
        publicationName.textContent = work.publication ?? "";

        publication.append(year, separator, publicationName);

        const type = document.createElement("span");
        type.className = "work-card__type";
        type.textContent = work.kind ?? "";

        meta.append(publication, type);

        const title = document.createElement("h3");
        title.className = "work-card__title";
        title.textContent = work.title ?? "";

        const excerpt = document.createElement("p");
        excerpt.className = "work-card__excerpt";
        excerpt.textContent = work.subtitle ?? "";

        link.append(background, meta, title, excerpt);
        card.appendChild(link);
        fragment.appendChild(card);
      });

      workList.replaceChildren(fragment);
    }

    /* 슬라이더 계산 및 이동 */

    function getVisibleCount() {
      return window.innerWidth <= 768 ? 1 : 3;
    }

    function getMaxIndex() {
      return Math.max(0, workList.children.length - getVisibleCount());
    }

    function getStep() {
      const card = workList.querySelector(".work-card");

      if (!card) return 0;

      const gap = parseFloat(getComputedStyle(workList).gap) || 0;

      return card.getBoundingClientRect().width + gap;
    }

    function updateSlider(animate = true) {
      const maxIndex = getMaxIndex();
      const step = getStep();

      currentIndex = Math.max(0, Math.min(currentIndex, maxIndex));

      workList.style.transition = animate ? "" : "none";

      workList.style.transform = `translate3d(${-currentIndex * step}px, 0, 0)`;

      prevButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex >= maxIndex;

      prevButton.setAttribute("aria-disabled", String(prevButton.disabled));

      nextButton.setAttribute("aria-disabled", String(nextButton.disabled));
    }

    function moveSlider(direction) {
      currentIndex = Math.max(
        0,
        Math.min(getMaxIndex(), currentIndex + direction),
      );

      updateSlider();
      restartAutoSlide();
    }

    prevButton.addEventListener("click", () => {
      moveSlider(-1);
    });

    nextButton.addEventListener("click", () => {
      moveSlider(1);
    });

    /* 자동 슬라이드 */

    function stopAutoSlide() {
      clearInterval(autoSlide);
      autoSlide = null;
    }

    function startAutoSlide() {
      stopAutoSlide();

      if (getMaxIndex() === 0) return;

      autoSlide = setInterval(() => {
        if (isDragging || viewport.matches(":hover")) return;

        currentIndex = currentIndex >= getMaxIndex() ? 0 : currentIndex + 1;

        updateSlider();
      }, AUTO_DELAY);
    }

    function restartAutoSlide() {
      startAutoSlide();
    }

    viewport.addEventListener("mouseenter", stopAutoSlide);
    viewport.addEventListener("mouseleave", startAutoSlide);

    /* 마우스 드래그 및 터치 스와이프 */

    workList.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      isDragging = true;
      dragMoved = false;
      startX = event.clientX;
      startTranslate = currentIndex * getStep();
      activePointerId = event.pointerId;

      stopAutoSlide();
      workList.style.transition = "none";
    });

    // 포인터가 카드 바깥으로 나가도 드래그 추적
    window.addEventListener("pointermove", (event) => {
      if (!isDragging || event.pointerId !== activePointerId) return;

      const diff = event.clientX - startX;

      if (Math.abs(diff) > DRAG_THRESHOLD) {
        dragMoved = true;
      }

      if (!dragMoved) return;

      const maxTranslate = getMaxIndex() * getStep();

      const translate = Math.max(
        0,
        Math.min(maxTranslate, startTranslate - diff),
      );

      workList.style.transform = `translate3d(${-translate}px, 0, 0)`;
    });

    function finishDrag(event, cancelled = false) {
      if (!isDragging || event.pointerId !== activePointerId) return;

      const diff = event.clientX - startX;

      isDragging = false;
      activePointerId = null;

      if (dragMoved) {
        if (!cancelled && Math.abs(diff) >= SWIPE_THRESHOLD) {
          currentIndex = Math.max(
            0,
            Math.min(getMaxIndex(), currentIndex + (diff < 0 ? 1 : -1)),
          );
        }

        // 드래그 직후 발생하는 링크 클릭 방지
        suppressClick = true;
        clearTimeout(clickResetTimer);

        clickResetTimer = setTimeout(() => {
          suppressClick = false;
        }, 400);
      }

      updateSlider();
      startAutoSlide();
    }

    window.addEventListener("pointerup", (event) => {
      finishDrag(event);
    });

    window.addEventListener("pointercancel", (event) => {
      finishDrag(event, true);
    });

    workList.addEventListener(
      "click",
      (event) => {
        if (!suppressClick) return;

        event.preventDefault();
        event.stopPropagation();

        suppressClick = false;
        clearTimeout(clickResetTimer);
      },
      true,
    );

    /* 반응형 대응 */

    window.addEventListener("resize", () => {
      updateSlider();
      restartAutoSlide();
    });
  } catch (error) {
    console.error("작품 데이터를 불러오지 못했습니다.", error);
  }
}

/* ========================================
   2. 인터뷰 목록
======================================== */

fetch("./interviews/interviews.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("인터뷰 데이터를 불러오지 못했습니다.");
    }

    return response.json();
  })

  .then((interviews) => {
    const interviewList = document.getElementById("interview-list");

    // 날짜 기준 최신순 정렬
    interviews.sort((a, b) => {
      const dateA = new Date(a.date.replaceAll(".", "-"));
      const dateB = new Date(b.date.replaceAll(".", "-"));

      return dateB - dateA;
    });

    interviews.forEach((interview) => {
      const li = document.createElement("li");
      li.className = "interview-item";

      const a = document.createElement("a");
      a.href = interview.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";

      const date = document.createElement("span");
      date.className = "interview-item__date";
      date.textContent = interview.date;

      const category = document.createElement("span");
      category.className = "interview-item__category";
      category.textContent = interview.category;

      const title = document.createElement("strong");
      title.className = "interview-item__title";
      title.textContent = interview.title;

      a.append(date, category, title);
      li.appendChild(a);
      interviewList.appendChild(li);
    });
  })

  .catch((error) => {
    console.error("인터뷰 목록 오류:", error);
  });

/* =================================
   ITEM MEMORY PARK SLIDER
================================= */

(() => {
  const list = document.getElementById("memory-list");
  const prev = document.getElementById("memory-prev");
  const next = document.getElementById("memory-next");

  if (!list || !prev || !next) return;

  const cards = Array.from(list.children);

  if (cards.length === 0) return;

  let currentIndex = 0;

  function getVisibleCount() {
    return window.innerWidth <= 768 ? 1 : 2;
  }

  function updateSlider() {
    const visibleCount = getVisibleCount();
    const maxIndex = Math.max(0, cards.length - visibleCount);

    currentIndex = Math.min(currentIndex, maxIndex);

    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(list).gap) || 0;

    list.style.transform = `translateX(-${currentIndex * (cardWidth + gap)}px)`;

    prev.disabled = currentIndex === 0;
    next.disabled = currentIndex >= maxIndex;
  }

  prev.addEventListener("click", () => {
    currentIndex--;
    updateSlider();
  });

  next.addEventListener("click", () => {
    currentIndex++;
    updateSlider();
  });

  window.addEventListener("resize", updateSlider);

  updateSlider();
})();
