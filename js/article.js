const params = new URLSearchParams(window.location.search);
const workId = params.get("id");

fetch("works.json")
  .then((response) => response.json())
  .then((works) => {
    const work = works.find((item) => item.id === workId);

    if (!work) {
      document.querySelector(".work-detail").innerHTML =
        "<div style=text-align:center><img src=https://i.pinimg.com/736x/f0/38/b9/f038b943e1a260071f3dcb72f7ee47d7.jpg></img><p style=margin-top:10px;color:green;font-size:25px;>페이지를 찾을 수 없다치 . . .</p><a href=javascript:history.back(); style=color:green;font-size:25px;>돌아가라치!</a></div>";
      return;
    }

    document.title = `훑어봐요 : ${work.title}`;

    document.querySelector("#work-meta").textContent =
      `${work.year} · ${work.publication}`;

    document.querySelector("#work-title").textContent = work.title;

    document.querySelector("#work-content").innerHTML = work.content;

    const workLink = document.querySelector("#work-link");

    if (work.link === undefined || work.link === "undefined") {
      workLink.style.display = "none";
    } else {
      workLink.setAttribute("href", work.link);
    }

    document.querySelector("#work-img").src = work.img;
  })
  .catch((error) => {
    console.error("작품을 불러오는 중 오류가 발생했습니다.", error);
  });
