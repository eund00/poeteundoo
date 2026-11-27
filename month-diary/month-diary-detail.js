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
      .select("title, diary_date, body_html, background_image")
      .eq("id", diaryId)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    if (!diary) {
      showDiaryError(entry);
      return;
    }

    if (diary.background_image) {
      try {
        const backgroundUrl = new URL(
          diary.background_image,
          window.location.href,
        );

        if (!["http:", "https:"].includes(backgroundUrl.protocol)) {
          throw new Error("배경 이미지는 http 또는 https URL이어야 합니다.");
        }

        document.querySelector(".month-diary-detail").style.backgroundImage =
          `url("${backgroundUrl.href}")`;
      } catch (error) {
        console.error("월간닷컴 배경 이미지를 적용하지 못했습니다.", error);
      }
    }

    document.title = `${diary.title} : 월간닷컴`;

    const article = document.createElement("article");
    article.className = "month-diary-entry";

    const header = document.createElement("header");
    header.className = "month-diary-entry__header";

    const title = document.createElement("h1");
    title.className = "month-diary-entry__title";
    title.textContent = diary.title;

    const date = document.createElement("time");
    date.className = "month-diary-entry__date font-ibm";
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
    article.append(
      header,
      body,
      createHeartControl(db, diaryId),
      createCommentSection(db, diaryId),
    );
    entry.replaceChildren(article);
  } catch (error) {
    console.error("월간닷컴 일기 조회 오류:", error);
    showDiaryError(entry);
  }
});

function createHeartControl(db, diaryId) {
  const section = document.createElement("section");
  section.className = "month-diary-heart";
  section.setAttribute("aria-label", "하트");

  const message = document.createElement("p");
  message.className = "month-diary-heart__message";
  message.innerHTML = "이번 호가 좋았다면 하트 꾹!";

  const button = document.createElement("button");
  button.className = "month-diary-heart__button";
  button.type = "button";
  button.disabled = true;
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-label", "하트 누르기");

  const icon = document.createElement("span");
  icon.className = "month-diary-heart__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "♡";

  const count = document.createElement("span");
  count.className = "month-diary-heart__count";
  count.textContent = "…";

  button.append(icon, count);

  const status = document.createElement("p");
  status.className = "month-diary-heart__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.textContent = "하트 수를 불러오는 중이에요.";

  section.append(message, button, status);

  let voterId;

  function updateHeartState(state) {
    const hasHearted = state.has_hearted;
    button.setAttribute("aria-pressed", String(hasHearted));
    button.setAttribute("aria-label", hasHearted ? "하트 취소" : "하트 누르기");
    icon.textContent = hasHearted ? "💚" : "🤍";
    count.textContent = Number(state.heart_count).toLocaleString("ko-KR");
  }

  async function loadHeartState() {
    const { data, error } = await db.rpc("get_month_diary_heart_state", {
      p_diary_id: diaryId,
      p_voter_id: voterId,
    });

    if (error) throw error;
    if (!data?.[0]) {
      throw new Error("하트 정보를 찾을 수 없습니다.");
    }

    return data[0];
  }

  (async () => {
    try {
      voterId = getOrCreateHeartVoterId();
      updateHeartState(await loadHeartState());
      status.textContent = "";
      button.disabled = false;
    } catch (error) {
      console.error("월간닷컴 하트 정보를 불러오지 못했습니다.", error);
      status.textContent = "하트 정보를 불러오지 못했어요.";
    }
  })();

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "";

    try {
      const { data, error } = await db.rpc("toggle_month_diary_heart", {
        p_diary_id: diaryId,
        p_voter_id: voterId,
      });

      if (error) throw error;
      if (!data?.[0]) {
        throw new Error("하트 변경 결과를 확인할 수 없습니다.");
      }

      updateHeartState(data[0]);
      status.textContent = data[0].has_hearted
        ? "좋아해줘서 고마워!"
        : "고백을 번복한 거야?";
    } catch (error) {
      console.error("월간닷컴 하트 변경 오류:", error);
      status.textContent =
        "하트를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.";
    } finally {
      button.disabled = false;
    }
  });

  return section;
}

function createCommentSection(db, diaryId) {
  const section = document.createElement("section");
  section.className = "month-diary-comments";
  section.setAttribute("aria-labelledby", "month-diary-comments-title");

  const header = document.createElement("div");
  header.className = "month-diary-comments__header";

  const title = document.createElement("h2");
  title.id = "month-diary-comments-title";
  title.textContent = "댓글";

  const count = document.createElement("span");
  count.className = "month-diary-comments__count";
  count.textContent = "불러오는 중…";
  header.append(title, count);

  const list = document.createElement("div");
  list.className = "month-diary-comments__list";
  list.setAttribute("aria-live", "polite");
  list.textContent = "댓글을 불러오고 있어요.";

  const form = document.createElement("form");
  form.className = "month-diary-comments__form";

  const nicknameLabel = document.createElement("label");
  nicknameLabel.textContent = "닉네임";

  const nicknameInput = document.createElement("input");
  nicknameInput.type = "text";
  nicknameInput.name = "nickname";
  nicknameInput.maxLength = 24;
  nicknameInput.autocomplete = "nickname";
  nicknameInput.placeholder = "닉네임";
  nicknameInput.required = true;
  nicknameLabel.appendChild(nicknameInput);

  const passwordLabel = document.createElement("label");
  passwordLabel.textContent = "비밀번호";

  const passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.name = "password";
  passwordInput.minLength = 4;
  passwordInput.maxLength = 100;
  passwordInput.autocomplete = "new-password";
  passwordInput.placeholder = "수정·삭제 시 사용할 비밀번호";
  passwordInput.required = true;
  passwordLabel.appendChild(passwordInput);

  const contentLabel = document.createElement("label");
  contentLabel.textContent = "댓글";

  const contentInput = document.createElement("textarea");
  contentInput.name = "content";
  contentInput.maxLength = 1000;
  contentInput.rows = 3;
  contentInput.placeholder = "따뜻한 댓글을 남겨 주세요.";
  contentInput.required = true;
  contentLabel.appendChild(contentInput);

  const submitButton = document.createElement("button");
  submitButton.className = "month-diary-comments__submit";
  submitButton.type = "submit";
  submitButton.textContent = "댓글 등록";

  const status = document.createElement("p");
  status.className = "month-diary-comments__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  form.append(nicknameLabel, passwordLabel, contentLabel, submitButton);
  section.append(header, list, form, status);

  function renderComments(comments) {
    count.textContent = `${comments.length.toLocaleString("ko-KR")}개`;
    list.replaceChildren();

    if (comments.length === 0) {
      const empty = document.createElement("p");
      empty.className = "month-diary-comments__empty";
      empty.textContent = "아직 댓글이 없어요. 첫 댓글을 남겨 보세요.";
      list.appendChild(empty);
      return;
    }

    comments.forEach((comment) => {
      const item = document.createElement("article");
      item.className = "month-diary-comments__item";

      const meta = document.createElement("div");
      meta.className = "month-diary-comments__meta";

      const nickname = document.createElement("span");
      nickname.className = "month-diary-comments__nickname";
      nickname.textContent = comment.nickname;

      const date = document.createElement("time");
      date.dateTime = comment.created_at;
      const createdAt = new Date(comment.created_at);
      date.textContent = Number.isNaN(createdAt.getTime())
        ? ""
        : createdAt.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
      meta.append(nickname, date);

      const content = document.createElement("p");
      content.className = "month-diary-comments__content";
      content.textContent = comment.content;

      const actions = document.createElement("div");
      actions.className = "month-diary-comments__actions";
      for (const action of ["edit", "delete"]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = action === "edit" ? "수정" : "삭제";
        button.addEventListener("click", () =>
          showCommentManagement(item, comment, action),
        );
        actions.appendChild(button);
      }

      item.append(meta, content, actions);
      list.appendChild(item);
    });
  }

  function showCommentManagement(item, comment, action) {
    item.querySelector(".month-diary-comments__manage")?.remove();

    const form = document.createElement("form");
    form.className = "month-diary-comments__manage";

    let updatedContent;
    if (action === "edit") {
      const contentLabel = document.createElement("label");
      contentLabel.textContent = "댓글 수정";
      updatedContent = document.createElement("textarea");
      updatedContent.value = comment.content;
      updatedContent.maxLength = 1000;
      updatedContent.rows = 3;
      updatedContent.required = true;
      contentLabel.appendChild(updatedContent);
      form.appendChild(contentLabel);
    } else {
      const message = document.createElement("p");
      message.textContent = "삭제하려면 비밀번호를 입력해 주세요.";
      form.appendChild(message);
    }

    const passwordLabel = document.createElement("label");
    passwordLabel.textContent = "비밀번호";
    const password = document.createElement("input");
    password.type = "password";
    password.minLength = 4;
    password.maxLength = 100;
    password.autocomplete = "current-password";
    password.required = true;
    passwordLabel.appendChild(password);

    const controls = document.createElement("div");
    controls.className = "month-diary-comments__manage-actions";

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = action === "edit" ? "저장" : "삭제하기";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "취소";
    cancel.addEventListener("click", () => form.remove());

    controls.append(submit, cancel);
    form.append(passwordLabel, controls);
    item.appendChild(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const newContent = updatedContent?.value.trim();
      if (action === "edit" && !newContent) {
        status.textContent = "댓글 내용을 입력해 주세요.";
        return;
      }
      if (password.value.length < 4) {
        status.textContent = "비밀번호는 4자 이상 입력해 주세요.";
        return;
      }

      submit.disabled = true;
      status.textContent =
        action === "edit"
          ? "댓글을 수정하고 있어요."
          : "댓글을 삭제하고 있어요.";

      try {
        const passwordHash = await hashCommentPassword(
          comment.password_salt,
          password.value,
        );
        const { data, error } = await db.rpc("manage_month_diary_comment", {
          p_action: action,
          p_comment_id: comment.id,
          p_password_hash: passwordHash,
          p_new_content: newContent ?? null,
        });

        if (error) throw error;
        if (data !== true) {
          status.textContent = "비밀번호가 올바르지 않아요.";
          return;
        }

        status.textContent =
          action === "edit" ? "댓글을 수정했어요." : "댓글을 삭제했어요.";
        await loadComments();
      } catch (error) {
        console.error("월간닷컴 댓글 관리 오류:", error);
        status.textContent =
          "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
      } finally {
        submit.disabled = false;
      }
    });
  }

  async function loadComments() {
    try {
      const { data, error } = await db
        .from("month_diary_comments")
        .select("id, nickname, content, created_at, password_salt")
        .eq("diary_id", diaryId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      renderComments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("월간닷컴 댓글을 불러오지 못했습니다.", error);
      count.textContent = "";
      list.textContent =
        "댓글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nickname = nicknameInput.value.trim();
    const content = contentInput.value.trim();
    const password = passwordInput.value;
    if (!nickname || !content || password.length < 4) {
      status.textContent =
        !nickname || !content
          ? "닉네임과 댓글 내용을 입력해 주세요."
          : "비밀번호는 4자 이상 입력해 주세요.";
      return;
    }

    submitButton.disabled = true;
    status.textContent = "댓글을 등록하고 있어요.";

    try {
      const passwordSalt = createUuid();
      const passwordHash = await hashCommentPassword(passwordSalt, password);
      const { data, error } = await db.rpc("add_month_diary_comment", {
        p_diary_id: diaryId,
        p_nickname: nickname,
        p_content: content,
        p_password_salt: passwordSalt,
        p_password_hash: passwordHash,
      });

      if (error) throw error;
      if (!data?.[0]) {
        throw new Error("댓글 등록 결과를 확인할 수 없습니다.");
      }

      form.reset();
      status.textContent = "댓글을 남겼어요.";
      await loadComments();
    } catch (error) {
      console.error("월간닷컴 댓글 등록 오류:", error);
      status.textContent =
        "댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.";
    } finally {
      submitButton.disabled = false;
    }
  });

  loadComments();
  return section;
}

async function hashCommentPassword(salt, password) {
  const data = new TextEncoder().encode(salt + password);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function getOrCreateHeartVoterId() {
  const key = "month-diary-heart-voter-id";
  const storedId = window.localStorage.getItem(key);
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (storedId && uuidPattern.test(storedId)) {
    return storedId;
  }

  const voterId = createUuid();
  window.localStorage.setItem(key, voterId);
  return voterId;
}

function createUuid() {
  if (typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function showDiaryError(container) {
  const message = document.createElement("p");
  message.className = "month-diary-detail__status";
  message.textContent = "일기를 찾을 수 없거나 불러오지 못했어요.";
  container.replaceChildren(message);
}
