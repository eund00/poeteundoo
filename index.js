const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.getElementById("sidebar");
const sidebarClose = document.getElementById("sidebar-close");
const sidebarOverlay = document.getElementById("sidebar-overlay");

function openSidebar() {
  sidebar.classList.add("is-open");
  sidebarOverlay.classList.add("is-open");
  document.body.classList.add("menu-open");

  sidebar.setAttribute("aria-hidden", "false");
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", "메뉴 닫기");

  sidebarClose.focus();
}

function closeSidebar() {
  sidebar.classList.remove("is-open");
  sidebarOverlay.classList.remove("is-open");
  document.body.classList.remove("menu-open");

  sidebar.setAttribute("aria-hidden", "true");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "메뉴 열기");

  menuToggle.focus();
}

menuToggle.addEventListener("click", () => {
  if (sidebar.classList.contains("is-open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarClose.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

// ESC 키로 닫기
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sidebar.classList.contains("is-open")) {
    closeSidebar();
  }
});

// 메뉴 이동 시 닫기
sidebar.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeSidebar);
});

// 화면 크기 변경 시 사이드바 닫기
window.addEventListener("resize", () => {
  if (window.innerWidth > 900) {
    closeSidebar();
  }
});

/* ========================================
   TV PLAYER
======================================== */

let tvPlayer = null;
let tvVolume = 50;
let tvMuted = true;

// 채널 데이터
let tvChannels = [];
let currentChannel = 0;

// TV 상태
let isTVPlaying = true;

// 로딩 상태
let isYouTubeAPIReady = false;
let isChannelsLoaded = false;
let isPlayerCreated = false;

/* ========================================
   1. YOUTUBE API LOAD
======================================== */

(function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) {
    isYouTubeAPIReady = true;
    checkTVReady();
    return;
  }

  window.onYouTubeIframeAPIReady = function () {
    isYouTubeAPIReady = true;
    checkTVReady();
  };

  if (
    !document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
  ) {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  }
})();

/* ========================================
   2. CREATE PLAYER
======================================== */

function checkTVReady() {
  if (!isYouTubeAPIReady || !isChannelsLoaded || isPlayerCreated) {
    return;
  }

  const firstVideoId = tvChannels[0]?.videoId;

  if (!firstVideoId) {
    console.error("첫 번째 채널의 videoId를 찾을 수 없습니다.", tvChannels);
    return;
  }

  isPlayerCreated = true;
  createTVPlayer(firstVideoId);
}

function createTVPlayer(videoId) {
  tvPlayer = new YT.Player("youtube-player", {
    videoId: videoId,

    playerVars: {
      autoplay: 1,
      controls: 0,
      mute: 1,
      playsinline: 1,
      fs: 0,
      disablekb: 1,
      playlist: videoId,
    },

    events: {
      onReady: function (event) {
        event.target.setVolume(tvVolume);
        event.target.mute();
        event.target.playVideo();

        updateTVButton();

        console.log("TV 플레이어 준비 완료");
      },

      onStateChange: function (event) {
        if (event.data === YT.PlayerState.PLAYING) {
          isTVPlaying = true;
        } else if (event.data === YT.PlayerState.PAUSED) {
          isTVPlaying = false;
        } else if (event.data === YT.PlayerState.ENDED) {
          // 영상이 끝나면 처음부터 다시 재생
          event.target.seekTo(0);
          event.target.playVideo();

          isTVPlaying = true;
        }

        updateTVButton();
      },
    },
  });
}

/* ========================================
   3. VOLUME MUTE
======================================== */

function toggleTVMute() {
  if (!tvPlayer) return;

  const television = document.querySelector(".television");

  if (tvMuted) {
    tvPlayer.unMute();
    tvPlayer.setVolume(tvVolume || 50);

    tvVolume = tvVolume || 50;
    tvMuted = false;

    // 화면 ON
    television?.classList.add("on");
  } else {
    tvPlayer.mute();
    tvMuted = true;

    // 화면 OFF
    television?.classList.remove("on");
  }

  updateTVButton();
}

/* ========================================
   4. CHANNEL CONTROL
======================================== */

// 채널 표시 요소
const channelDisplay = document.querySelector(".television__channel");
const channelNameDisplay = document.querySelector(".television__name span");

// 채널 정보 표시
function updateChannelInfo() {
  const channel = tvChannels[currentChannel];

  if (!channel) return;

  if (channelDisplay) {
    channelDisplay.textContent = channel.channel;
  }

  if (channelNameDisplay) {
    channelNameDisplay.textContent = channel.name;
  }
}

// 채널 데이터 불러오기
async function loadTVChannels() {
  try {
    const response = await fetch("./tv-channels.json");

    if (!response.ok) {
      throw new Error(`채널 데이터 로딩 실패: ${response.status}`);
    }

    tvChannels = await response.json();

    if (!Array.isArray(tvChannels) || tvChannels.length === 0) {
      throw new Error("채널 데이터가 비어 있습니다.");
    }

    // 첫 번째 채널 설정
    currentChannel = 0;

    // 영상 재생 전에 채널 정보부터 표시
    updateChannelInfo();

    // JSON 로딩 완료
    isChannelsLoaded = true;

    // YouTube API 준비 상태 확인
    checkTVReady();

    console.log("TV 채널 데이터 로딩 완료");
  } catch (error) {
    console.error("TV 채널 로딩 오류:", error);
  }
}

// 채널 변경
function changeChannel(direction) {
  if (
    !tvChannels.length ||
    !tvPlayer ||
    typeof tvPlayer.loadVideoById !== "function"
  ) {
    return;
  }

  currentChannel =
    (currentChannel + direction + tvChannels.length) % tvChannels.length;

  const channel = tvChannels[currentChannel];

  // 채널명 변경
  updateChannelInfo();

  // 영상 변경
  tvPlayer.loadVideoById({
    videoId: channel.videoId,
    suggestedQuality: "medium",
  });

  // 음량 및 음소거 상태 유지
  tvPlayer.setVolume(tvVolume);

  if (tvMuted) {
    tvPlayer.mute();
  } else {
    tvPlayer.unMute();
  }

  console.log("현재 채널:", channel.channel);
}

/* ========================================
   5. BUTTON UPDATE
======================================== */

function updateTVButton() {
  const button = document.getElementById("volume-mute");

  if (!button) return;

  button.textContent = tvMuted ? "ON" : "OFF";

  button.setAttribute("aria-label", tvMuted ? "ON" : "OFF");
}

/* ========================================
   6. BUTTON EVENTS
======================================== */

document.addEventListener("DOMContentLoaded", () => {
  // 음소거 / 음소거 해제
  const muteButton = document.getElementById("volume-mute");

  muteButton?.addEventListener("click", toggleTVMute);

  // 채널 내리기
  document
    .getElementById("channel-down")
    ?.addEventListener("click", () => changeChannel(-1));

  // 채널 올리기
  document
    .getElementById("channel-up")
    ?.addEventListener("click", () => changeChannel(1));
});

/* ========================================
   7. INITIALIZE
======================================== */

loadTVChannels();
