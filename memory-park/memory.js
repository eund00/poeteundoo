(() => {
  "use strict";

  const REPO_API =
    "https://api.github.com/repos/eund00/poeteundoo/contents/memory-park/data";

  const memoryList = document.getElementById("memory-list");

  // 메인 페이지에 메모리 영역이 없으면 종료
  if (!memoryList) return;

  // HTML 특수문자 처리
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

  // Markdown 데이터 분석
  function parseMarkdown(markdown) {
    const title =
      markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || "이름 없는 아이템";

    // 첫 번째 이미지 주소 추출
    const image =
      markdown.match(
        /!\[[^\]]*\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/,
      )?.[1] || "";

    // 아이템 정보 추출
    const number = markdown.match(/^-\s*번호:\s*(.+)$/m)?.[1]?.trim() || "";

    const date =
      markdown.match(/^-\s*이별 예정일:\s*(.+)$/m)?.[1]?.trim() || "미정";

    const status = markdown.match(/^-\s*상태:\s*(.+)$/m)?.[1]?.trim() || "";

    // 본문 추출
    const description = markdown
      .replace(/^#\s+.+$/m, "")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
      .replace(/^-\s*(번호|이별 예정일|상태):\s*.+$/gm, "")
      .trim();

    return {
      title,
      image,
      number,
      date,
      status,
      description,
    };
  }

  // 카드 생성
  function createCard(item) {
    return `
      <article class="memory-card swiper-slide">
        <div class="memory-card__image">
          ${
            item.image
              ? `<img
                  src="${escapeHTML(item.image)}"
                  alt="${escapeHTML(item.title)}"
                  loading="lazy"
                >`
              : `<div class="memory-card__empty">NO IMAGE</div>`
          }
        </div>

        <div class="memory-card__info">
          <span>${escapeHTML(item.number)}</span>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.description).replace(/\n/g, "<br>")}</p>
          <small>이별 예정일 : ${escapeHTML(item.date)}</small>
        </div>
      </article>
    `;
  }

  // Markdown 파일 불러오기
  async function loadMemory() {
    try {
      const response = await fetch(REPO_API);

      if (!response.ok) {
        throw new Error("아이템 목록을 불러오지 못했습니다.");
      }

      const files = await response.json();

      const markdownFiles = files
        .filter((file) => file.type === "file" && file.name.endsWith(".md"))
        .sort((a, b) =>
          a.name.localeCompare(a.name, undefined, {
            numeric: true,
          }),
        );

      const items = await Promise.all(
        markdownFiles.map(async (file) => {
          const res = await fetch(file.download_url);

          if (!res.ok) return null;

          const markdown = await res.text();

          return parseMarkdown(markdown);
        }),
      );

      const validItems = items.filter(Boolean);

      // 카드 생성
      memoryList.innerHTML = validItems.map(createCard).join("");

      // Swiper 업데이트
      if (window.memorySwiper) {
        window.memorySwiper.update();
      }
    } catch (error) {
      console.error("Memory Park:", error);

      memoryList.innerHTML = "<p>메모리 파크를 불러오지 못했습니다.</p>";
    }
  }

  loadMemory();
})();
