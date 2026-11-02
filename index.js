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

// 화면 크기가 바뀌어 PC로 전환될 때 사이드바가 열린 상태로 남지 않도록 아래 코드를 추가
window.addEventListener("resize", () => {
  if (window.innerWidth > 900) {
    closeSidebar();
  }
});

//텔레비전 관련
let tvPlayer = null;
let tvVolume = 50;
let tvMuted = true;

// YouTube API 로드
(function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) {
    createTVPlayer();
    return;
  }

  window.onYouTubeIframeAPIReady = createTVPlayer;

  if (
    !document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
  ) {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  }
})();

// 플레이어 생성
function createTVPlayer() {
  tvPlayer = new YT.Player("youtube-player", {
    videoId: "8D_vrwLv1OM",
    playerVars: {
      autoplay: 1,
      controls: 0,
      mute: 1,
      playsinline: 1,
    },
    events: {
      onReady: function (event) {
        event.target.setVolume(tvVolume);
        event.target.mute();
        event.target.playVideo();
        console.log("TV 플레이어 준비 완료");
      },
    },
  });
}

// 버튼 연결
document.addEventListener("DOMContentLoaded", () => {
  const up = document.getElementById("volume-up");
  const down = document.getElementById("volume-down");
  const mute = document.getElementById("volume-mute");

  if (!up || !down || !mute) {
    console.error("TV 볼륨 버튼을 찾을 수 없습니다.");
    return;
  }

  up.addEventListener("click", () => {
    if (!tvPlayer) return;

    tvVolume = Math.min(tvVolume + 10, 100);
    tvPlayer.setVolume(tvVolume);
    tvPlayer.unMute();
    tvMuted = false;
    updateTVMuteButton();
  });

  down.addEventListener("click", () => {
    if (!tvPlayer) return;

    tvVolume = Math.max(tvVolume - 10, 0);
    tvPlayer.setVolume(tvVolume);

    if (tvVolume === 0) {
      tvPlayer.mute();
      tvMuted = true;
    }

    updateTVMuteButton();
  });

  mute.addEventListener("click", () => {
    if (!tvPlayer) return;

    if (tvMuted) {
      tvPlayer.unMute();
      tvPlayer.setVolume(tvVolume || 50);
      tvVolume = tvVolume || 50;
      tvMuted = false;
    } else {
      tvPlayer.mute();
      tvMuted = true;
    }

    updateTVMuteButton();
  });
});

function updateTVMuteButton() {
  const button = document.getElementById("volume-mute");
  if (button) {
    button.textContent = tvMuted ? "🔇" : "🔊";
  }
}
/* ========================================
   TV CHANNEL CONTROL
======================================== */

// 채널 데이터
let tvChannels = [];
let currentChannel = 0;

// 채널 표시 요소
const channelDisplay = document.querySelector(".television__channel");

// 채널 데이터 불러오기
async function loadTVChannels() {
  try {
    const response = await fetch("./tv-channels.json");

    if (!response.ok) {
      throw new Error("채널 데이터를 불러오지 못했습니다.");
    }

    tvChannels = await response.json();

    if (!tvChannels.length) {
      throw new Error("등록된 채널이 없습니다.");
    }

    // 초기 채널명 표시
    channelDisplay.textContent = tvChannels[currentChannel].name;
  } catch (error) {
    console.error("TV 채널 로드 오류:", error);
  }
}

// 채널 변경 함수
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
  channelDisplay.textContent = channel.name;

  // 영상 변경
  tvPlayer.loadVideoById({
    videoId: channel.videoId,
    suggestedQuality: "medium",
  });

  // 기존 음량 유지
  tvPlayer.setVolume(tvVolume);

  if (tvMuted) {
    tvPlayer.mute();
  } else {
    tvPlayer.unMute();
  }

  console.log("현재 채널:", channel.name);
}

// 채널 버튼 이벤트
document.getElementById("channel-up").addEventListener("click", () => {
  changeChannel(1);
});

document.getElementById("channel-down").addEventListener("click", () => {
  changeChannel(-1);
});

/* ========================================
   TV PLAY / PAUSE
======================================== */

const playPauseButton = document.getElementById("tv-play-pause");

let isTVPlaying = true;

playPauseButton.addEventListener("click", () => {
  if (!tvPlayer || typeof tvPlayer.getPlayerState !== "function") {
    return;
  }

  const playerState = tvPlayer.getPlayerState();

  if (playerState === YT.PlayerState.PLAYING) {
    tvPlayer.pauseVideo();
  } else {
    tvPlayer.playVideo();
  }
});

// 버튼 아이콘 변경
function updatePlayPauseButton() {
  playPauseButton.textContent = isTVPlaying ? "⏸" : "▶";
  playPauseButton.setAttribute("aria-label", isTVPlaying ? "일시정지" : "재생");
}

// 실제 영상 재생 상태와 버튼 동기화
function onTVPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isTVPlaying = true;
  } else if (
    event.data === YT.PlayerState.PAUSED ||
    event.data === YT.PlayerState.ENDED
  ) {
    isTVPlaying = false;
  }

  updatePlayPauseButton();
}

// 채널 데이터 로드 실행
loadTVChannels();
