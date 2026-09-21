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
  var reveal = document.getElementById('reveal');
  var valueBtn = document.getElementById('valueBtn');

  var hasRevealed = false;

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

  function doReveal() {
    if (hasRevealed) return;
    hasRevealed = true;
    ensureAudio();
    orbWrap.classList.add('is-hidden');
    reveal.hidden = false;
  }

  orb.addEventListener('click', doReveal);
  orb.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      doReveal();
    }
  });

  /* subtle parallax on the orb, mouse or touch — no permission prompts */
  sceneCanvas.addEventListener('pointermove', function (e) {
    if (hasRevealed) return;
    var w = window.innerWidth,
      h = window.innerHeight;
    var dx = (e.clientX / w - 0.5) * 10;
    var dy = (e.clientY / h - 0.5) * 10;
    orbWrap.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });

  /* ---------------------------------------------------------
     4. LOCK transition (triggered from the value button)
     --------------------------------------------------------- */
  valueBtn.addEventListener('click', function (e) {
    var rect = valueBtn.getBoundingClientRect();
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
  });

  /* replay the staggered question fade-in each time the lock scene opens */
  function restartQuestionAnimation() {
    var els = document.querySelectorAll('.lock-icon, .lock-status, .question__line, .input-area');
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
          runGrowthSequence();
        },
        function () {}
      );
    }, 1250);
  }

  /* ---------------------------------------------------------
     6. SCENE 3 — dependency reveal → seed → sprout → sway
     --------------------------------------------------------- */
  var seed = document.getElementById('seed');
  var cracks = document.getElementById('cracks');
  var sprout = document.getElementById('sprout');
  var finalLine = document.getElementById('finalLine');
  var grown = false;

  function runGrowthSequence() {
    if (grown) return;
    grown = true;

    setTimeout(function () {
      seed.classList.add('is-falling');
    }, 2000);

    setTimeout(function () {
      cracks.classList.add('is-cracking');
    }, 2850);

    setTimeout(function () {
      sprout.classList.add('is-growing');
    }, 3050);

    setTimeout(function () {
      sprout.classList.add('is-swaying');
    }, 4650);

    setTimeout(function () {
      finalLine.classList.add('is-visible');
    }, 5200);
  }

  /* ---------------------------------------------------------
     7. review-only replay affordance
     --------------------------------------------------------- */
  var replayBtn = document.getElementById('replayBtn');
  replayBtn.addEventListener('click', function () {
    location.reload();
  });
})();
