/* =========================================================
   Echoes for 夜寒
   Web Audio API Sound Engine
   ========================================================= */

window.EchoAudio = (() => {
  let audioContext = null;
  let masterGain = null;
  let ambientTimer = null;
  let muted = false;
  let ambientRunning = false;

  const activeNodes = new Set();

  function init() {
    if (audioContext) return audioContext;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      console.warn("当前浏览器不支持 Web Audio API。");
      return null;
    }

    audioContext = new AudioContextClass();

    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.72;
    masterGain.connect(audioContext.destination);

    return audioContext;
  }

  async function resume() {
    const ctx = init();

    if (!ctx) return;

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (error) {
        console.warn("音频上下文无法恢复：", error);
      }
    }
  }

  function getNow() {
    return audioContext ? audioContext.currentTime : 0;
  }

  function remember(node) {
    activeNodes.add(node);
    node.addEventListener(
      "ended",
      () => {
        activeNodes.delete(node);
      },
      { once: true }
    );
  }

  /*
    创建一个基础音符。
    使用正弦波与非常低比例的泛音，避免声音太电子化、太赛博。
  */
  function playTone({
    frequency = 440,
    start = getNow(),
    duration = 0.5,
    volume = 0.08,
    type = "sine",
    attack = 0.02,
    release = 0.4,
    detune = 0,
    filterFrequency = 2400
  } = {}) {
    if (!audioContext || muted) return null;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.setValueAtTime(detune, start);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFrequency, start);
    filter.Q.setValueAtTime(0.7, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(volume, 0.0001),
      start + attack
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + duration + release
    );

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    oscillator.start(start);
    oscillator.stop(start + duration + release + 0.05);

    remember(oscillator);

    return oscillator;
  }

  /*
    为音符增加一层很轻的高频泛音。
    它不会像真实钢琴，但会比纯正弦波更有空气感。
  */
  function playSoftNote({
    frequency,
    start = getNow(),
    duration = 1.2,
    volume = 0.06
  }) {
    if (!audioContext || muted) return;

    playTone({
      frequency,
      start,
      duration,
      volume,
      type: "sine",
      attack: 0.035,
      release: duration * 0.8,
      filterFrequency: 2100
    });

    playTone({
      frequency: frequency * 2,
      start: start + 0.01,
      duration: duration * 0.55,
      volume: volume * 0.13,
      type: "sine",
      attack: 0.02,
      release: duration * 0.45,
      filterFrequency: 3200
    });
  }

  /*
    接入主界面时的启动和弦：
    Cmaj7 = C / E / G / B
  */
  function playEnterChord() {
    if (!audioContext || muted) return;

    const now = getNow();

    [
      { frequency: 130.81, delay: 0, volume: 0.05 },  // C3
      { frequency: 164.81, delay: 0.05, volume: 0.045 }, // E3
      { frequency: 196.0, delay: 0.1, volume: 0.04 }, // G3
      { frequency: 246.94, delay: 0.15, volume: 0.035 } // B3
    ].forEach((note) => {
      playSoftNote({
        frequency: note.frequency,
        start: now + note.delay,
        duration: 1.35,
        volume: note.volume
      });
    });
  }

  /*
    点击盲盒时的一次短促清脆提示。
  */
  function playBoxSelect() {
    if (!audioContext || muted) return;

    const now = getNow();

    playTone({
      frequency: 659.25,
      start: now,
      duration: 0.09,
      volume: 0.045,
      attack: 0.006,
      release: 0.13,
      filterFrequency: 3000
    });

    playTone({
      frequency: 987.77,
      start: now + 0.06,
      duration: 0.12,
      volume: 0.025,
      attack: 0.006,
      release: 0.18,
      filterFrequency: 3800
    });
  }

  /*
    盲盒上下摇晃时的节拍器声。
    app.js 会在 0.75 秒动画期间触发它。
  */
  function playRattleTick(index = 0) {
    if (!audioContext || muted) return;

    const now = getNow();
    const frequencies = [620, 740, 660, 820];
    const frequency = frequencies[index % frequencies.length];

    playTone({
      frequency,
      start: now,
      duration: 0.035,
      volume: index === 3 ? 0.055 : 0.035,
      attack: 0.003,
      release: 0.06,
      filterFrequency: 4100
    });
  }

  /*
    盲盒开启、信物显影时的上行音。
  */
  function playArtifactReveal() {
    if (!audioContext || muted) return;

    const now = getNow();
    const notes = [392.0, 493.88, 587.33, 783.99];

    notes.forEach((frequency, index) => {
      playSoftNote({
        frequency,
        start: now + index * 0.09,
        duration: 0.5,
        volume: 0.035 - index * 0.003
      });
    });
  }

  /*
    收下信物时的柔和下行音。
  */
  function playArtifactAccept() {
    if (!audioContext || muted) return;

    const now = getNow();

    [
      { frequency: 783.99, delay: 0 },
      { frequency: 659.25, delay: 0.1 },
      { frequency: 523.25, delay: 0.2 }
    ].forEach((note, index) => {
      playSoftNote({
        frequency: note.frequency,
        start: now + note.delay,
        duration: 0.55,
        volume: 0.03 - index * 0.003
      });
    });
  }

  /*
    碎裂声：
    用随机白噪声经由高通滤波处理，得到短暂、清亮的破碎感。
  */
  function playShatter() {
    if (!audioContext || muted) return;

    const ctx = audioContext;
    const now = getNow();
    const bufferSize = Math.floor(ctx.sampleRate * 0.65);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      const fade = 1 - i / bufferSize;
      channel[i] = (Math.random() * 2 - 1) * fade * fade;
    }

    const noise = ctx.createBufferSource();
    const highpass = ctx.createBiquadFilter();
    const bandpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    noise.buffer = buffer;

    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(1100, now);

    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(3500, now);
    bandpass.Q.setValueAtTime(0.8, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    noise.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(masterGain);

    noise.start(now);
    noise.stop(now + 0.67);

    remember(noise);

    /* 加一枚较低的共鸣音，避免只有刺耳噪声。 */
    playTone({
      frequency: 146.83,
      start: now,
      duration: 0.32,
      volume: 0.045,
      attack: 0.008,
      release: 0.55,
      filterFrequency: 700
    });
  }

  /*
    终章环境和弦。
    以缓慢的四组和弦循环形成「在余韵中漂流」的感觉。
  */
  function playAmbientChord(chord, start) {
    const chordDuration = 7.2;

    chord.forEach((frequency, index) => {
      playSoftNote({
        frequency,
        start: start + index * 0.16,
        duration: 3.4 + index * 0.3,
        volume: index === 0 ? 0.028 : 0.021
      });
    });

    /* 极轻的高音延迟音，增加遥远空间感。 */
    const highNote = chord[chord.length - 1] * 2;

    playTone({
      frequency: highNote,
      start: start + 2.4,
      duration: 1.4,
      volume: 0.009,
      attack: 0.4,
      release: 2.5,
      filterFrequency: 2600
    });

    return chordDuration;
  }

  function startAmbient() {
    if (!audioContext || muted || ambientRunning) return;

    ambientRunning = true;

    const chords = [
      [130.81, 164.81, 196.0, 246.94], // Cmaj7
      [110.0, 130.81, 164.81, 196.0],  // Am7
      [87.31, 130.81, 164.81, 220.0],  // Fmaj7
      [98.0, 146.83, 196.0, 246.94]    // Gadd9
    ];

    let chordIndex = 0;

    const playNext = () => {
      if (!ambientRunning || muted || !audioContext) return;

      const now = getNow();
      const duration = playAmbientChord(chords[chordIndex], now);

      chordIndex = (chordIndex + 1) % chords.length;
      ambientTimer = window.setTimeout(playNext, duration * 1000);
    };

    playNext();
  }

  function stopAmbient() {
    ambientRunning = false;

    if (ambientTimer) {
      window.clearTimeout(ambientTimer);
      ambientTimer = null;
    }
  }

  /*
    立即停止当前正在发声的节点。
    用于碎裂前制造短暂的「绝对静音」。
  */
  function silenceNow() {
    stopAmbient();

    activeNodes.forEach((node) => {
      try {
        node.stop();
      } catch (error) {
        /* 节点可能已经停止，不需要额外处理。 */
      }
    });

    activeNodes.clear();
  }

  function setMuted(value) {
    muted = Boolean(value);

    if (!masterGain || !audioContext) return muted;

    masterGain.gain.cancelScheduledValues(getNow());
    masterGain.gain.setTargetAtTime(muted ? 0.0001 : 0.72, getNow(), 0.04);

    if (muted) {
      stopAmbient();
    }

    return muted;
  }

  function toggleMuted() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    return muted;
  }

  function isMuted() {
    return muted;
  }

  return {
    init,
    resume,

    playEnterChord,
    playBoxSelect,
    playRattleTick,
    playArtifactReveal,
    playArtifactAccept,
    playShatter,

    startAmbient,
    stopAmbient,
    silenceNow,

    setMuted,
    toggleMuted,
    isMuted
  };
})();
