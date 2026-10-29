const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");
const video = document.querySelector("#camera");
const startButton = document.querySelector("#startButton");
const statusEl = document.querySelector("#status");
const gestureName = document.querySelector("#gestureName");
const materialName = document.querySelector("#materialName");
const motionValue = document.querySelector("#motionValue");
const cameraToggle = document.querySelector("#cameraToggle");
const volumeSlider = document.querySelector("#volumeSlider");
const sampleInput = document.querySelector("#sampleInput");
const introOverlay = document.querySelector("#introOverlay");
const introSkip = document.querySelector("#introSkip");
const modeButtons = [...document.querySelectorAll(".mode")];

const modes = {
  paper: {
    label: "纸张",
    color: [222, 205, 169],
    gestures: {
      pinch: "轻折纸角",
      point: "纸面点触",
      two: "双页轻拨",
      rub: "纸面摩擦",
      open: "纸页气息",
      near: "近耳纸声",
      swipe: "翻页扫过",
      fist: "收声",
    },
  },
  water: {
    label: "水滴",
    color: [120, 202, 189],
    gestures: {
      pinch: "近耳水滴",
      point: "单点水滴",
      two: "双滴回声",
      rub: "细小水波",
      open: "雨声展开",
      near: "近耳水雾",
      swipe: "水面划过",
      fist: "深水静音",
    },
  },
  glass: {
    label: "玻璃",
    color: [185, 217, 236],
    gestures: {
      pinch: "玻璃轻敲",
      point: "指尖敲杯",
      two: "双点玻璃",
      rub: "杯沿微鸣",
      open: "空间回响",
      near: "贴近回声",
      swipe: "清亮滑音",
      fist: "阻尼",
    },
  },
  fabric: {
    label: "织物",
    color: [208, 167, 187],
    gestures: {
      pinch: "柔软按压",
      point: "布面轻点",
      two: "双指轻刷",
      rub: "织物纹理",
      open: "绒面空气",
      near: "近耳绒感",
      swipe: "毛刷掠过",
      fist: "包裹",
    },
  },
};

const materialAliases = {
  paper: ["paper", "纸", "纸张", "折纸", "paper"],
  water: ["water", "水", "水滴", "雨", "rain", "drop", "droplet"],
  glass: ["glass", "玻璃", "杯", "杯子", "crystal"],
  fabric: ["fabric", "cloth", "布", "织物", "毛刷", "brush", "textile"],
};

const gestureAliases = {
  pinch: ["pinch", "tap", "click", "捏", "捏合", "轻敲", "按压", "drop"],
  point: ["point", "index", "finger", "指向", "食指", "单指", "点触", "单点"],
  two: ["two", "peace", "double", "双指", "两指", "双点", "双滴"],
  rub: ["rub", "scratch", "摩擦", "搓", "擦", "rustle"],
  open: ["open", "ambient", "room", "rain", "张开", "环境", "气息", "雨声"],
  near: ["near", "close", "靠近", "近耳", "贴近", "zoom"],
  swipe: ["swipe", "sweep", "brush", "move", "挥", "挥动", "扫", "掠过", "翻页"],
  fist: ["fist", "mute", "stop", "hold", "握拳", "收声", "静音", "阻尼"],
};

const defaultSamples = [
  ["paper", "pinch", "paper_pinch_01_crumple.mp3"],
  ["paper", "point", "paper_point_01_single-key-type.mp3"],
  ["paper", "two", "paper_two_01_keyboard-key-presses.mp3"],
  ["paper", "rub", "paper_rub_01_papers-wrinkling.mp3"],
  ["paper", "rub", "paper_rub_02_writing-scribble-paper.mp3"],
  ["paper", "open", "paper_open_01_stiff-book-paging.mp3"],
  ["paper", "near", "paper_near_01_browsing-book-pages.mp3"],
  ["paper", "swipe", "paper_swipe_01_paper-slide.mp3"],
  ["paper", "swipe", "paper_swipe_02_page-turn.mp3"],
  ["water", "pinch", "water_pinch_01_water-bubble.mp3"],
  ["water", "pinch", "water_pinch_02_liquid-bubble.mp3"],
  ["water", "two", "water_two_01_heavy-rain-drops.mp3"],
  ["water", "open", "water_open_01_water-flowing-ambience.mp3"],
  ["water", "open", "water_open_02_rain-on-glass.mp3"],
  ["water", "near", "water_near_01_light-rain-loop.mp3"],
  ["water", "swipe", "water_pinch_01_water-bubble.mp3"],
  ["glass", "pinch", "glass_pinch_01_glasses-clinking.mp3"],
  ["glass", "pinch", "glass_pinch_02_wine-glass-clink.mp3"],
  ["glass", "point", "glass_point_01_select-click.mp3"],
  ["glass", "two", "glass_two_01_double-click.mp3"],
  ["glass", "rub", "glass_rub_01_typewriter-soft-click.mp3"],
  ["glass", "open", "glass_pinch_02_wine-glass-clink.mp3"],
  ["glass", "near", "glass_rub_01_typewriter-soft-click.mp3"],
  ["fabric", "pinch", "fabric_pinch_01_soft-cloth-press.mp3"],
  ["fabric", "point", "fabric_point_01_mouse-click-close.mp3"],
  ["fabric", "two", "fabric_two_01_light-switch-tap.mp3"],
  ["fabric", "rub", "fabric_rub_01_cloth-slide.mp3"],
  ["fabric", "open", "fabric_near_01_soft-cloth.mp3"],
  ["fabric", "near", "fabric_near_01_soft-cloth.mp3"],
  ["fabric", "swipe", "fabric_swipe_01_cloth-slide.mp3"],
].map(([material, gesture, fileName]) => ({
  material,
  gesture,
  name: fileName,
  url: `assets/samples/${fileName}`,
}));

let mode = "paper";
let audio;
let stream;
let handLandmarker;
let running = false;
let useCamera = true;
let lastPalm = null;
let lastHandSnapshot = null;
let lastGesture = "Idle";
let lastTrigger = 0;
let rubPhase = 0;
let pointer = { x: 0.5, y: 0.5, speed: 0, active: false };
let landmarks = [];
let particles = [];
let ripples = [];
let outputVolume = Number(volumeSlider.value) / 100;
let lastRawGesture = "idle";
let rawGestureFrames = 0;
let stableGesture = "idle";
let lastVisualRipple = 0;
const soundMotionFloor = 0.06;
const visualMotionFloor = 0.035;

document.body.dataset.mode = mode;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);
resize();

function closeIntro() {
  introOverlay?.classList.add("is-hidden");
}

introSkip?.addEventListener("click", closeIntro);
window.setTimeout(closeIntro, 3200);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    document.body.dataset.mode = mode;
    modeButtons.forEach((item) => item.classList.toggle("active", item === button));
    materialName.textContent = modes[mode].label;
    burst(pointer.x, pointer.y, 18, 0.7);
    if (audio) audio.setMaterial(mode);
  });
});

cameraToggle.addEventListener("change", () => {
  useCamera = cameraToggle.checked;
  video.style.opacity = useCamera ? "1" : "0";
  statusEl.textContent = useCamera
    ? "摄像头模式：用手势触发声音"
    : "鼠标模式：拖动、点击、按住来演奏";
});

volumeSlider.addEventListener("input", () => {
  outputVolume = Number(volumeSlider.value) / 100;
  audio?.setVolume(outputVolume);
});

sampleInput.addEventListener("change", async () => {
  const files = [...sampleInput.files].filter((file) => file.type.startsWith("audio/"));
  if (!files.length) return;
  if (!audio) {
    audio = createAudioEngine();
    await audio.start();
  }
  startButton.disabled = false;
  const result = await audio.loadSamples(files);
  statusEl.textContent = `已导入 ${result.loaded} 个音频素材，真实录音将优先触发`;
  sampleInput.value = "";
});

startButton.addEventListener("click", async () => {
  if (running) return;
  startButton.disabled = true;
  startButton.textContent = "启动中";
  audio = createAudioEngine();
  await audio.start();
  running = true;
  startButton.textContent = "聆听中";
  const builtIn = await audio.loadDefaultSamples(defaultSamples);
  statusEl.textContent = `已加载 ${builtIn.loaded} 个内置素材，正在加载手部识别`;
  await startCameraMode();
});

window.addEventListener("pointermove", (event) => {
  const x = event.clientX / innerWidth;
  const y = event.clientY / innerHeight;
  const dx = x - pointer.x;
  const dy = y - pointer.y;
  pointer.speed = Math.min(1, Math.hypot(dx, dy) * 28);
  pointer.x = x;
  pointer.y = y;
  if (!useCamera && running && event.buttons) {
    triggerGesture(pointer.speed > 0.38 ? "swipe" : "rub", pointer);
  }
});

window.addEventListener("pointerdown", () => {
  pointer.active = true;
  if (running && !useCamera) triggerGesture("pinch", pointer, true);
});

window.addEventListener("pointerup", () => {
  pointer.active = false;
  if (running && !useCamera) triggerGesture("open", pointer);
});

async function startCameraMode() {
  if (!useCamera) {
    landmarks = [];
    video.style.opacity = "0";
    statusEl.textContent = "鼠标模式：拖动、点击、按住来演奏";
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    await loadHandLandmarker();
    statusEl.textContent = "摄像头模式：捏合、指向、双指、摩擦、张开、靠近、挥动、握拳";
    requestAnimationFrame(detectHands);
  } catch (error) {
    useCamera = false;
    cameraToggle.checked = false;
    video.style.opacity = "0";
    statusEl.textContent = "摄像头或识别库不可用，已切换到鼠标演奏";
    console.warn(error);
  }
}

async function loadHandLandmarker() {
  const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18");
  const resolver = await vision.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",
  );
  handLandmarker = await vision.HandLandmarker.createFromOptions(resolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
}

function detectHands() {
  if (!running) return;
  if (useCamera && handLandmarker && video.readyState >= 2) {
    const result = handLandmarker.detectForVideo(video, performance.now());
    if (result.landmarks?.length) {
      landmarks = result.landmarks[0].map((point) => ({ x: 1 - point.x, y: point.y, z: point.z }));
      const hand = analyzeHand(landmarks);
      hand.gesture = stabilizeGesture(hand.gesture);
      pointer = { ...pointer, x: hand.x, y: hand.y, speed: hand.speed };
      updateMovementEffects(pointer);
      triggerGesture(hand.gesture, pointer, hand.force);
    } else {
      landmarks = [];
      lastPalm = null;
      lastHandSnapshot = null;
      setGesture("等待");
      audio?.shape("idle", pointer);
    }
  }
  requestAnimationFrame(detectHands);
}

function analyzeHand(points) {
  const palm = midpoint(points[0], points[9]);
  const thumbIndex = distance(points[4], points[8]);
  const indexMiddle = distance(points[8], points[12]);
  const extended = {
    index: fingerExtension(points, 8, 6, 5),
    middle: fingerExtension(points, 12, 10, 9),
    ring: fingerExtension(points, 16, 14, 13),
    pinky: fingerExtension(points, 20, 18, 17),
  };
  const spread = [8, 12, 16, 20].reduce((sum, id) => sum + distance(points[id], points[0]), 0) / 4;
  const extendedCount = Object.values(extended).filter(Boolean).length;
  const fistTight = spread < 0.23 && extendedCount <= 1 && thumbIndex > 0.075;
  const open = spread > 0.31 && extendedCount >= 3;
  const near = spread > 0.43 && extendedCount >= 3;
  const pinch = thumbIndex < 0.055;
  const rubbing = thumbIndex < 0.095 && indexMiddle < 0.09 && extended.index && extended.middle;
  const point = extended.index && !extended.middle && !extended.ring && !extended.pinky;
  const two = extended.index && extended.middle && !extended.ring && !extended.pinky;
  const dx = lastPalm ? palm.x - lastPalm.x : 0;
  const dy = lastPalm ? palm.y - lastPalm.y : 0;
  const palmMotion = Math.hypot(dx, dy);
  const motionIds = [0, 4, 8, 12, 16, 20];
  const fingerMotion = lastHandSnapshot
    ? motionIds.reduce((sum, id) => sum + distance(points[id], lastHandSnapshot[id]), 0) / motionIds.length
    : 0;
  const rawMotion = Math.max(palmMotion, fingerMotion * 1.18);
  const speed = rawMotion < 0.0018 ? 0 : Math.min(1, rawMotion * 42);
  lastPalm = palm;
  lastHandSnapshot = points.map((point) => ({ x: point.x, y: point.y, z: point.z }));

  let gesture = "idle";
  if (fistTight) gesture = "fist";
  else if (speed > 0.36) gesture = "swipe";
  else if (pinch) gesture = "pinch";
  else if (rubbing) gesture = "rub";
  else if (point) gesture = "point";
  else if (two) gesture = "two";
  else if (near) gesture = "near";
  else if (open) gesture = "open";

  return {
    gesture,
    x: palm.x,
    y: palm.y,
    speed,
    force: speed > soundMotionFloor && (pinch || point || two || speed > 0.5),
  };
}

function stabilizeGesture(nextGesture) {
  if (nextGesture !== lastRawGesture) {
    lastRawGesture = nextGesture;
    rawGestureFrames = 1;
  } else {
    rawGestureFrames += 1;
  }

  const requiredFrames = {
    idle: 1,
    pinch: 1,
    rub: 2,
    swipe: 1,
    point: 3,
    two: 3,
    open: 3,
    near: 4,
    fist: 3,
  }[nextGesture] || 2;

  if (rawGestureFrames >= requiredFrames) stableGesture = nextGesture;
  return stableGesture;
}

function triggerGesture(gesture, point, force = false) {
  const now = performance.now();
  if (gesture === "idle") {
    setGesture("等待");
    audio?.shape("idle", point);
    return;
  }

  const voice = modes[mode].gestures[gesture] || gesture;
  if (!force && point.speed < soundMotionFloor) {
    setGesture(`静止：${voice}`);
    audio?.shape("idle", point);
    return;
  }

  const interval = gesture === "rub" ? 145 : gesture === "open" || gesture === "near" ? 300 : 220;
  if (!force && now - lastTrigger < interval && gesture === lastGesture.toLowerCase()) {
    audio?.shape(gesture, point);
    updateMovementEffects(point, true);
    return;
  }

  lastTrigger = now;
  lastGesture = gesture[0].toUpperCase() + gesture.slice(1);
  setGesture(voice);
  audio?.play(gesture, point);
  const visual = {
    open: [8, 0.62, 46],
    near: [22, 0.38, 62],
    point: [6, 0.42, 28],
    two: [12, 0.5, 34],
    swipe: [18, 1.2, 52],
  }[gesture] || [14, 0.72, 38];
  burst(point.x, point.y, visual[0], visual[1]);
  ripples.push({ x: point.x, y: point.y, age: 0, life: visual[2] });
  addHandRipples(point, gesture);
}

function setGesture(label) {
  gestureName.textContent = label;
  motionValue.textContent = `${Math.round(pointer.speed * 100)}%`;
}

function createAudioEngine() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  const master = context.createGain();
  const lowpass = context.createBiquadFilter();
  const panner = context.createStereoPanner();
  const delay = context.createDelay(1);
  const feedback = context.createGain();
  const wet = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const output = context.createGain();
  const hum = context.createOscillator();
  const humGain = context.createGain();
  const sampleBank = createEmptySampleBank();
  let gateOpen = false;

  master.gain.value = 0.68;
  lowpass.type = "lowpass";
  lowpass.frequency.value = 3200;
  delay.delayTime.value = 0.12;
  feedback.gain.value = 0.1;
  wet.gain.value = 0.07;
  compressor.threshold.value = -12;
  compressor.knee.value = 22;
  compressor.ratio.value = 1.5;
  compressor.attack.value = 0.018;
  compressor.release.value = 0.24;
  hum.type = "sine";
  hum.frequency.value = 74;
  humGain.gain.value = 0.004;
  output.gain.value = 0.0001;

  lowpass.connect(panner).connect(master).connect(compressor).connect(output).connect(context.destination);
  lowpass.connect(wet).connect(delay).connect(feedback).connect(delay);
  delay.connect(master);
  hum.connect(humGain).connect(compressor);
  hum.start();

  function setMaterial(nextMode) {
    const values = {
      paper: [2700, 0.08, 0.055, 64],
      water: [3000, 0.18, 0.095, 82],
      glass: [3900, 0.24, 0.11, 96],
      fabric: [1900, 0.06, 0.045, 58],
    }[nextMode];
    lowpass.frequency.setTargetAtTime(values[0], context.currentTime, 0.04);
    delay.delayTime.setTargetAtTime(values[1], context.currentTime, 0.06);
    wet.gain.setTargetAtTime(values[2], context.currentTime, 0.08);
    hum.frequency.setTargetAtTime(values[3], context.currentTime, 0.1);
  }

  async function loadSamples(files) {
    let loaded = 0;
    for (const file of files) {
      try {
        const buffer = await context.decodeAudioData(await file.arrayBuffer());
        const target = inferSampleTarget(file.name);
        sampleBank[target.material][target.gesture].push({
          buffer,
          name: file.name,
        });
        loaded += 1;
      } catch (error) {
        console.warn(`Cannot decode audio file: ${file.name}`, error);
      }
    }
    return { loaded };
  }

  async function loadDefaultSamples(samples) {
    let loaded = 0;
    for (const sample of samples) {
      try {
        const response = await fetch(sample.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        sampleBank[sample.material][sample.gesture].push({
          buffer,
          name: sample.name,
        });
        loaded += 1;
      } catch (error) {
        console.warn(`Cannot load built-in sample: ${sample.name}`, error);
      }
    }
    return { loaded };
  }

  function playSample(gesture, point) {
    const candidates = sampleBank[mode]?.[gesture] || [];
    if (!candidates.length) return false;

    const source = context.createBufferSource();
    const gain = context.createGain();
    const samplePanner = context.createStereoPanner();
    const item = candidates[Math.floor(Math.random() * candidates.length)];
    const duration = Math.min(item.buffer.duration, gesture === "open" ? 2.8 : 1.45);
    const now = context.currentTime;
    const motion = Math.min(point.speed, 0.7);

    source.buffer = item.buffer;
    source.playbackRate.value = 0.96 + Math.random() * 0.08;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.78 + motion * 0.22, now + 0.025);
    gain.gain.setTargetAtTime(0.0001, now + Math.max(0.06, duration - 0.08), 0.035);
    samplePanner.pan.setValueAtTime((point.x - 0.5) * 1.2, now);

    source.connect(gain).connect(samplePanner).connect(output);
    source.start(now, 0, duration);
    source.stop(now + duration + 0.08);
    shape("sample", point);
    return true;
  }

  function noise(duration, color = "soft") {
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    let slow = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.018 * white) / 1.018;
      slow = slow * 0.985 + white * 0.015;
      if (color === "brown") data[i] = last * 2.2;
      else if (color === "silk") data[i] = last * 1.15 + slow * 0.35;
      else if (color === "air") data[i] = white * 0.26 + last * 0.74;
      else data[i] = white * 0.38 + last * 0.62;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function envelope(target, peak, duration, fade = 0.028) {
    const now = context.currentTime;
    target.gain.cancelScheduledValues(now);
    target.gain.setValueAtTime(0.0001, now);
    target.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + fade);
    target.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  }

  function connect(source, gainValue, point, filterType = "bandpass", frequency = 1800, duration = 0.18, q = 0.95) {
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    source.connect(filter).connect(gain).connect(lowpass);
    envelope(gain, gainValue, duration);
    source.start();
    source.stop(context.currentTime + duration + 0.04);
    shape("active", point);
  }

  function tone(frequency, duration, gainValue, point, type = "sine", detune = 0) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    osc.connect(gain).connect(lowpass);
    envelope(gain, gainValue, duration, 0.012);
    osc.start();
    osc.stop(context.currentTime + duration + 0.08);
    shape("active", point);
  }

  function grains(point, count, duration, baseFrequency, gainValue, color = "soft") {
    for (let i = 0; i < count; i += 1) {
      const source = noise(duration * random(0.45, 1), color);
      const gain = gainValue * random(0.55, 1.15);
      const freq = baseFrequency * random(0.72, 1.34);
      setTimeout(() => connect(source, gain, point, "bandpass", freq, duration, random(0.7, 1.8)), i * random(18, 38));
    }
  }

  function tap(point) {
    if (mode === "paper") {
      tone(random(190, 260), 0.07, 0.016, point, "triangle");
      connect(noise(0.12, "soft"), 0.016, point, "bandpass", random(900, 1500), 0.13, 0.8);
      grains(point, 3, 0.07, 1450, 0.006, "soft");
      return;
    }
    if (mode === "water") {
      tone(random(430, 620), 0.16, 0.022, point, "sine");
      tone(random(110, 150), 0.24, 0.01, point, "sine");
      connect(noise(0.18, "brown"), 0.012, point, "lowpass", random(520, 880), 0.2, 0.65);
      grains(point, 2, 0.08, 1150, 0.0045, "air");
      return;
    }
    if (mode === "glass") {
      tone(random(980, 1280), 0.28, 0.028, point, "sine");
      tone(random(1450, 1750), 0.18, 0.01, point, "sine", random(-4, 4));
      connect(noise(0.04, "air"), 0.004, point, "bandpass", 2400, 0.045, 1.4);
      return;
    }
    tone(random(120, 170), 0.13, 0.014, point, "triangle");
    connect(noise(0.2, "silk"), 0.018, point, "lowpass", random(360, 620), 0.22, 0.55);
    grains(point, 3, 0.09, 620, 0.006, "silk");
  }

  function rub(point) {
    rubPhase = (rubPhase + 1) % 4;
    const color = mode === "fabric" ? "silk" : mode === "water" ? "brown" : "soft";
    const freq = { paper: 1150, water: 620, glass: 1850, fabric: 480 }[mode] + rubPhase * random(30, 70);
    const motion = Math.min(point.speed, 0.55);
    connect(noise(0.26, color), 0.014 + motion * 0.024, point, "bandpass", freq, 0.3, mode === "glass" ? 1.8 : 0.9);
    connect(noise(0.34, color), 0.006 + motion * 0.008, point, "lowpass", mode === "glass" ? 1800 : 760, 0.36, 0.55);
    if (mode === "glass" && Math.random() < 0.22) tone(random(1180, 1500), 0.16, 0.008, point, "sine");
  }

  function pointTap(point) {
    const table = {
      paper: [520, 0.012, 980, "soft"],
      water: [760, 0.018, 720, "air"],
      glass: [1350, 0.018, 1800, "air"],
      fabric: [260, 0.012, 460, "silk"],
    }[mode];
    tone(random(table[0] * 0.9, table[0] * 1.12), 0.12, table[1], point, mode === "glass" ? "sine" : "triangle");
    connect(noise(0.08, table[3]), table[1] * 0.55, point, "bandpass", random(table[2] * 0.8, table[2] * 1.25), 0.1, 0.85);
  }

  function twoTap(point) {
    pointTap(point);
    setTimeout(() => pointTap({ ...point, x: Math.min(1, point.x + 0.035) }), 72);
  }

  function open(point) {
    const color = mode === "fabric" ? "silk" : mode === "water" ? "brown" : "air";
    connect(noise(0.76, color), 0.012, point, "lowpass", mode === "glass" ? 2300 : 1500, 0.72, 0.55);
    connect(noise(0.42, "air"), 0.0045, point, "bandpass", mode === "paper" ? 1500 : 1900, 0.42, 0.75);
    if (mode === "water") grains(point, 3, 0.09, 980, 0.004, "air");
  }

  function nearBloom(point) {
    const color = mode === "fabric" ? "silk" : mode === "water" ? "brown" : "air";
    const base = { paper: 1150, water: 900, glass: 1450, fabric: 560 }[mode];
    connect(noise(0.64, color), 0.01, point, "lowpass", base, 0.62, 0.45);
    if (mode === "glass") tone(random(860, 1120), 0.32, 0.008, point, "sine");
  }

  function swipe(point) {
    const source = noise(0.38, mode === "fabric" ? "silk" : mode === "water" ? "brown" : "soft");
    const motion = Math.min(point.speed, 0.65);
    connect(source, 0.026 + motion * 0.026, point, "bandpass", 780 + motion * 1450, 0.38, mode === "glass" ? 1.6 : 0.85);
    connect(noise(0.24, "air"), 0.007, point, "lowpass", 1350 + motion * 900, 0.26, 0.55);
    if (mode === "paper") grains(point, 4, 0.07, 1300, 0.0055, "soft");
    if (mode === "glass") tone(random(980, 1300), 0.2, 0.014, point, "sine");
  }

  function fist(point) {
    lowpass.frequency.setTargetAtTime(460, context.currentTime, 0.04);
    humGain.gain.setTargetAtTime(0.0015, context.currentTime, 0.05);
    setTimeout(() => setMaterial(mode), 360);
    shape("fist", point);
  }

  function play(gesture, point) {
    if (playSample(gesture, point)) return;
    const actions = { pinch: tap, point: pointTap, two: twoTap, rub, open, near: nearBloom, swipe, fist };
    actions[gesture]?.(point);
  }

  function shape(gesture, point) {
    const now = context.currentTime;
    const motion = Math.min(point.speed, 0.55);
    gateOpen = gesture !== "idle";
    output.gain.setTargetAtTime(gateOpen ? outputVolume : 0.0001, now, gateOpen ? 0.035 : 0.028);
    panner.pan.setTargetAtTime((point.x - 0.5) * 1.25, now, 0.06);
    lowpass.frequency.setTargetAtTime(900 + (1 - point.y) * 2400 + motion * 520, now, 0.12);
    master.gain.setTargetAtTime(gesture === "idle" ? 0.52 : 0.72 + motion * 0.16, now, 0.14);
    humGain.gain.setTargetAtTime(gesture === "fist" ? 0.0015 : 0.0035 + motion * 0.002, now, 0.16);
  }

  setMaterial(mode);

  return {
    start: () => context.resume(),
    play,
    shape,
    loadSamples,
    loadDefaultSamples,
    setMaterial,
    setVolume: (value) => {
      outputVolume = value;
      output.gain.setTargetAtTime(gateOpen ? value : 0.0001, context.currentTime, 0.05);
    },
  };
}

function createEmptySampleBank() {
  return Object.fromEntries(
    Object.keys(modes).map((material) => [
      material,
      Object.fromEntries(Object.keys(gestureAliases).map((gesture) => [gesture, []])),
    ]),
  );
}

function inferSampleTarget(fileName) {
  const normalized = fileName.toLowerCase();
  const material =
    Object.entries(materialAliases).find(([, aliases]) =>
      aliases.some((alias) => normalized.includes(alias.toLowerCase())),
    )?.[0] || mode;
  const gesture =
    Object.entries(gestureAliases).find(([, aliases]) =>
      aliases.some((alias) => normalized.includes(alias.toLowerCase())),
    )?.[0] || "pinch";
  return { material, gesture };
}

function fingerExtension(points, tipId, pipId, mcpId) {
  const wrist = points[0];
  const tipDistance = distance(points[tipId], wrist);
  const pipDistance = distance(points[pipId], wrist);
  const mcpDistance = distance(points[mcpId], wrist);
  const fingerLength = distance(points[tipId], points[mcpId]);
  const knuckleLength = distance(points[pipId], points[mcpId]);
  return tipDistance > pipDistance * 1.08 && tipDistance > mcpDistance * 1.28 && fingerLength > knuckleLength * 1.35;
}

function draw() {
  const w = innerWidth;
  const h = innerHeight;
  const material = modes[mode];

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255, 250, 238, 0.015)";
  ctx.fillRect(0, 0, w, h);

  drawBreathingField(w, h, material.color);
  drawLandmarks(w, h, material.color);
  drawParticles(w, h, material.color);
  drawRipples(w, h, material.color);
  idleDust(w, h, material.color);

  requestAnimationFrame(draw);
}

function drawBreathingField(w, h, color) {
  const t = performance.now() * 0.001;
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = `rgba(${Math.max(0, color[0] - 70)}, ${Math.max(0, color[1] - 70)}, ${Math.max(0, color[2] - 70)}, 0.26)`;
  for (let y = 0; y < h; y += 34) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 28) {
      const wave = Math.sin(x * 0.011 + t * 0.8 + y * 0.018) * 5;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawLandmarks(w, h, color) {
  if (!landmarks.length) {
    return;
  }
  const chains = [
    [0, 1, 2, 3, 4],
    [0, 5, 6, 7, 8],
    [0, 9, 10, 11, 12],
    [0, 13, 14, 15, 16],
    [0, 17, 18, 19, 20],
    [5, 9, 13, 17],
  ];
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  chains.forEach((chain) => {
    ctx.beginPath();
    chain.forEach((id, index) => {
      const point = landmarks[id];
      const x = point.x * w;
      const y = point.y * h;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = `rgba(${Math.max(0, color[0] - 75)}, ${Math.max(0, color[1] - 75)}, ${Math.max(0, color[2] - 75)}, 0.72)`;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = `rgba(255, 255, 255, 0.72)`;
    ctx.shadowBlur = 10;
    ctx.stroke();
  });
  landmarks.forEach((point, index) => {
    const size = [4, 8, 12, 16, 20].includes(index) ? 5.5 : 3.2;
    ctx.beginPath();
    ctx.arc(point.x * w, point.y * h, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.max(0, color[0] - 68)}, ${Math.max(0, color[1] - 68)}, ${Math.max(0, color[2] - 68)}, ${index % 4 ? 0.7 : 0.95})`;
    ctx.fill();
  });
  ctx.restore();
}

function burst(x, y, count, power) {
  const color = modes[mode].color;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.3 + Math.random() * 1.4) * power;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed * 0.003,
      vy: Math.sin(angle) * speed * 0.003,
      size: 1.5 + Math.random() * 4,
      age: 0,
      life: 42 + Math.random() * 42,
      color,
    });
  }
}

function updateMovementEffects(point, dense = false) {
  const now = performance.now();
  if (point.speed < visualMotionFloor || now - lastVisualRipple < (dense ? 90 : 145)) return;
  lastVisualRipple = now;
  addHandRipples(point, "motion");
}

function addHandRipples(point, gesture = "motion") {
  const motion = Math.min(1, Math.max(0.15, point.speed));
  const ids = landmarks.length ? [0, 4, 8, 12, 16, 20] : [];
  const anchors = ids.length
    ? ids.map((id) => landmarks[id]).filter(Boolean)
    : [{ x: point.x, y: point.y }];
  const count = gesture === "swipe" ? 5 : gesture === "motion" ? 3 : 4;

  for (let i = 0; i < count; i += 1) {
    const anchor = anchors[Math.floor(Math.random() * anchors.length)];
    const jitter = 0.014 + motion * 0.012;
    ripples.push({
      x: anchor.x + (Math.random() - 0.5) * jitter,
      y: anchor.y + (Math.random() - 0.5) * jitter,
      age: 0,
      life: 28 + Math.random() * 28 + motion * 18,
      radius: 0.028 + Math.random() * 0.035 + motion * 0.035,
      kind: "droplet",
    });
  }
}

function drawParticles(w, h) {
  particles = particles.filter((particle) => particle.age < particle.life);
  particles.forEach((particle) => {
    particle.age += 1;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.000014;
    const alpha = 1 - particle.age / particle.life;
    ctx.beginPath();
    ctx.arc(particle.x * w, particle.y * h, particle.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${particle.color[0]}, ${particle.color[1]}, ${particle.color[2]}, ${alpha * 0.78})`;
    ctx.fill();
  });
}

function drawRipples(w, h, color) {
  ripples = ripples.filter((ripple) => ripple.age < ripple.life);
  ripples.forEach((ripple) => {
    ripple.age += 1;
    const t = ripple.age / ripple.life;
    const radius = ripple.kind === "droplet"
      ? t * Math.min(w, h) * ripple.radius
      : t * Math.min(w, h) * 0.22;
    const alpha = ripple.kind === "droplet" ? (1 - t) * 0.42 : (1 - t) * 0.32;
    if (ripple.kind === "droplet") {
      const glow = ctx.createRadialGradient(ripple.x * w, ripple.y * h, 0, ripple.x * w, ripple.y * h, radius * 1.45);
      glow.addColorStop(0, `rgba(255, 255, 255, ${(1 - t) * 0.13})`);
      glow.addColorStop(0.48, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${(1 - t) * 0.08})`);
      glow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(ripple.x * w - radius * 1.5, ripple.y * h - radius * 1.5, radius * 3, radius * 3);
    }
    ctx.beginPath();
    ctx.arc(ripple.x * w, ripple.y * h, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.lineWidth = ripple.kind === "droplet" ? 0.8 + (1 - t) * 1.4 : 1 + (1 - t) * 2;
    ctx.stroke();
  });
}

function idleDust(w, h, color) {
  if (Math.random() < 0.22) {
    particles.push({
      x: Math.random(),
      y: 1.05,
      vx: (Math.random() - 0.5) * 0.0006,
      vy: -0.0007 - Math.random() * 0.001,
      size: 1 + Math.random() * 2.4,
      age: 0,
      life: 120 + Math.random() * 80,
      color,
    });
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

draw();
