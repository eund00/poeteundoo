import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://jxyucxgpdlfidzwizski.supabase.co";
const SUPABASE_KEY = "sb_publishable_hhdmoi0xScMatNS8Nb9ZVA_FG-DQoG-";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);

const form = $("guestbook-form");
if (form) {
  const listEl = $("guestbook-list");
  const countEl = $("guestbook-count");
  const statusEl = $("guestbook-status");
  const submitBtn = $("guestbook-submit");
  const cancelBtn = $("guestbook-cancel");

  let comments = [];

  // 상태 메시지
  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#a33" : "#5b7657";
  }

  // SHA-256 해시 생성 (기존 시트 salt + password 규격 유지)
  async function hashPassword(salt, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
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
  // 커스텀 모달 (기존 코드 그대로 유지)
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
      return async () => null;
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

      const isMessage = type === "message";
      cancelButton.hidden = isMessage;
      cancelButton.textContent = cancelText;
      submitButton.textContent = confirmText;
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

    cancelButton.addEventListener("click", () => finish(null));
    closeButton.addEventListener("click", () => finish(null));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) finish(null);
    });
    document.addEventListener("keydown", (event) => {
      if (!modal.hidden && event.key === "Escape") finish(null);
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
      .filter((comment) => !comment.parent_id)
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at) -
          new Date(a.updated_at || a.created_at),
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
        .filter((reply) => reply.parent_id === comment.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
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
    date.textContent = dateLabel(comment.updated_at || comment.created_at);
    meta.appendChild(date);

    const content = document.createElement("p");
    content.className = "guestbook__content";

    if (comment.is_private && !comment.unlockedContent) {
      content.textContent = "🔒 비밀 댓글입니다. (클릭해서 확인)";
      content.style.cursor = "pointer";
      content.addEventListener("click", () => readPrivateComment(comment.id));
    } else {
      content.textContent = comment.unlockedContent || comment.content || "";
    }

    const actions = document.createElement("div");
    actions.className = "guestbook__actions";

    if (!isReply) {
      actions.appendChild(makeButton("답글", replyTo, comment.id));
    }
    actions.appendChild(makeButton("수정", editComment, comment.id));
    actions.appendChild(makeButton("삭제", deleteComment, comment.id));

    article.append(meta, content, actions);
    return article;
  }

  // ==================================================
  // 목록 불러오기 (Supabase public_comments 뷰 조회)
  // ==================================================

  async function load() {
    listEl.innerHTML =
      '<div class="guestbook__loading"><span class="guestbook__loading-text"></span><span class="guestbook__dots" aria-hidden="true"><span></span><span></span><span></span></span></div>';

    try {
      const { data, error } = await supabase
        .from("public_comments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      comments = Array.isArray(data) ? data : [];
      render();
    } catch (error) {
      console.error(error);
      listEl.textContent =
        "방명록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      setStatus("목록을 불러오지 못했습니다.", true);
    }
  }

  // ==================================================
  // 비밀글 열람
  // ==================================================

  async function readPrivateComment(id) {
    const password = await guestbookDialog({
      title: "비밀 댓글 확인",
      message: "이 댓글의 비밀번호를 입력해 주세요.",
      type: "password",
      placeholder: "비밀번호 입력",
      confirmText: "확인",
      required: true,
    });

    if (password === null) return;

    const { data, error } = await supabase.rpc("manage_comment", {
      p_action: "read",
      p_id: id,
      p_password: password,
    });

    if (error || !data?.ok) {
      await guestbookDialog({
        title: "확인 실패",
        message: data?.error || "비밀번호가 일치하지 않습니다.",
        type: "message",
      });
      return;
    }

    const target = comments.find((item) => item.id === id);
    if (target) {
      target.unlockedContent = data.content;
      render();
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
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetForm() {
    $("guestbook-parent-id").value = "";
    $("guestbook-content").value = "";
    $("guestbook-password").value = "";

    submitBtn.textContent = "댓글 남기기";
    cancelBtn.hidden = true;
    setStatus("");
  }

  cancelBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nickname = $("guestbook-nickname").value.trim();
    const password = $("guestbook-password").value;
    const content = $("guestbook-content").value.trim();
    const parentId = $("guestbook-parent-id").value || null;
    const isPrivate = Boolean($("guestbook-private")?.checked);

    if (!nickname || !content) {
      setStatus("닉네임과 내용을 입력해 주세요.", true);
      return;
    }

    if (password.length < 4) {
      setStatus("비밀번호는 4자 이상 입력해 주세요.", true);
      return;
    }

    submitBtn.disabled = true;
    setStatus("댓글을 등록하는 중입니다...");

    try {
      const salt = crypto.randomUUID();
      const passwordHash = await hashPassword(salt, password);

      const { error } = await supabase.from("comments").insert([
        {
          parent_id: parentId,
          nickname,
          content,
          is_private: isPrivate,
          salt,
          password_hash: passwordHash,
        },
      ]);

      if (error) throw error;

      setStatus("방명록이 등록되었습니다!");
      form.reset();
      $("guestbook-parent-id").value = "";
      cancelBtn.hidden = true;
      submitBtn.textContent = "댓글 남기기";

      await load();
    } catch (err) {
      console.error(err);
      setStatus("등록에 실패했습니다. 다시 시도해 주세요.", true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ==================================================
  // 댓글 수정
  // ==================================================

  async function editComment(id) {
    const comment = comments.find((item) => item.id === id);
    if (!comment) return;

    const password = await guestbookDialog({
      title: "댓글 수정",
      message: "이 댓글의 비밀번호를 입력해 주세요.",
      type: "password",
      placeholder: "비밀번호 입력",
      confirmText: "다음",
      required: true,
    });

    if (password === null) return;

    // 비밀글이 잠겨 있는 상태라면 먼저 비밀번호를 검증하고 원문을 가져옴
    let initialContent = comment.unlockedContent || comment.content || "";
    if (comment.is_private && !comment.unlockedContent) {
      const { data: readRes, error: readErr } = await supabase.rpc(
        "manage_comment",
        {
          p_action: "read",
          p_id: id,
          p_password: password,
        },
      );

      if (readErr || !readRes?.ok) {
        await guestbookDialog({
          title: "인증 실패",
          message: readRes?.error || "비밀번호가 일치하지 않습니다.",
          type: "message",
        });
        return;
      }
      initialContent = readRes.content;
    }

    const newContent = await guestbookDialog({
      title: "댓글 수정하기",
      message: "수정할 내용을 입력해 주세요.",
      type: "textarea",
      value: initialContent,
      placeholder: "댓글 내용을 입력해 주세요.",
      confirmText: "수정하기",
      required: true,
    });

    if (newContent === null) return;

    if (!newContent.trim()) {
      await guestbookDialog({
        title: "내용을 입력해 주세요",
        message: "댓글 내용은 비워 둘 수 없습니다.",
        type: "message",
      });
      return;
    }

    setStatus("댓글을 수정하는 중입니다...");

    const { data, error } = await supabase.rpc("manage_comment", {
      p_action: "edit",
      p_id: id,
      p_password: password,
      p_new_content: newContent.trim(),
    });

    if (error || !data?.ok) {
      await guestbookDialog({
        title: "수정 실패",
        message: data?.error || "비밀번호가 일치하지 않습니다.",
        type: "message",
      });
      setStatus("수정에 실패했습니다.", true);
      return;
    }

    setStatus("댓글이 수정되었습니다.");
    await load();
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
      type: "message",
      confirmText: "삭제하기",
    });

    if (!confirmed) return;

    setStatus("댓글을 삭제하는 중입니다...");

    const { data, error } = await supabase.rpc("manage_comment", {
      p_action: "delete",
      p_id: id,
      p_password: password,
    });

    if (error || !data?.ok) {
      await guestbookDialog({
        title: "삭제 실패",
        message: data?.error || "비밀번호가 일치하지 않습니다.",
        type: "message",
      });
      setStatus("삭제에 실패했습니다.", true);
      return;
    }

    setStatus("댓글이 삭제되었습니다.");
    await load();
  }

  // 최초 목록 불러오기
  load();
}
