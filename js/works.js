const params = new URLSearchParams(window.location.search);
const workId = params.get("id");

fetch("works.json")
  .then((response) => response.json())
  .then((works) => {
    const work = works.find((item) => item.id === workId);

    if (!work) {
      document.querySelector(".work-detail").innerHTML =
        "<p>작품을 찾을 수 없습니다.</p>";
      return;
    }

    document.querySelector("#work-meta").textContent =
      `${work.year} · ${work.publication}`;

    document.querySelector("#work-title").textContent = work.title;

    document.querySelector("#work-content").innerHTML = work.content;

    document.title = `읽어봐요 : ${work.title}`;
  })
  .catch((error) => {
    console.error("작품을 불러오는 중 오류가 발생했습니다.", error);
  });
