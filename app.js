(function () {
  const $ = (id) => document.getElementById(id);

  const audio = $("audio");
  const statusEl = $("status");
  const mushafFrame = $("mushafFrame");

  const state = {
    isPlaying: false,
    stopRequested: false,
    currentLoop: 0,
    currentSurah: 1,
    currentAyah: 1,
  };

  function pad3(n) {
    const s = String(n);
    return s.length === 1 ? "00" + s : s.length === 2 ? "0" + s : s;
  }

  function buildFileUrl(baseUrl, surah, ayah, ext) {
    const safeBase = baseUrl ? baseUrl.trim() : "";
    const base = safeBase.endsWith("/") ? safeBase : (safeBase ? safeBase + "/" : "");
    const name = `${pad3(surah)}${pad3(ayah)}.${ext}`;
    return base + name;
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function getInputs() {
    const baseUrl = $("audioBaseUrl").value;
    const ext = $("audioExt").value || "mp3";
    const surah = Math.max(1, Math.min(114, parseInt($("surah").value || "1", 10)));
    const ayahStart = Math.max(1, parseInt($("ayahStart").value || "1", 10));
    const ayahEnd = Math.max(ayahStart, parseInt($("ayahEnd").value || String(ayahStart), 10));
    const loops = Math.max(1, parseInt($("loops").value || "1", 10));
    const gapMs = Math.max(0, parseInt($("gapMs").value || "0", 10));
    const rate = Math.max(0.5, Math.min(2, parseFloat($("rate").value || "1")));
    return { baseUrl, ext, surah, ayahStart, ayahEnd, loops, gapMs, rate };
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function playOne(url, rate) {
    audio.pause();
    audio.currentTime = 0;
    audio.src = url;
    audio.playbackRate = rate;

    return new Promise((resolve, reject) => {
      const onEnded = () => cleanup(resolve);
      const onError = () => cleanup(() => reject(new Error("Audio load/play error")));

      function cleanup(done) {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
        done();
      }

      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);

      audio.play().catch((e) => {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
        reject(e);
      });
    });
  }

  async function startPlayback() {
    const { baseUrl, ext, surah, ayahStart, ayahEnd, loops, gapMs, rate } = getInputs();

    if (!baseUrl) {
      setStatus("Set an Audio Base URL first (e.g. ./audio/).");
      return;
    }

    state.isPlaying = true;
    state.stopRequested = false;
    state.currentSurah = surah;

    for (let loop = 1; loop <= loops; loop++) {
      state.currentLoop = loop;
      if (state.stopRequested) break;

      for (let ayah = ayahStart; ayah <= ayahEnd; ayah++) {
        state.currentAyah = ayah;
        if (state.stopRequested) break;

        const url = buildFileUrl(baseUrl, surah, ayah, ext);
        setStatus(`Loop ${loop}/${loops} — Playing ${surah}:${ayah} — ${url}`);

        try {
          await playOne(url, rate);
        } catch (e) {
          setStatus(`Failed at ${surah}:${ayah}. Check file exists: ${url}`);
          state.isPlaying = false;
          return;
        }

        if (gapMs) await sleep(gapMs);
      }
    }

    state.isPlaying = false;
    audio.pause();
    setStatus("Done.");
  }

  function pausePlayback() {
    audio.pause();
    setStatus(`Paused at ${state.currentSurah}:${state.currentAyah}.`);
  }

  function stopPlayback() {
    state.stopRequested = true;
    state.isPlaying = false;
    audio.pause();
    audio.currentTime = 0;
    setStatus("Stopped.");
  }

  function tryWireVerseClicks() {
    const doc = mushafFrame.contentDocument;
    if (!doc) {
      setStatus("Mushaf not ready yet. Try again after it loads.");
      return;
    }

    // Heuristics: try common attribute patterns
    const candidates = [
      "[data-surah][data-ayah]",
      "[data-sura][data-aya]",
      "[data-chapter][data-verse]",
      ".ayah[data-ayah]",
      ".verse[data-verse]"
    ];

    let nodes = [];
    for (const sel of candidates) {
      nodes = Array.from(doc.querySelectorAll(sel));
      if (nodes.length) break;
    }

    if (!nodes.length) {
      setStatus("Could not detect verse elements in the mushaf DOM. Use manual range entry.");
      return;
    }

    let wired = 0;
    for (const el of nodes) {
      const surah =
        el.getAttribute("data-surah") ||
        el.getAttribute("data-sura") ||
        el.getAttribute("data-chapter");
      const ayah =
        el.getAttribute("data-ayah") ||
        el.getAttribute("data-aya") ||
        el.getAttribute("data-verse");

      const s = parseInt(surah || "", 10);
      const a = parseInt(ayah || "", 10);
      if (!Number.isFinite(s) || !Number.isFinite(a)) continue;

      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        $("surah").value = String(s);
        $("ayahStart").value = String(a);
        $("ayahEnd").value = String(a);
        setStatus(`Selected ${s}:${a} from mushaf.`);
      }, { passive: true });

      wired++;
    }

    setStatus(`Verse clicking enabled on ${wired} elements.`);
  }

  $("btnPlay").addEventListener("click", () => {
    if (state.isPlaying) return;
    startPlayback();
  });
  $("btnPause").addEventListener("click", pausePlayback);
  $("btnStop").addEventListener("click", stopPlayback);
  $("btnWireClicks").addEventListener("click", tryWireVerseClicks);

  // Nice default base URL if user hosts audio in ./audio/
  $("audioBaseUrl").value = "./audio/";

  setStatus("Load the mushaf, set a range, then press Play.");
})();

