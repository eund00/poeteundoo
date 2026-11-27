document.addEventListener("DOMContentLoaded", async () => {
  const entry = document.getElementById("month-diary-entry");
  const diaryId = new URLSearchParams(window.location.search).get("id");

  if (!diaryId || !/^\d+$/.test(diaryId)) {
    showDiaryError(entry);
    return;
  }

  try {
    const db = window.supabase.createClient(
      "https://jxyucxgpdlfidzwizski.supabase.co",
      "sb_publishable_hhdmoi0xScMatNS8Nb9ZVA_FG-DQoG-",
    );
    const { data: diary, error } = await db
      .from("month_diaries")
      .select("title, diary_date, body_html")
      .eq("id", diaryId)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    if (!diary) {
      showDiaryError(entry);
      return;
    }

    document.title = `${diary.title} : 월간이은주`;

    const article = document.createElement("article");
    article.className = "month-diary-entry";

    const header = document.createElement("header");
    header.className = "month-diary-entry__header";

    const title = document.createElement("h1");
    title.className = "month-diary-entry__title";
    title.textContent = diary.title;

    const date = document.createElement("time");
    date.className = "month-diary-entry__date";
    date.dateTime = diary.diary_date;
    const [year, month, day] = diary.diary_date.split("-").map(Number);
    date.textContent = new Date(year, month - 1, day).toLocaleDateString(
      "ko-KR",
      { year: "numeric", month: "long", day: "numeric" },
    );

    const body = document.createElement("div");
    body.className = "month-diary-entry__body";
    body.innerHTML = DOMPurify.sanitize(diary.body_html, {
      USE_PROFILES: { html: true },
    });

    header.append(title, date);
    article.append(header, body);
    entry.replaceChildren(article);
  } catch (error) {
    console.error("월간이은주 일기 조회 오류:", error);
    showDiaryError(entry);
  }
});

function showDiaryError(container) {
  const message = document.createElement("p");
  message.className = "month-diary-detail__status";
  message.textContent = "일기를 찾을 수 없거나 불러오지 못했어요.";
  container.replaceChildren(message);
}
