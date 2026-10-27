(() => {
  "use strict";

  // Google Apps Script 웹 앱 주소
  const API_URL =
    "https://script.google.com/macros/s/AKfycbxyuDO8t6QSCtANbmOjI7j34-keUQ8EoyAIsbzS-PKq0GmEqfRJdduDTlElxewm4Gk3/exec";

  const $ = (id) => document.getElementById(id);

  const form = $("guestbook-form");
  if (!form) return;

  const listEl = $("guestbook-list");
  const countEl = $("guestbook-count");
  const statusEl = $("guestbook-status");
  const submitBtn = $("guestbook-submit");
  const cancelBtn = $("guestbook-cancel");

  let comments = [];

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#a33" : "#5b7657";
  }

  function apiReady() {
    if (API_URL.includes("PASTE_YOUR")) {
      setStatus("방명록 API 주소를 설정해 주세요.", true);
      return false;
    }
    return true;
  }

  // API GET 요청
  function jsonp(params) {
    return new Promise((resolve, reject) => {
      const callback = "guestbookCb_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const url = new URL(API_URL);

      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      url.searchParams.set("callback", callback);

      const timer = setTimeout(
        () => finish(new Error("요청 시간이 초과됐습니다.")),
        15000,
      );

      function finish(error, data) {
        clearTimeout(timer);
        delete window[callback];
        script.remove();

        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      }

      window[callback] = (data) => finish(null, data);
      script.onerror = () => finish(new Error("방명록을 불러오지 못했습니다."));

      script.src = url.toString();
      document.head.appendChild(script);
    });
  }

  // API POST 요청
  async function post(data) {
    return fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(data),
    });
  }

  // 날짜 표시
  function dateLabel(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  // ==================================================
  // 은듀닷컴 공통 커스텀 모달
  // guestbook.html에 모달 HTML이 있어야 합니다.
  // ==================================================

  const guestbookDialog = (() => {
    const modal = $("guestbook-modal");
    const title = $("gb-modal-title");
    const message = $("gb-modal-message");
    const dialogForm = $("gb-modal-form");
    const input = $("gb-modal-input");
    const textarea = $("gb-modal-textarea");
    const error = $("gb-modal-error");
    const actions = $("gb-modal-actions");
    const cancelButton = $("gb-modal-cancel");
    const submitButton = $("gb-modal-submit");
    const closeButton = $("gb-modal-close");

    const requiredElements = [
      modal,
      title,
      message,
      dialogForm,
      input,
      textarea,
      error,
      actions,
      cancelButton,
      submitButton,
      closeButton,
    ];

    if (requiredElements.some((element) => !element)) {
      console.error(
        "커스텀 모달 HTML이 없습니다. guestbook.html의 모달 요소를 확인해 주세요.",
      );

      return async (options = {}) => {
        const text = options.message || options.title || "알림";
        console.error(text);
        return null;
      };
    }

    let resolveDialog = null;
    let currentType = "message";
    let previousFocus = null;

    function finish(value) {
      if (!resolveDialog) return;

      const resolve = resolveDialog;
      resolveDialog = null;

      modal.hidden = true;
      document.body.style.overflow = "";

      if (previousFocus && previousFocus.isConnected) {
        previousFocus.focus();
      }

      resolve(value);
    }

    function open(options = {}) {
      // 열려 있는 모달이 있다면 먼저 종료합니다.
      if (resolveDialog) {
        finish(null);
      }

      const {
        title: heading = "알림",
        message: content = "",
        type = "message",
        value = "",
        placeholder = "",
        confirmText = "확인",
        cancelText = "취소",
        privateText = "비밀 댓글",
        publicText = "공개 댓글",
        required = false,
      } = options;

      currentType = type;
      previousFocus = document.activeElement;

      title.textContent = heading;
      message.textContent = content;

      input.value = type === "input" || type === "password" ? value : "";

      textarea.value = type === "textarea" ? value : "";

      input.placeholder = placeholder;
      textarea.placeholder = placeholder;

      input.type = type === "password" ? "password" : "text";
      input.autocomplete = type === "password" ? "current-password" : "off";

      input.required = required && (type === "input" || type === "password");

      textarea.required = required && type === "textarea";

      input.hidden = type !== "input" && type !== "password";

      textarea.hidden = type !== "textarea";

      error.hidden = true;
      error.textContent = "";

      const isChoice = type === "choice";
      const isMessage = type === "message";

      cancelButton.hidden = isMessage;
      cancelButton.textContent = isChoice ? publicText : cancelText;

      submitButton.textContent = isChoice ? privateText : confirmText;

      actions.style.justifyContent = isMessage ? "center" : "flex-end";

      modal.hidden = false;
      document.body.style.overflow = "hidden";

      return new Promise((resolve) => {
        resolveDialog = resolve;

        requestAnimationFrame(() => {
          if (modal.hidden) return;

          if (type === "password" || type === "input") {
            input.focus();
          } else if (type === "textarea") {
            textarea.focus();
          } else {
            submitButton.focus();
          }
        });
      });
    }

    dialogForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (currentType === "choice") {
        finish(true);
        return;
      }

      if (currentType === "input" || currentType === "password") {
        finish(input.value);
        return;
      }

      if (currentType === "textarea") {
        finish(textarea.value);
        return;
      }

      finish(true);
    });

    cancelButton.addEventListener("click", () => {
      finish(currentType === "choice" ? false : null);
    });

    closeButton.addEventListener("click", () => {
      finish(null);
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        finish(null);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!modal.hidden && event.key === "Escape") {
        finish(null);
      }
    });

    return open;
  })();

  // ==================================================
  // 댓글 렌더링
  // ==================================================

  function makeButton(label, action, id) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "guestbook__action";
    button.textContent = label;

    button.addEventListener("click", () => action(id));

    return button;
  }

  function render() {
    listEl.replaceChildren();

    const visible = comments
      .filter((comment) => !comment.parentId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt),
      );

    countEl.textContent = `${comments.length}개의 댓글`;

    if (!visible.length) {
      const empty = document.createElement("p");

      empty.className = "guestbook__empty";
      empty.textContent =
        "아직 남겨진 이야기가 없어요. 첫 번째 인사를 건네 주세요.";

      listEl.appendChild(empty);
      return;
    }

    visible.forEach((comment) => {
      listEl.appendChild(renderComment(comment, false));

      comments
        .filter((reply) => reply.parentId === comment.id)
        .forEach((reply) => {
          listEl.appendChild(renderComment(reply, true));
        });
    });
  }

  function renderComment(comment, isReply) {
    const article = document.createElement("article");

    article.className =
      "guestbook__item" + (isReply ? " guestbook__item--reply" : "");

    const meta = document.createElement("div");
    meta.className = "guestbook__meta";

    const name = document.createElement("span");
    name.className = "guestbook__name";
    name.textContent = comment.nickname || "익명";
    meta.appendChild(name);

    const date = document.createElement("time");
    date.textContent = dateLabel(comment.updatedAt || comment.createdAt);
    meta.appendChild(date);

    if (comment.isPrivate) {
      const badge = document.createElement("span");

      badge.className = "guestbook__private-badge";
      badge.textContent = "🔒 비밀 댓글";

      meta.appendChild(badge);
    }

    const content = document.createElement("p");
    content.className = "guestbook__content";

    content.textContent = comment.isPrivate
      ? "비밀 댓글입니다. 작성자는 비밀번호로 내용을 확인할 수 있습니다."
      : comment.content;

    const actions = document.createElement("div");
    actions.className = "guestbook__actions";

    if (!isReply) {
      actions.appendChild(makeButton("답글", replyTo, comment.id));
    }

    if (comment.isPrivate) {
      actions.appendChild(
        makeButton("비밀 댓글 확인", viewPrivate, comment.id),
      );
    }

    actions.appendChild(makeButton("수정", editComment, comment.id));

    actions.appendChild(makeButton("삭제", deleteComment, comment.id));

    article.append(meta, content, actions);

    return article;
  }

  // ==================================================
  // 목록 불러오기
  // ==================================================

  async function load() {
    if (!apiReady()) return;

    listEl.textContent = "방명록을 불러오는 중입니다.";

    try {
      const result = await jsonp({ action: "list" });

      if (!result || !result.ok) {
        throw new Error("목록을 불러오지 못했습니다.");
      }

      comments = Array.isArray(result.comments) ? result.comments : [];

      render();
    } catch (error) {
      listEl.textContent =
        "방명록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

      setStatus(error.message, true);
    }
  }

  // ==================================================
  // 답글 및 작성 폼
  // ==================================================

  function replyTo(id) {
    $("guestbook-parent-id").value = id;
    $("guestbook-content").focus();

    submitBtn.textContent = "답글 남기기";
    cancelBtn.hidden = false;

    setStatus("답글을 작성하고 있습니다.");

    form.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function resetForm() {
    $("guestbook-parent-id").value = "";
    $("guestbook-content").value = "";
    $("guestbook-password").value = "";
    $("guestbook-private").checked = false;

    submitBtn.textContent = "댓글 남기기";
    cancelBtn.hidden = true;

    setStatus("");
  }

  cancelBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!apiReady()) return;

    const nickname = $("guestbook-nickname").value.trim();
    const password = $("guestbook-password").value;
    const content = $("guestbook-content").value.trim();
    const parentId = $("guestbook-parent-id").value;
    const isPrivate = $("guestbook-private").checked;

    if (!nickname || !content) {
      setStatus("닉네임과 내용을 입력해 주세요.", true);
      return;
    }

    if (password.length < 4) {
      setStatus("비밀번호는 4자 이상 입력해 주세요.", true);
      return;
    }

    submitBtn.disabled = true;
    setStatus("댓글을 등록하는 중입니다.");

    try {
      await post({
        action: "create",
        nickname,
        password,
        content,
        parentId,
        isPrivate,
      });

      setStatus("등록 요청을 보냈습니다. 잠시 후 목록을 새로고침합니다.");

      form.reset();
      $("guestbook-parent-id").value = "";
      cancelBtn.hidden = true;
      submitBtn.textContent = "댓글 남기기";

      setTimeout(load, 1800);
    } catch {
      setStatus("등록 요청을 보내지 못했습니다. 다시 시도해 주세요.", true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ==================================================
  // 비밀 댓글 확인
  // ==================================================

  async function viewPrivate(id) {
    const password = await guestbookDialog({
      title: "댓글 보기",
      message: "비밀번호를 입력해 주세요.",
      type: "password",
      placeholder: "비밀번호 입력",
      confirmText: "댓글 확인",
      required: true,
    });

    if (password === null) return;

    try {
      const result = await jsonp({
        action: "verifyPrivate",
        id,
        password,
      });

      if (!result || !result.ok) {
        throw new Error(result?.error || "비밀 댓글을 확인하지 못했습니다.");
      }

      await guestbookDialog({
        title: `${result.nickname || "익명"} 曰`,
        message: result.content || "",
        type: "message",
      });
    } catch (error) {
      await guestbookDialog({
        title: "확인할 수 없어요",
        message: error.message || "비밀 댓글을 확인하지 못했습니다.",
        type: "message",
      });
    }
  }

  // ==================================================
  // 댓글 수정
  // ==================================================

  async function editComment(id) {
    const password = await guestbookDialog({
      title: "댓글 수정",
      message: "이 댓글의 비밀번호를 입력해 주세요.",
      type: "password",
      placeholder: "비밀번호 입력",
      confirmText: "다음",
      required: true,
    });

    if (password === null) return;

    const comment = comments.find((item) => item.id === id);
    if (!comment) return;

    let oldContent = comment.content || "";

    // 비밀 댓글은 비밀번호 검증 후 내용을 가져옵니다.
    if (comment.isPrivate) {
      try {
        const result = await jsonp({
          action: "verifyPrivate",
          id,
          password,
        });

        if (!result || !result.ok) {
          throw new Error(result?.error || "비밀번호가 맞지 않습니다.");
        }

        oldContent = result.content || "";
      } catch (error) {
        await guestbookDialog({
          title: "비밀번호 확인 실패",
          message: error.message || "비밀번호를 확인하지 못했습니다.",
          type: "message",
        });

        return;
      }
    }

    const content = await guestbookDialog({
      title: "댓글 수정하기",
      message: "수정할 내용을 입력해 주세요.",
      type: "textarea",
      value: oldContent,
      placeholder: "댓글 내용을 입력해 주세요.",
      confirmText: "다음",
      required: true,
    });

    if (content === null) return;

    if (!content.trim()) {
      await guestbookDialog({
        title: "내용을 입력해 주세요",
        message: "댓글 내용은 비워 둘 수 없습니다.",
        type: "message",
      });

      return;
    }

    const isPrivate = await guestbookDialog({
      title: "댓글 공개 설정",
      message: "이 댓글을 어떤 방식으로 저장할까요?",
      type: "choice",
      privateText: "비밀 댓글",
      publicText: "공개 댓글",
    });

    if (isPrivate === null) return;

    setStatus("수정 요청을 보내는 중입니다.");

    try {
      await post({
        action: "edit",
        id,
        password,
        content: content.trim(),
        isPrivate,
      });

      setStatus("수정 요청을 보냈습니다. 반영 여부를 확인하는 중입니다.");

      setTimeout(load, 1800);
    } catch {
      await guestbookDialog({
        title: "수정 실패",
        message:
          "댓글 수정 요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
        type: "message",
      });

      setStatus("수정 요청을 보내지 못했습니다.", true);
    }
  }

  // ==================================================
  // 댓글 삭제
  // ==================================================

  async function deleteComment(id) {
    const password = await guestbookDialog({
      title: "댓글 삭제",
      message: "삭제하려면 이 댓글의 비밀번호를 입력해 주세요.",
      type: "password",
      placeholder: "비밀번호 입력",
      confirmText: "다음",
      required: true,
    });

    if (password === null) return;

    const confirmed = await guestbookDialog({
      title: "정말 삭제할까요?",
      message: "삭제한 댓글은 복구할 수 없습니다.",
      type: "choice",
      privateText: "삭제하기",
      publicText: "취소",
    });

    if (confirmed !== true) return;

    setStatus("삭제 요청을 보내는 중입니다.");

    try {
      await post({
        action: "delete",
        id,
        password,
      });

      setStatus("삭제 요청을 보냈습니다. 반영 여부를 확인하는 중입니다.");

      setTimeout(load, 1800);
    } catch {
      await guestbookDialog({
        title: "삭제 실패",
        message: "삭제 요청을 보내지 못했습니다. 다시 시도해 주세요.",
        type: "message",
      });

      setStatus("삭제 요청을 보내지 못했습니다.", true);
    }
  }

  // 최초 목록 불러오기
  load();
})();
