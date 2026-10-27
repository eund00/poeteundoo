(() => {
  "use strict";

  // 배포 후 받은 Apps Script 웹 앱 URL로 교체하세요. 반드시 /exec 로 끝나는 URL.
  const API_URL =
    "https://script.google.com/macros/s/AKfycbzAUYP7J0NMpaAeHnY84scmnias1gg9vwuU3qFRDMoEqEcTDN0CTxE3UEP-CUwPac_6/exec";

  const $ = (id) => document.getElementById(id);
  const form = $("guestbook-form");
  if (!form) return;

  const listEl = $("guestbook-list");
  const countEl = $("guestbook-count");
  const statusEl = $("guestbook-status");
  const submitBtn = $("guestbook-submit");
  const cancelBtn = $("guestbook-cancel");
  let comments = [];
  let editTarget = null;

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#a33" : "#5b7657";
  }

  function apiReady() {
    if (API_URL.includes("PASTE_YOUR")) {
      setStatus(
        "아직 방명록 API 주소가 설정되지 않았습니다. js/guestbook.js의 API_URL을 설정해 주세요.",
        true,
      );
      return false;
    }
    return true;
  }

  function jsonp(params) {
    return new Promise((resolve, reject) => {
      const callback = "guestbookCb_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const url = new URL(API_URL);
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.set(key, value),
      );
      url.searchParams.set("callback", callback);
      const timer = setTimeout(
        () => finish(new Error("요청 시간이 초과됐습니다.")),
        15000,
      );
      function finish(error, data) {
        clearTimeout(timer);
        delete window[callback];
        script.remove();
        error ? reject(error) : resolve(data);
      }
      window[callback] = (data) => finish(null, data);
      script.onerror = () => finish(new Error("방명록을 불러오지 못했습니다."));
      script.src = url.toString();
      document.head.appendChild(script);
    });
  }

  // POST는 비밀번호를 URL에 노출하지 않도록 요청 본문으로 전송합니다.
  // Apps Script의 브라우저 CORS 제약 때문에 응답 본문은 읽지 않고,
  // 잠시 후 공개 목록을 다시 불러와 반영 여부를 확인합니다.
  async function post(data) {
    const response = await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
    });
    return response;
  }

  function dateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

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
    const visible = comments.filter((c) => !c.parentId);
    countEl.textContent = `${comments.length}개의 이야기`;
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
        .filter((c) => c.parentId === comment.id)
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
    if (!isReply) actions.appendChild(makeButton("답글", replyTo, comment.id));
    if (comment.isPrivate)
      actions.appendChild(
        makeButton("비밀 댓글 확인", viewPrivate, comment.id),
      );
    actions.appendChild(makeButton("수정", editComment, comment.id));
    actions.appendChild(makeButton("삭제", deleteComment, comment.id));

    article.append(meta, content, actions);
    return article;
  }

  async function load() {
    if (!apiReady()) return;
    listEl.textContent = "방명록을 불러오는 중입니다.";
    try {
      const result = await jsonp({ action: "list" });
      if (!result || !result.ok) throw new Error("목록을 불러오지 못했습니다.");
      comments = Array.isArray(result.comments) ? result.comments : [];
      render();
    } catch (error) {
      listEl.textContent =
        "방명록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      setStatus(error.message, true);
    }
  }

  function replyTo(id) {
    editTarget = null;
    $("guestbook-parent-id").value = id;
    $("guestbook-content").focus();
    submitBtn.textContent = "답글 남기기";
    cancelBtn.hidden = false;
    setStatus("답글을 작성하고 있습니다.");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetForm() {
    editTarget = null;
    $("guestbook-parent-id").value = "";
    $("guestbook-content").value = "";
    $("guestbook-password").value = "";
    $("guestbook-private").checked = false;
    submitBtn.textContent = "댓글 남기기";
    cancelBtn.hidden = true;
    setStatus("");
  }

  async function editComment(id) {
    const password = prompt("이 댓글의 비밀번호를 입력해 주세요.");
    if (password === null) return;
    const comment = comments.find((c) => c.id === id);
    if (!comment) return;
    // 비밀 댓글 내용은 공개 목록에 포함되지 않으므로 먼저 비밀번호로 확인합니다.
    let oldContent = comment.content;
    if (comment.isPrivate) {
      try {
        const result = await jsonp({ action: "verifyPrivate", id, password });
        if (!result.ok)
          throw new Error(result.error || "비밀번호가 맞지 않습니다.");
        oldContent = result.content;
      } catch (error) {
        alert(error.message);
        return;
      }
    }
    const content = prompt("수정할 내용을 입력해 주세요.", oldContent);
    if (content === null || !content.trim()) return;
    const isPrivate = confirm(
      "비밀 댓글로 저장할까요?\n확인: 비밀 댓글 / 취소: 공개 댓글",
    );
    setStatus("수정 요청을 보내는 중입니다.");
    try {
      await post({ action: "edit", id, password, content, isPrivate });
      setStatus("수정 요청을 보냈습니다. 반영 여부를 확인하는 중입니다.");
      setTimeout(load, 1800);
    } catch {
      setStatus("수정 요청을 보내지 못했습니다.", true);
    }
  }

  async function deleteComment(id) {
    const password = prompt("삭제하려면 이 댓글의 비밀번호를 입력해 주세요.");
    if (password === null) return;
    if (!confirm("이 댓글을 삭제할까요?")) return;
    try {
      await post({ action: "delete", id, password });
      setStatus("삭제 요청을 보냈습니다. 반영 여부를 확인하는 중입니다.");
      setTimeout(load, 1800);
    } catch {
      setStatus("삭제 요청을 보내지 못했습니다.", true);
    }
  }

  async function viewPrivate(id) {
    const password = prompt(
      "비밀 댓글을 작성할 때 설정한 비밀번호를 입력해 주세요.",
    );
    if (password === null) return;
    try {
      const result = await jsonp({ action: "verifyPrivate", id, password });
      if (!result.ok)
        throw new Error(result.error || "비밀 댓글을 확인하지 못했습니다.");
      alert(`${result.nickname}\n\n${result.content}`);
    } catch (error) {
      alert(error.message);
    }
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

    if (!nickname || !content)
      return setStatus("닉네임과 내용을 입력해 주세요.", true);
    if (password.length < 4)
      return setStatus("비밀번호는 4자 이상 입력해 주세요.", true);

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

  load();
})();
