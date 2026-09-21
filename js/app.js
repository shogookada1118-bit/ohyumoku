(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. subtle grain texture (generated once, no image asset)
     --------------------------------------------------------- */
  function makeGrain() {
    try {
      var c = document.createElement('canvas');
      c.width = 96;
      c.height = 96;
      var ctx = c.getContext('2d');
      var img = ctx.createImageData(96, 96);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = 200 + Math.floor(Math.random() * 55);
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = Math.random() * 40;
      }
      ctx.putImageData(img, 0, 0);
      document.documentElement.style.setProperty('--grain-image', 'url(' + c.toDataURL() + ')');
    } catch (e) {
      /* silently skip texture if canvas unavailable */
    }
  }
  makeGrain();

  /* ---------------------------------------------------------
     1. tiny synthesized sound cues (no audio files)
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     persisted state: lets the user close the tab, go act in the
     real world, and come back to exactly where they left off.
     the internal slot is reserved for future connection to the
     deeper checkpoint / philosophy layers; nothing in it is ever
     rendered to the user.
     --------------------------------------------------------- */
  var STORAGE_KEY = 'daimuboku:v1:state';

  function defaultState() {
    return {
      version: 1,
      firstAnswer: null,
      sprouted: false,
      todayAction: null,
      actionLocked: false,
      actionDone: false,
      growthStage: 0,
      internal: {}
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  var state = loadState() || defaultState();

  var audioCtx = null;
  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    } catch (e) {
      audioCtx = null;
    }
    return audioCtx;
  }

  function tone(ctx, freq, start, dur, gain, type) {
    var osc = ctx.createOscillator();
    var amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    amp.gain.value = 0;
    osc.connect(amp);
    amp.connect(ctx.destination);
    var t0 = ctx.currentTime + start;
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function playLockThud() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      tone(ctx, 58, 0, 0.5, 0.16, 'sine');
      tone(ctx, 96, 0.02, 0.35, 0.05, 'sine');
    } catch (e) {}
  }

  function playUnlockChime() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      tone(ctx, 1318.5, 0, 0.9, 0.05, 'sine');
      tone(ctx, 1760, 0.08, 0.7, 0.03, 'sine');
    } catch (e) {}
  }

  function playArriveChime() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      tone(ctx, 880, 0, 0.7, 0.035, 'sine');
      tone(ctx, 1320, 0.12, 0.6, 0.025, 'sine');
    } catch (e) {}
  }

  function playGetSparkle() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      tone(ctx, 1980, 0, 0.5, 0.03, 'sine');
      tone(ctx, 2640, 0.06, 0.4, 0.02, 'sine');
      tone(ctx, 3520, 0.11, 0.35, 0.012, 'sine');
    } catch (e) {}
  }

  /* a low, quiet acknowledgement used only when a real-world action is
     confirmed — deliberately not sparkly, this is not the same kind of
     moment as receiving something, so it must not sound like it */
  function playGrowWhisper() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      tone(ctx, 220, 0, 1.1, 0.045, 'sine');
      tone(ctx, 330, 0.15, 0.9, 0.025, 'sine');
    } catch (e) {}
  }

  /* ---------------------------------------------------------
     2. scene wipe transition
     --------------------------------------------------------- */
  function wipe(x, y, color, onCovered, onDone) {
    var el = document.createElement('div');
    el.className = 'wipe';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.background = color;
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('is-open');
      });
    });
    setTimeout(function () {
      if (onCovered) onCovered();
    }, 620);
    /* hold the solid wipe until the new scene has fully finished its own
       0.6s opacity crossfade underneath, so no ghosting is ever visible */
    setTimeout(function () {
      el.remove();
      if (onDone) onDone();
    }, 1300);
  }

  /* ---------------------------------------------------------
     3. SCENE 1 — WHITE CANVAS
     --------------------------------------------------------- */
  var sceneCanvas = document.getElementById('scene-canvas');
  var sceneLock = document.getElementById('scene-lock');
  var sceneUnlock = document.getElementById('scene-unlock');
  var rippleLayer = document.getElementById('rippleLayer');
  var orb = document.getElementById('orb');
  var orbWrap = document.getElementById('orbWrap');
  var capsuleWrap = document.getElementById('capsuleWrap');
  var capsule = document.getElementById('capsule');

  var hasManifested = false;
  var hasSealed = false;

  function spawnRipple(x, y) {
    var r = document.createElement('div');
    r.className = 'ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    rippleLayer.appendChild(r);
    setTimeout(function () {
      r.remove();
    }, 1200);
  }

  function pointerPos(e) {
    if (e.changedTouches && e.changedTouches[0]) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    if (typeof e.clientX === 'number') return { x: e.clientX, y: e.clientY };
    var rect = orb.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  sceneCanvas.addEventListener('pointerdown', function (e) {
    var p = pointerPos(e);
    spawnRipple(p.x, p.y);
  });

  /* step 1 — the void is touched, and something desirable arrives */
  function manifestDesire() {
    if (hasManifested) return;
    hasManifested = true;
    ensureAudio();
    playArriveChime();
    orbWrap.classList.add('is-hidden');
    capsuleWrap.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        capsuleWrap.classList.add('is-visible');
      });
    });
  }

  orb.addEventListener('click', manifestDesire);
  orb.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      manifestDesire();
    }
  });

  /* subtle parallax, mouse or touch — no permission prompts */
  sceneCanvas.addEventListener('pointermove', function (e) {
    if (hasSealed) return;
    var w = window.innerWidth,
      h = window.innerHeight;
    var dx = (e.clientX / w - 0.5) * 10;
    var dy = (e.clientY / h - 0.5) * 10;
    var t = 'translate(' + dx + 'px,' + dy + 'px)';
    orbWrap.style.transform = t;
    capsuleWrap.style.transform = t;
  });

  /* ---------------------------------------------------------
     4. step 2 — touching the desired thing seals it shut,
     then LOCK reveals only the icon; the question itself
     stays silent for a beat before it ever appears
     --------------------------------------------------------- */
  function sealAndLock() {
    if (hasSealed) return;
    hasSealed = true;
    capsule.classList.add('is-sealing');

    setTimeout(function () {
      var rect = capsule.getBoundingClientRect();
      var x = rect.left + rect.width / 2;
      var y = rect.top + rect.height / 2;
      playLockThud();
      wipe(
        x,
        y,
        'var(--color-lock-bg)',
        function () {
          sceneCanvas.classList.remove('is-active');
          sceneLock.classList.add('is-active');
          restartQuestionAnimation();
        },
        function () {}
      );
    }, 380);
  }

  capsule.addEventListener('click', sealAndLock);
  capsule.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      sealAndLock();
    }
  });

  /* replay the staggered reveal each time the lock scene opens */
  function restartQuestionAnimation() {
    var els = document.querySelectorAll('.lock-icon, .lock-lead, .question__line, .input-area');
    els.forEach(function (el) {
      el.style.animation = 'none';
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight;
      el.style.animation = '';
    });
  }

  /* ---------------------------------------------------------
     5. SCENE 2 — the answer, and the ink absorbing into canvas
     --------------------------------------------------------- */
  var answerInput = document.getElementById('answerInput');
  var absorbGhost = document.getElementById('absorbGhost');
  var inputArea = document.getElementById('inputArea');
  var debounceTimer = null;
  var hasAbsorbed = false;

  answerInput.addEventListener('input', function () {
    if (hasAbsorbed) return;
    clearTimeout(debounceTimer);
    var value = answerInput.value.trim();
    if (value.length === 0) return;
    debounceTimer = setTimeout(function () {
      absorbAndUnlock(value);
    }, 3000);
  });

  function absorbAndUnlock(value) {
    if (hasAbsorbed) return;
    hasAbsorbed = true;

    state.firstAnswer = value;
    saveState();

    var rect = answerInput.getBoundingClientRect();
    absorbGhost.style.left = rect.left + rect.width / 2 + 'px';
    absorbGhost.style.top = rect.top + rect.height / 2 + 'px';
    absorbGhost.textContent = value;
    inputArea.style.opacity = '0';
    inputArea.style.transition = 'opacity 0.5s ease';
    absorbGhost.classList.add('is-sinking');

    setTimeout(function () {
      var x = rect.left + rect.width / 2;
      var y = rect.top + rect.height / 2;
      playUnlockChime();
      wipe(
        x,
        y,
        'var(--color-canvas)',
        function () {
          sceneLock.classList.remove('is-active');
          sceneUnlock.classList.add('is-active');
          runRewardSequence();
        },
        function () {}
      );
    }, 1250);
  }

  /* ---------------------------------------------------------
     6. SCENE 3 — GET the seed of light → world warms →
     dependency insight → seed → sprout → sway → (quiet) →
     a single root → the first real-world step is asked
     --------------------------------------------------------- */
  var getFlash = document.getElementById('getFlash');
  var worldTint = document.getElementById('worldTint');
  var seed = document.getElementById('seed');
  var cracks = document.getElementById('cracks');
  var sprout = document.getElementById('sprout');
  var root = document.getElementById('root');
  var finalLine = document.getElementById('finalLine');
  var grown = false;

  function runRewardSequence() {
    if (grown) return;
    grown = true;

    /* the tangible GET — a seed of light arrives, right as the
       world turns from indigo back to open air */
    setTimeout(function () {
      playGetSparkle();
      getFlash.classList.add('is-bursting');
    }, 120);

    /* the world itself changes — a slow warmth spreads in */
    setTimeout(function () {
      worldTint.classList.add('is-warming');
    }, 1500);

    setTimeout(function () {
      seed.classList.add('is-falling');
    }, 3200);

    setTimeout(function () {
      cracks.classList.add('is-cracking');
    }, 4050);

    setTimeout(function () {
      sprout.classList.add('is-growing');
    }, 4250);

    setTimeout(function () {
      sprout.classList.add('is-swaying');
    }, 5850);

    setTimeout(function () {
      finalLine.classList.add('is-visible');
      state.sprouted = true;
      saveState();
    }, 6400);

    /* the tree stands and sways in silence for a while — nothing is
       asked yet. only after that quiet does a single root appear,
       and only after the root does the next question exist. */
    setTimeout(growRootFirst, 6400 + 4200);
    setTimeout(showStepLead, 6400 + 4200 + 1600);
    setTimeout(showStepQuestion, 6400 + 4200 + 1600 + 1600);
    setTimeout(showStepInputArea, 6400 + 4200 + 1600 + 1600 + 1800);
  }

  /* ---------------------------------------------------------
     7. the first real-world step: decide → LOCK again →
     leave the screen → (return) → confirm it actually happened
     --------------------------------------------------------- */
  var stepLead = document.getElementById('stepLead');
  var stepQuestion = document.getElementById('stepQuestion');
  var stepInputArea = document.getElementById('stepInputArea');
  var stepInput = document.getElementById('stepInput');
  var stepGhost = document.getElementById('stepGhost');
  var stepLockMsg = document.getElementById('stepLockMsg');
  var returnView = document.getElementById('returnView');
  var returnStep = document.getElementById('returnStep');
  var returnDoneBtn = document.getElementById('returnDoneBtn');

  var stepDebounce = null;
  var actionCommitted = false;

  function growRootFirst() {
    root.classList.add('is-growing');
  }

  function showStepLead() {
    stepLead.classList.add('is-visible');
  }

  function showStepQuestion() {
    stepQuestion.classList.add('is-visible');
  }

  function showStepInputArea() {
    stepInputArea.classList.add('is-visible');
  }

  stepInput.addEventListener('input', function () {
    if (actionCommitted) return;
    clearTimeout(stepDebounce);
    var value = stepInput.value.trim();
    if (value.length === 0) return;
    stepDebounce = setTimeout(function () {
      commitAction(value);
    }, 3000);
  });

  /* deciding is not enough — committing the step re-locks the world.
     no "done" button appears here. the only way forward is to
     actually go and do it, then come back. */
  function commitAction(value) {
    if (actionCommitted) return;
    actionCommitted = true;

    state.todayAction = value;
    state.actionLocked = true;
    saveState();

    var rect = stepInput.getBoundingClientRect();
    stepGhost.style.left = rect.left + rect.width / 2 + 'px';
    stepGhost.style.top = rect.top + rect.height / 2 + 'px';
    stepGhost.textContent = value;
    stepInputArea.style.opacity = '0';
    stepInputArea.style.transition = 'opacity 0.5s ease';
    stepGhost.classList.add('is-sinking');

    setTimeout(function () {
      stepLockMsg.classList.add('is-visible');
    }, 1250);
  }

  /* stepping on "動かした" is the only trigger that ever grows the
     tree further — never the act of answering. */
  function confirmRealAction() {
    if (state.actionDone) return;
    state.actionDone = true;
    state.growthStage = 1;
    saveState();

    playGrowWhisper();
    root.classList.add('is-deepening');
    sprout.classList.add('is-thick', 'is-branching');

    returnDoneBtn.disabled = true;
    returnDoneBtn.style.opacity = '0';
    returnDoneBtn.style.transition = 'opacity 0.6s ease';
  }

  returnDoneBtn.addEventListener('click', confirmRealAction);

  /* ---------------------------------------------------------
     8. resume on load — a returning visitor never replays the
     intro; the world is simply already the way they left it
     --------------------------------------------------------- */
  /* keyframe animations (unlike transitions) can visibly "un-finish"
     if their duration is later restored to normal after being held near
     zero — the browser recomputes progress against the new duration and
     the element appears to replay from the start. so for anything driven
     by a one-shot @keyframes rule (the leaves, the root lines, the final
     line, and the dependency readout — the last of which animates on an
     unconditional page-load delay, not a class at all) we cancel the
     animation outright and set its finished value directly, rather than
     leaning on animation timing to reach it. transitions (world warmth,
     stem thickness) don't have that failure mode, so those still use the
     brief is-restoring duration-zeroing below. */
  function forceSettled(selector, styles) {
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    el.style.animation = 'none';
    Object.keys(styles).forEach(function (key) {
      el.style[key] = styles[key];
    });
  }

  function settleTreeInstantly(stage) {
    document.documentElement.classList.add('is-restoring');

    sceneCanvas.classList.remove('is-active');
    sceneLock.classList.remove('is-active');
    sceneUnlock.classList.add('is-active');

    worldTint.classList.add('is-warming');

    forceSettled('#dependencyLabel', { opacity: '1', filter: 'none' });
    forceSettled('#dependencyValue', { opacity: '1', filter: 'none' });
    forceSettled('#dependencyNote', { opacity: '1' });

    forceSettled(finalLine, { opacity: '1' });
    finalLine.classList.add('is-visible');

    sprout.classList.add('is-growing', 'is-swaying');
    forceSettled('.sprout__leaf--l', { opacity: '1', transform: 'scale(1) rotate(0deg)' });
    forceSettled('.sprout__leaf--r', { opacity: '1', transform: 'scale(1) rotate(0deg)' });

    root.classList.add('is-growing');
    forceSettled('.root__main', { strokeDashoffset: '0' });

    if (stage >= 1) {
      sprout.classList.add('is-thick', 'is-branching');
      forceSettled('.sprout__leaf--3', { opacity: '1', transform: 'scale(1) rotate(0deg)' });
      root.classList.add('is-deepening');
      forceSettled('.root__deep', { opacity: '0.8', strokeDashoffset: '0' });
    }

    grown = true;
    hasManifested = true;
    hasSealed = true;
    hasAbsorbed = true;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.remove('is-restoring');
      });
    });
  }

  function resumeFromSavedState() {
    if (state.actionDone) {
      settleTreeInstantly(1);
      return;
    }

    if (state.actionLocked) {
      settleTreeInstantly(0);
      setTimeout(function () {
        returnStep.textContent = state.todayAction || '';
        returnView.hidden = false;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            returnView.classList.add('is-visible');
          });
        });
      }, 500);
      return;
    }

    if (state.sprouted) {
      settleTreeInstantly(0);
      actionCommitted = false;
      setTimeout(showStepLead, 500);
      setTimeout(showStepQuestion, 850);
      setTimeout(showStepInputArea, 1250);
    }
  }

  resumeFromSavedState();

  /* ---------------------------------------------------------
     9. review-only replay affordance — clears saved progress so
     a deliberate restart truly starts from WHITE CANVAS again
     --------------------------------------------------------- */
  var replayBtn = document.getElementById('replayBtn');
  replayBtn.addEventListener('click', function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    location.reload();
  });
})();
