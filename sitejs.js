//    ▄▄▄▄   ▄▄▄  ▄▄  ▄▄  ▄▄▄▄  ▄▄▄  ▄▄  ▄▄   ▄▄  ▄▄ ▄▄▄▄▄ ▄▄▄▄▄▄
//    ██▄█▀ ██▀██ ███▄██ ██ ▄▄ ██▀██ ███▄██   ███▄██ ██▄▄    ██
//    ██    ▀███▀ ██ ▀██ ▀███▀ ▀███▀ ██ ▀██ ▄ ██ ▀██ ██▄▄▄   ██

// basic element variables to start
const video = document.getElementById("watchVideo");
const playButton = document.getElementById("playButton");
const captionsButton = document.getElementById("captionsButton");
const settingsButton = document.getElementById("settingsButton");
const watchWrapper = document.getElementById("watchWrapper");
const fullscreenButton = document.getElementById("fullscreenButton");
const lSkipButton = document.getElementById("leftSeconds");
const rSkipButton = document.getElementById("rightSeconds");

const timeBar = document.getElementById("timeBar");
const timeBarLoaded = document.getElementById("timeBarLoaded");
const timeBarCurrentTime = document.getElementById("timeBarCurrentTime");
const timeBarThumb = document.getElementById("timeBarThumb");
const controls = document.getElementById("controls");

const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");
const buffer = document.getElementById("buffer");

const volumeBar = document.getElementById("volumeBar");
const volumeFill = document.getElementById("volumeFill");
const volumeThumb = document.getElementById("volumeThumb");
const volumeButton = document.getElementById("volumeButton");

const watchButton = document.getElementById("watchButton");
const watchMenu = document.getElementById("watchMenu");
const watchCloseButton = document.getElementById("watchClose");

const loadingScreen = document.getElementById("loadingBox");

// actually thats alot of variables god damn

// other variables for controls
let interacted = navigator.userActivation.hasBeenActive;
let videoControllable = false;
let mouse = { x: 0, y: 0};
let timeBarDragging = false;
let timeBarValue = 0;
let videoStarted = false;
let hls = null;
let watchMenuOpen = false;
const params = new URLSearchParams(window.location.search);
const videoStrings = [".m3u8", ".mp4", ".mov", ".mkv", ".avi", ".webm", ".wmv"];
let autoplay = params.get("autoplay") === "true" ? true : false;

// DEBUG VARIABLES
const disableBarDis = false;
const showDebugLogs = false;

function disableControls() {
    controls.style.pointerEvents = "none";
    videoControllable = false;
}
function enableControls() {
    controls.style.pointerEvents = "auto";
    videoControllable = true;
}

// format time from seconds to 0:00:00
function formatTime(seconds) {
  seconds = Math.floor(seconds);

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }

  return `${mins}:${pad(secs)}`;
}

// clamp function
function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

// load up video
function resetVideoUI() {
    videoStarted = false;
    disableControls();

    setVolume(volume);

    timeBarLoaded.style.width = "0%";
    timeBarCurrentTime.style.width = "0%";

    timeBarThumb.style.marginLeft = "calc((var(--timeBarThickness) * -1.25) + 0%)";
    currentTime.textContent = formatTime(0);
    playButton.classList.remove("playing");
    
}

// remove hls to reset
function destroyHLS() {
    if (hls) {
        hls.destroy();
        hls = null;
    }
}

const qualityButtons = document.getElementById("qualitySettingButtons");
const setQuality = document.getElementById("settingsSetQuality");
let qualitiesList = [];
let currentQuality = null;
let videoMode = null; // will be either mp4, m3u8, or mp4Mutli
let mp4MultiList = null;
// load up a video!
function loadVideo(url) {
    if (typeof url !== "string" && typeof url !== "object") return;
    loadingConsole.innerHTML = "";
    disableControls();
    // if custom quality settings
    if (typeof url === "string") {
        // m3u8 or video file
        const cleanPath = new URL(url).pathname.toLowerCase();
        if (!videoStrings.some(ext => cleanPath.endsWith(ext))) return;
        loadingScreen.classList.add("visible");
        watchMenu.classList.remove("open");
        watchMenuOpen = false;
        resetVideoUI();
        autoplay = navigator.userActivation.hasBeenActive ? true : autoplay;
        video.muted = autoplay && !navigator.userActivation.hasBeenActive;
        destroyHLS();
        loadConsoleOutput("Deleting HLS");
        //hls
        if (cleanPath.endsWith(".m3u8")) {
            videoMode = "m3u8";
            loadConsoleOutput("HLS supported!");

            // HLS.js support
            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(url);
                hls.attachMedia(video);
            // Safari native HLS
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                video.src = url;
            }
        // Normal video
        } else {
            videoMode = "mp4";
            loadConsoleOutput("HLS is not supported");
            video.src = url;
        }
        loadConsoleOutput("Loading video");
        video.load();
    } else {
        // i wanna work on this later cuz its hella confusing
        videoMode = "mp4Multi";
        qualitiesList = [];
        mp4MultiList = url;
        for (const quality of url) {
            qualitiesList.unshift(quality.resolution);
        }
        qualityButtons.innerHTML = "";
        for (const quality of qualitiesList) {
            qualityButtons.insertAdjacentHTML("beforeend", `<button class="settingDropdownButton" onclick="changeVideoQuality('${quality}')">${quality}</button>`);
        }
        qualityButtons.insertAdjacentHTML("beforeend", `<div></div>`);
    }

    showDebugLogs && console.log(`loaded "${url}"`);
}

// figure this crap out later lol to confusing
function changeVideoQuality(res) {
    if (qualitiesList.includes(res)) {
        if (currentQuality !== res) {
            video.pause();
            currentQuality = res;
            const time = video.currentTime;
            disableControls();
            video.src = mp4MultiList[qualitiesList.indexOf(res)].file;
            video.load();
        }
    }
}

// load a video from an id (looked up in items.json)
function loadVideoFromId(id) {
    if (videoStarted === true) { autoplay = true; }
    
    if (watchItems[id]) {
        if (watchItems[id].type === 1) {
            
            if (watchItems[id].qualities) {
                loadVideo(watchItems[id].qualities);
            } else {
                loadVideo(watchItems[id].file);
            }
            
            const url = new URL(window.location);
            url.searchParams.set("watch", id);
            window.history.replaceState({}, '', url);
        }
    }
}

// when metadata loads, set aspect ratio among other things
video.addEventListener("loadedmetadata", (e) => {
    document.documentElement.style.setProperty("--aspectRatio", `${video.videoWidth / video.videoHeight}`);
    setQuality.textContent = `${video.videoWidth}x${video.videoHeight}`;
    totalTime.textContent = formatTime(video.duration);
    
    showDebugLogs && console.log("loaded metadata");
});

// update loading bar (middle gray)
video.addEventListener("progress", (e) => {
    if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;

        if (duration > 0) {
            const percentageLoaded = Math.min((bufferedEnd / duration) * 100, 100);
            timeBarLoaded.style.width = `${percentageLoaded}%`;
        }
    }
    
    showDebugLogs && console.log("progress");
});

// when time updates, update indicators of such
video.addEventListener("timeupdate", (e) => {

    if (video.duration && !timeBarDragging) {
        currentTime.textContent = formatTime(video.currentTime);
        timeBarThumb.style.marginLeft = `calc((var(--timeBarThickness) * -1.25) + ${(video.currentTime / video.duration)*100}%)`;
        timeBarCurrentTime.style.width = `${(video.currentTime / video.duration)*100}%`;
    }
    
    showDebugLogs && console.log("time update");
});

// detecting wether video is now playable
video.addEventListener("canplay", (e) => {
    if (!videoStarted) {
        if (autoplay) {
            if (navigator.userActivation.hasBeenActive) {
                video.muted = false;
            } else {
                video.muted = true;
            }
            
            video.play();
        } else {
            video.muted = false;
        }
        
        loadConsoleOutput("Video loaded!");
        videoStarted = true;
    }
    buffer.classList.remove("visible");
    loadingScreen.classList.remove("visible");
    enableControls();
    
    showDebugLogs && console.log("can play");
});

// buffering detection
video.addEventListener("waiting", (e) => {
    buffer.classList.add("visible");
    disableControls();
    
    showDebugLogs && console.log("waiting");
});

//hiding and showing bar
let controlHideTimer;

function hideControls() {
    if (!disableBarDis && !controlsHover && !timeBarDragging && !volumeDragging && !watchMenuOpen && !settingsOpen) {
        controls.classList.add("hidden");
        watchWrapper.classList.add("noMouse");
    }
}
function showControls() {
    controls.classList.remove("hidden");
    watchWrapper.classList.remove("noMouse");
    if (controlHideTimer) {
        clearTimeout(controlHideTimer);
    }
}
function delayHideControls() {
    if (controlHideTimer) {
        clearTimeout(controlHideTimer);
    }
    controlHideTimer = setTimeout(() => {
        hideControls();
    }, 3000);
}

// hide & show controls when exiting video area
let mouseInWatch = false;
watchWrapper.addEventListener("pointerleave", (e) => {
    mouseInWatch = false;
    hideControls();
});
watchWrapper.addEventListener("pointerenter", (e) => {
    mouseInWatch = true;
    showControls();
});

// pause play button feedback
video.addEventListener("playing", (e) => {
    playButton.classList.add("playing");
});
video.addEventListener("ended", (e) => {
    playButton.classList.remove("playing");
});
video.addEventListener("pause", (e) => {
    playButton.classList.remove("playing");
});

const pauseBody = document.getElementById("pauseBody");
playButton.addEventListener("click", pause);
pauseBody.addEventListener("click", pause);

document.addEventListener("pointerdown", () => {
    if (autoplay && !interacted) {
        interacted = true;
        video.muted = false;
        setVolume(savedVolume);

        video.play().catch(console.error);
    }
});

function updateTimeBar() {
    const barRectLeft = timeBar.getBoundingClientRect().left;
    const barRectRight = timeBar.getBoundingClientRect().right;
    const barRectWitdh = timeBar.getBoundingClientRect().width;
    const pospx = mouse.x - barRectLeft;
    const fullPercentage = (clamp(pospx, 0, barRectWitdh)/barRectWitdh)*100;
    timeBarValue = fullPercentage/100;
    currentTime.textContent = formatTime(video.duration * timeBarValue);
    timeBarCurrentTime.style.width = `${fullPercentage}%`;
    timeBarThumb.style.marginLeft = `calc((var(--timeBarThickness) * -1.25) + ${fullPercentage}%)`;
}

// explanetory
function pause() {
    if (!videoControllable) return;
    if (video.paused) {
        video.play();
        delayHideControls();
    } else {
        video.pause();
    }
}

// setting mouse position, time bar
document.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    if (timeBarDragging) {
        updateTimeBar();
    }
    if (mouseInWatch) {
        showControls();
        delayHideControls();
    }
    if (volumeDragging) {
        updateVolume();
    }
});

// time bar controlling
timeBar.addEventListener("pointerdown", (e) => {
    timeBarDragging = true;
    updateTimeBar();
});

document.addEventListener("pointerup", (e) => {
    if (timeBarDragging) {
        timeBarDragging = false;
        video.currentTime = video.duration * timeBarValue;
    }
    
    if (volumeDragging) {
        volumeDragging = false;
        
        if (volume === 0) {
            savedVolume = 100;
        }
    }
});

// keeping controls up even while hovering over it
let controlsHover = false;
controls.addEventListener("pointerenter", () => {
    controlsHover = true;
});
controls.addEventListener("pointerleave", () => {
    controlsHover = false;
});

// handle fullscreen
fullscreenButton.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        document.body.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});
document.addEventListener("fullscreenchange", (e) => {
    if (document.fullscreenElement) {
        fullscreenButton.classList.add("full");
    } else {
        fullscreenButton.classList.remove("full");
    }
    
    showDebugLogs && console.log("fullscreen change");
});

// keybinds
let lastKey = null;
document.addEventListener("keydown", (e) => {
    // im such a funny guy right
    if (e.keyCode === 55 && lastKey === 54) {
        watchWrapper.classList.add("sixSeven");
        setTimeout(() => {
            watchWrapper.classList.remove("sixSeven");
        }, 1500);
    }
    lastKey = e.keyCode;
    
    if (videoControllable) {
        if (e.keyCode === 39) {
            video.currentTime += 10;
        } else if (e.keyCode === 37) {
            video.currentTime -= 10;
        } else if (e.keyCode === 32) {
            if (document.activeElement === playButton || watchMenuOpen) return;
            event.preventDefault();
            pause();
        }
    }
});

// clicking skip
lSkipButton.addEventListener("click", () => {
    video.currentTime -= 10;
});
rSkipButton.addEventListener("click", () => {
    video.currentTime += 10;
});

//volume management
let volumeDragging = false;
let volume = 100; // 0-100 UI volume
let savedVolume = 100;

function volumeEaser(volume) { // ease volume for better interface (human brain is weird idk)
    const x = volume/100;
    const expo = 2;
    return Math.pow(x, expo);
}

// variables for volume classes
let volumeMode = 0;
const volumeClasses = [
    "none",
    "mid",
    "high"
];

// easily update volume
function updateVolume() {
    const barRect = volumeBar.getBoundingClientRect();
    
    const pospx = mouse.x - barRect.left;
    const fullPercentage = (clamp(pospx, 0, barRect.width) / barRect.width) * 100;

    setVolume(fullPercentage);
}

function setVolume(svolume) {
    volume = clamp(svolume, 0, 100);

    video.volume = volumeEaser(volume);
    if (volume === 0) {
        video.muted = true;
    } else if (navigator.userActivation.hasBeenActive || !autoplay) {
        video.muted = false;
    }

    volumeFill.style.width = `${volume}%`;
    volumeThumb.style.marginLeft = `calc((var(--timeBarThickness) * -1.25) + ${volume}%)`;

    let newMode;

    if (volume === 0) {
        newMode = 0;
    } else if (volume < 50) {
        newMode = 1;
    } else {
        newMode = 2;
    }

    if (newMode !== volumeMode) {
        volumeButton.classList.remove("none", "mid", "high");
        volumeButton.classList.add(volumeClasses[newMode]);
        volumeMode = newMode;
    }
}

// some volume bar stuffs
volumeBar.addEventListener('pointerdown', (e) => {
    volumeDragging = true;
    updateVolume();
});
volumeButton.addEventListener("click", () => {
    if (volume === 0) {
        setVolume(savedVolume);
    } else {
        savedVolume = volume;
        setVolume(0);
    }
});

// watch open close
watchButton.addEventListener("click", () => {
    video.pause();
    watchMenu.classList.add("open");
    watchMenuOpen = true;
    disableControls();
});
watchCloseButton.addEventListener("click", () => {
    if (!videoStarted) return;
    watchMenu.classList.remove("open");
    watchMenuOpen = false;
    enableControls();
});

const settingsWrapper = document.getElementById("settingsWrapper");
let settingsOpen = false;
settingsButton.addEventListener("click", () => {
    settingsWrapper.classList.toggle("visible");
    settingsButton.classList.toggle("open");
    settingsOpen = !settingsOpen;
});



// load all items video
const loadingConsole = document.getElementById("loadingConsole");
function loadConsoleOutput(text) {
    loadingConsole.innerHTML += `${text}\n`;
}
async function setUp() {
    loadingConsole.innerHTML = "";
    globalThis.watchItems = await getList("./items.json");
    loadConsoleOutput("Loaded items.json");
    for (const item in watchItems) {
        createItem(item, document.getElementById("allBox"));
        loadConsoleOutput(`Added item "${item}" to watch list`);
    }
    
    if (params.get("watch")) {
        const watchId = params.get("watch");
        
        if (/^https?:\/\//i.test(watchId)) {
            const cleanPath = new URL(watchId).pathname.toLowerCase();
            
            if (videoStrings.some(ext => cleanPath.endsWith(ext))) {
                loadVideo(watchId);
            } else {
                loadVideoFromId(watchId);
            }
        } else {
            loadVideoFromId(watchId);
        }
    } else {
        watchMenu.classList.add("open");
        watchMenuOpen = true;
        loadingScreen.classList.remove("visible");
    }
}

// request json
async function getList(path) {
    try {
        const resp = await fetch(`${path}`);
        
        if (!resp.ok) {
            throw new Error(`http fail: ${resp.status}`);
        }
        
        const data = await resp.json();
        return data;
    } catch (err) {
        console.error("error:", err);
    }
}

function createItem(id, parent) {
    const html = `
    <div onclick="loadVideoFromId('${id}')" class="watchItem">
        <img draggable="false" class="watchItemImg" src="./posters/${id}.webp">
        <div class="watchItemGradient"></div>
        <p class="watchItemTitle">${watchItems[id].name}</p>
        <p class="watchItemType">${watchItems[id].type === 1 ? "Movie" : "TV Show"}</p>
    </div>
    `;
    
    parent.insertAdjacentHTML("beforeend", html);
}

if (new URL(window.location.href).hostname !== "pongonpolygon.github.io") { document.getElementById("betaTestTextWatch").remove(); } else { document.getElementById("pongonnetText").remove(); }

setUp(); // nice function degenerate