/* ========================================
   INDEX PAGE
   Swiper.js 통합 버전
======================================== */

document.addEventListener("DOMContentLoaded", () => {
  initWorkSlider();
  initMemoryParkSlider();
  initInterviewList();
});

/* ========================================
   1. LATEST WORKS
======================================== */

async function initWorkSlider() {
  const swiperElement = document.getElementById("work-swiper");
  const workList = document.getElementById("work-list");

  if (!swiperElement || !workList) return;

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

    // Swiper 초기화
    new Swiper(swiperElement, {
      slidesPerView: 3,
      slidesPerGroup: 1,
      spaceBetween: 0,
      speed: 500,

      grabCursor: true,
      watchOverflow: true,
      rewind: true,

      // 자동 슬라이드
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },

      // 좌우 버튼
      navigation: {
        prevEl: "#work-prev",
        nextEl: "#work-next",
      },

      // 반응형
      breakpoints: {
        0: {
          slidesPerView: 1,
        },

        601: {
          slidesPerView: 2,
        },

        901: {
          slidesPerView: 3,
        },

        1261: {
          slidesPerView: 4,
        },
      },
    });
  } catch (error) {
    console.error("작품 데이터를 불러오지 못했습니다.", error);
  }

  /* 작품 카드 생성 */

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
      card.className = "work-card swiper-slide";

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
}

/* ========================================
   2. INTERVIEW
======================================== */

async function initInterviewList() {
  const interviewList = document.getElementById("interview-list");

  if (!interviewList) return;

  try {
    const response = await fetch("./interviews/interviews.json");

    if (!response.ok) {
      throw new Error("인터뷰 데이터를 불러오지 못했습니다.");
    }

    const interviews = await response.json();

    // 날짜 기준 최신순 정렬
    interviews.sort((a, b) => {
      const dateA = new Date(a.date.replaceAll(".", "-"));
      const dateB = new Date(b.date.replaceAll(".", "-"));

      return dateB - dateA;
    });

    const fragment = document.createDocumentFragment();

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

      fragment.appendChild(li);
    });

    interviewList.replaceChildren(fragment);
  } catch (error) {
    console.error("인터뷰 목록 오류:", error);
  }
}

/* ========================================
   3. ITEM MEMORY PARK
======================================== */

function initMemoryParkSlider() {
  const swiperElement = document.getElementById("memory-swiper");
  const memoryList = document.getElementById("memory-list");

  if (!swiperElement || !memoryList) return;

  // 현재 존재하는 카드에 Swiper 클래스 적용
  function prepareSlides() {
    Array.from(memoryList.children).forEach((card) => {
      card.classList.add("swiper-slide");
    });
  }

  prepareSlides();

  // Swiper 초기화
  window.memorySwiper = new Swiper(swiperElement, {
    slidesPerView: 5,
    slidesPerGroup: 1,
    spaceBetween: 16,
    speed: 500,

    grabCursor: true,
    watchOverflow: true,

    navigation: {
      prevEl: "#memory-prev",
      nextEl: "#memory-next",
    },

    breakpoints: {
      0: {
        slidesPerView: 2,
      },

      601: {
        slidesPerView: 3,
      },

      901: {
        slidesPerView: 4,
      },

      1261: {
        slidesPerView: 5,
      },
    },
  });

  // 메모리 데이터가 나중에 불러와지는 경우 대응
  const observer = new MutationObserver(() => {
    prepareSlides();
    memorySwiper.update();
  });

  observer.observe(memoryList, {
    childList: true,
  });
}
