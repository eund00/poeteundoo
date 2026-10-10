fetch("./interviews.json")
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
