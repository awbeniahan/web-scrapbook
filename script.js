/* ==================================================================
   CONFIG — the only values you should need to touch
   ================================================================== */

// Sample start date for the live counter.
// Format: new Date(YYYY, MONTH_INDEX (0-11), DAY, HOUR, MINUTE)
const START_DATE = new Date(2024, 0, 1, 9, 0); // Jan 1, 2024, 9:00 AM

// Vault content is AES-GCM encrypted (demo password: "demo").
const VAULT_CRYPTO = {
  iterations: 150000,
  salt: "Oxs59oTsGMMtwJKBWis4eQ==",
  iv: "rkvQTZ+M4uSN5qhF",
  ciphertext: "H1vwrb0w5eFnBMegbBbD4oJ0mgEQS1IZqr+gDu3YIoeCLK2pPCxQ/38G4bPhQIQ17+TpQBOfkjSmMH1gUSppn0ValC0lvLgvL+dT0BW14yIG8Mj3j0sGVKfHwyGOw3WKzitj6p4ocgyUI8npSI9fvEcjLoN4nINyhrTsIVgQyE+MQdHXqnOACwmFvwN9NhSVyXAh86PqeoGmZWLuL4l5vxiFx7mTuT/GOTIf9DWqsk6OXmY="
};

// Respect the user's OS-level motion preference throughout —
// background particles, tilt, and parallax all check this flag.
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ==================================================================
   0. SOUND ENGINE — tiny synthesized chimes via the Web Audio API.
   No audio files, muted by default, toggled with the corner button.
   AudioContext is created lazily on first user gesture (required by
   browser autoplay policies).
   ================================================================== */
let soundEnabled = false;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// freq: starting pitch in Hz, dur: length in seconds, type: oscillator
// shape, glideTo: optional pitch the tone glides to by the end — a
// gentle rise or fall is most of what makes a tone read as "cute"
// rather than a flat robotic beep. A lowpass filter softens the
// harmonics so even non-sine shapes stay warm instead of buzzy.
function playTone(freq = 660, dur = 0.18, type = 'sine', glideTo = null) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    // Some browsers create/leave the context suspended even inside a
    // user-gesture handler — resume it defensively before scheduling.
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + dur * 0.85);
    }
    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    filter.Q.value = 0.6;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.03);
  } catch (err) {
    // Some browsers block audio until further interaction — fail silently
  }
}

// iOS Safari (and some others) leave a freshly-created AudioContext
// suspended until it's explicitly resumed inside a direct user gesture.
// Unlocking it on the very first tap/click anywhere means it's already
// running by the time someone presses the sound toggle.
function unlockAudioOnce() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (err) {
    // Web Audio unsupported or blocked — playTone() will no-op safely
  }
  document.removeEventListener('pointerdown', unlockAudioOnce);
  document.removeEventListener('keydown', unlockAudioOnce);
}
document.addEventListener('pointerdown', unlockAudioOnce, { once: true });
document.addEventListener('keydown', unlockAudioOnce, { once: true });

const soundToggle = document.getElementById('soundToggle');
if (soundToggle) {
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    if (soundEnabled) playTone(700, 0.15, 'sine', 880);
  });
}

/* A small palette of distinct, cute little sounds so different
   interactions don't all sound the same. Built entirely from soft
   sine tones with a gentle pitch glide (a little "bloop" rise or
   fall) rather than flat beeps — that glide is most of what reads
   as playful instead of robotic. All respect soundEnabled via
   playTone(). */
function playNavClick()   { playTone(720, 0.08, 'sine', 660); }
function playCardPop()    {
  playTone(520, 0.09, 'sine', 640);
  setTimeout(() => playTone(680, 0.13, 'sine', 820), 70);
}
function playCardClose()  {
  playTone(760, 0.08, 'sine', 660);
  setTimeout(() => playTone(560, 0.12, 'sine', 440), 55);
}
function playHeartPop()   { playTone(820 + Math.random() * 160, 0.09, 'sine', 1000 + Math.random() * 160); }

/* ==================================================================
   1. LIVE TICKING COUNTER
   Recomputes years / months / days / hours / minutes / seconds since
   START_DATE every second, so the smallest units visibly tick
   upward while the page is open. Each digit gets a brief ".tick"
   pulse class on change for a smooth, non-jarring transition.
   ================================================================== */
function updateCounter() {
  const now = new Date();
  let years = now.getFullYear() - START_DATE.getFullYear();
  let months = now.getMonth() - START_DATE.getMonth();
  let days = now.getDate() - START_DATE.getDate();
  let hours = now.getHours() - START_DATE.getHours();
  let minutes = now.getMinutes() - START_DATE.getMinutes();
  let seconds = now.getSeconds() - START_DATE.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes -= 1;
  }
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
    days -= 1;
  }
  if (days < 0) {
    // Borrow days from the previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  years = Math.max(0, years);
  months = Math.max(0, months);
  days = Math.max(0, days);
  hours = Math.max(0, hours);
  minutes = Math.max(0, minutes);
  seconds = Math.max(0, seconds);

  setCount('count-years', years);
  setCount('count-months', months);
  setCount('count-days', days);
  setCount('count-hours', hours);
  setCount('count-minutes', minutes);
  setCount('count-seconds', seconds);
  updateNavDays();
}

/* Mini "days together" figure shown in the pinned nav brand —
   whole days elapsed since START_DATE. */
function updateNavDays() {
  const el = document.getElementById('navDaysTogether');
  if (!el) return;
  const totalDays = Math.floor((Date.now() - START_DATE.getTime()) / 86400000);
  el.textContent = totalDays;
}

function setCount(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.textContent !== String(value)) {
    el.textContent = value;
    // Retrigger the pulse animation on every change
    el.classList.remove('tick');
    void el.offsetWidth; // force reflow so the animation can restart
    el.classList.add('tick');
  }
}

updateCounter();
setInterval(updateCounter, 1000);

/* ==================================================================
   2. ENTER BUTTON — ripple + smooth-scroll from intro into timeline
   ================================================================== */
const enterBtn = document.getElementById('enterBtn');
const timeline = document.querySelector('.timeline');

if (enterBtn && timeline) {
  enterBtn.addEventListener('click', (e) => {
    spawnRipple(enterBtn, e);
    playTone(680, 0.16, 'sine', 820);
    timeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/* ==================================================================
   RIPPLE HELPER — used by any button that wants a satisfying
   click-burst. Appends a .ripple span positioned at the click point
   relative to the button, sized to cover it, then removes itself.
   ================================================================== */
function spawnRipple(button, event) {
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.6;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${(event.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2}px`;
  ripple.style.top = `${(event.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2}px`;
  button.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

/* ==================================================================
   2b. PINNED NAV — slides into view once the user scrolls past the
   landing screen, smooth-scrolls to sections on click, and
   highlights whichever section is currently in view (scrollspy).
   ================================================================== */
const siteNav = document.getElementById('siteNav');
const navLinks = document.querySelectorAll('.site-nav-link');
const navSections = ['timeline', 'places', 'things', 'food', 'vault']
  .map((id) => document.getElementById(id))
  .filter(Boolean);

function updateNavVisibility() {
  if (!siteNav || !introSectionEl) return;
  const showAfter = introSectionEl.offsetHeight * 0.6;
  siteNav.classList.toggle('is-visible', window.scrollY > showAfter);
  siteNav.classList.toggle('is-scrolled', window.scrollY > 20);
}

const introSectionEl = document.getElementById('intro');
window.addEventListener('scroll', updateNavVisibility, { passive: true });
updateNavVisibility();

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      playNavClick();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.dataset.nav === entry.target.id);
    });
  });
}, {
  threshold: 0,
  rootMargin: '-70px 0px -65% 0px'
});
navSections.forEach((section) => navObserver.observe(section));

/* ==================================================================
   3. SCROLL REVEAL — fade/rise elements into view as they enter
   the viewport. Once revealed, an element stays revealed (no need
   to watch it any further).
   ================================================================== */
const revealTargets = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -60px 0px'
});

revealTargets.forEach((el) => revealObserver.observe(el));

/* ==================================================================
   4. LOVE NOTES — click the envelope to reveal the letter (with a
   ripple + sparkle burst + soft chime), click close to hide it.
   ================================================================== */
document.querySelectorAll('.memo-note').forEach((note) => {
  const openBtn = note.querySelector('.memo-note-front');
  const closeBtn = note.querySelector('.memo-note-close');

  openBtn.addEventListener('click', (e) => {
    spawnRipple(openBtn, e);
    spawnSparkleBurst(e.clientX, e.clientY);
    playTone(700, 0.16, 'sine', 920);
    note.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
  });

  closeBtn.addEventListener('click', () => {
    note.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
  });
});

/* Small burst of sparkle glyphs radiating outward from a point —
   used when a love note opens. Purely decorative, self-removing. */
function spawnSparkleBurst(x, y, count = 8) {
  if (REDUCE_MOTION) return;
  const glyphs = ['✨', '💫', '⭐'];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const distance = 40 + Math.random() * 40;
    const sparkle = document.createElement('span');
    sparkle.className = 'sparkle-burst';
    sparkle.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    sparkle.style.left = `${x}px`;
    sparkle.style.top = `${y}px`;
    sparkle.style.setProperty('--bx', `${Math.cos(angle) * distance}px`);
    sparkle.style.setProperty('--by', `${Math.sin(angle) * distance}px`);
    sparkle.style.setProperty('--brot', `${Math.random() * 180 - 90}deg`);
    document.body.appendChild(sparkle);
    sparkle.addEventListener('animationend', () => sparkle.remove());
  }
}

/* ==================================================================
   5. THE VAULT — password gate, with a confetti/heart burst payoff
   and a soft chime the moment the correct password lands.
   The letter is AES-GCM encrypted (see VAULT_CRYPTO above) and only
   decrypted here, in the browser, after a correct password — it
   never exists as plaintext in the page's HTML. Matching stays
   case-insensitive and trims whitespace, same as before, by
   normalizing the guess the same way the letter was encrypted.
   Note: crypto.subtle needs a "secure context" — https, or
   localhost. It won't be defined if this page is opened directly
   from disk (a file:// URL), so the Vault only works when served
   over http(s) — e.g. `python3 -m http.server`, or once deployed.
   ================================================================== */
const vaultForm = document.getElementById('vaultForm');
const vaultInput = document.getElementById('vaultInput');
const vaultError = document.getElementById('vaultError');
const vaultLocked = document.getElementById('vaultLocked');
const vaultUnlocked = document.getElementById('vaultUnlocked');
const vaultLetter = document.getElementById('vaultLetter');
const vaultBurst = document.getElementById('vaultBurst');
const vaultSubmitBtn = document.querySelector('.vault-submit');

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Derives an AES-GCM key from the guessed password and attempts to
// decrypt the letter. Throws (wrong password / tampered data) if the
// guess doesn't match — there is no separate "correct answer" stored
// anywhere to compare against.
async function decryptVaultLetter(password) {
  const { iterations, salt, iv, ciphertext } = VAULT_CRYPTO;
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: base64ToBytes(salt), iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(iv) }, key, base64ToBytes(ciphertext));
  return new TextDecoder().decode(plainBuf);
}

// Renders the decrypted letter as paragraphs. A line starting with
// @@SIGNOFF@@ becomes the italic sign-off line; every other line is
// a plain paragraph. Uses textContent throughout — the decrypted
// text is never parsed as HTML.
function renderVaultLetter(text) {
  vaultLetter.innerHTML = '';
  text.split('\n').forEach((line) => {
    const p = document.createElement('p');
    if (line.startsWith('@@SIGNOFF@@')) {
      p.className = 'vault-signoff';
      p.textContent = line.slice('@@SIGNOFF@@'.length);
    } else {
      p.textContent = line;
    }
    vaultLetter.appendChild(p);
  });
}

if (vaultForm) {
  vaultForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (vaultSubmitBtn) spawnRipple(vaultSubmitBtn, { clientX: null, clientY: null });

    if (!window.crypto || !window.crypto.subtle) {
      vaultError.textContent = 'This only unlocks over http(s) — open it via a local server or the live site, not by double-clicking the file.';
      return;
    }

    const guess = vaultInput.value.trim().toLowerCase();

    try {
      const letter = await decryptVaultLetter(guess);
      renderVaultLetter(letter);
      vaultLocked.hidden = true;
      vaultUnlocked.hidden = false;
      vaultUnlocked.classList.add('reveal', 'in-view');
      spawnConfettiBurst();
      playTone(600, 0.15, 'sine', 740);
      setTimeout(() => playTone(760, 0.22, 'sine', 940), 130);
    } catch (err) {
      vaultError.textContent = "Not quite right, try again.";
      vaultInput.value = '';
      vaultInput.focus();
      playTone(360, 0.2, 'sine', 260);
    }
  });
}

/* Confetti/heart burst radiating from the center of the Vault card —
   the celebratory payoff moment when the password is correct. */
function spawnConfettiBurst() {
  if (!vaultBurst) return;
  const glyphs = ['💖', '❤️', '✨', '💕'];
  const colors = ['#F3B8C4', '#D98CA0', '#E3A6AE', '#FFEBEF'];
  const count = REDUCE_MOTION ? 0 : 26;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 90;
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--cx', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--cy', `${Math.sin(angle) * distance - 20}px`);
    piece.style.setProperty('--crot', `${Math.random() * 360}deg`);
    piece.style.animationDelay = `${Math.random() * 0.15}s`;

    if (Math.random() < 0.5) {
      piece.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      piece.style.fontSize = `${0.8 + Math.random() * 0.7}rem`;
    } else {
      piece.style.width = piece.style.height = `${5 + Math.random() * 5}px`;
      piece.style.borderRadius = Math.random() < 0.5 ? '50%' : '2px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    }

    vaultBurst.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

/* ==================================================================
   6. CLICK-TO-POP HEARTS
   Spawns a small burst of hearts at the click position (varied
   emoji, size, drift path, and rotation), lets CSS animate them
   outward and fade, then removes each from the DOM so they never
   accumulate. Skips clicks on interactive elements.
   ================================================================== */
const HEART_SYMBOLS = ['💖', '❤️', '💕', '💗'];

document.addEventListener('click', (e) => {
  // Skip clicks on interactive elements so this doesn't fight with
  // buttons, links, or form fields — hearts are a background flourish.
  if (e.target.closest('button, a, input, textarea, select')) return;

  playHeartPop();
  const burstCount = REDUCE_MOTION ? 1 : 2 + Math.floor(Math.random() * 2); // 2-3 hearts
  for (let i = 0; i < burstCount; i++) {
    const heart = document.createElement('span');
    heart.className = 'click-heart';
    heart.textContent = HEART_SYMBOLS[Math.floor(Math.random() * HEART_SYMBOLS.length)];
    heart.style.left = `${e.clientX}px`;
    heart.style.top = `${e.clientY}px`;

    const dx = (Math.random() - 0.5) * 90;
    const dy = -60 - Math.random() * 50;
    const rot = (Math.random() - 0.5) * 70;
    const size = 1.0 + Math.random() * 0.9;
    const dur = 0.9 + Math.random() * 0.6;

    heart.style.setProperty('--dx', `${dx}px`);
    heart.style.setProperty('--dy', `${dy}px`);
    heart.style.setProperty('--rot', `${rot}deg`);
    heart.style.setProperty('--size', `${size}rem`);
    heart.style.setProperty('--dur', `${dur}s`);

    document.body.appendChild(heart);
    heart.addEventListener('animationend', () => heart.remove());
  }
});

/* ==================================================================
   7. AMBIENT BACKGROUND PARTICLES
   Continuously spawns floating hearts/petals/sparkles into
   #bgParticles, drifting up the page. Each is randomized in
   position, size, drift path, duration, and glyph, then removes
   itself once its animation ends. Paused entirely if the user
   prefers reduced motion.
   ================================================================== */
const bgParticles = document.getElementById('bgParticles');
const AMBIENT_GLYPHS = ['💗', '🌸', '✨', '♡'];

function spawnAmbientParticle() {
  if (!bgParticles) return;
  const particle = document.createElement('span');
  particle.className = 'drift-particle';
  particle.textContent = AMBIENT_GLYPHS[Math.floor(Math.random() * AMBIENT_GLYPHS.length)];

  const left = Math.random() * 100; // vw
  const size = 0.7 + Math.random() * 1.1; // rem
  const duration = 10 + Math.random() * 12; // seconds
  const sway = (Math.random() - 0.5) * 160; // px
  const rot = (Math.random() - 0.5) * 200; // deg
  const peakOpacity = 0.25 + Math.random() * 0.35;

  particle.style.left = `${left}vw`;
  particle.style.fontSize = `${size}rem`;
  particle.style.animationDuration = `${duration}s`;
  particle.style.setProperty('--sway', `${sway}px`);
  particle.style.setProperty('--rot', `${rot}deg`);
  particle.style.setProperty('--rot-end', `${rot * 2}deg`);
  particle.style.setProperty('--peak-opacity', peakOpacity);

  bgParticles.appendChild(particle);
  setTimeout(() => particle.remove(), duration * 1000 + 200);
}

let ambientInterval = null;
if (bgParticles && !REDUCE_MOTION) {
  // Seed a handful immediately so the page doesn't start empty
  for (let i = 0; i < 5; i++) {
    setTimeout(spawnAmbientParticle, i * 450);
  }
  ambientInterval = setInterval(spawnAmbientParticle, 1300);
}

/* ==================================================================
   8. SCROLL PARALLAX — background orbs drift opposite the scroll
   direction, and the intro content eases back/scales down as the
   user scrolls past it, for a sense of depth leaving the landing
   screen. Throttled to animation frames for smoothness.
   ================================================================== */
const orbs = document.querySelectorAll('.orb');
const introContent = document.querySelector('.intro-content');
const introSection = document.getElementById('intro');
const threadHeart = document.getElementById('threadHeart');
const threadEl = document.querySelector('.thread');

let ticking = false;

function onScroll() {
  if (ticking || REDUCE_MOTION) return;
  ticking = true;
  requestAnimationFrame(() => {
    const scrollY = window.scrollY;

    // Orbs drift slowly opposite the scroll direction (parallax depth)
    orbs.forEach((orb, i) => {
      const factor = 0.04 + i * 0.015;
      orb.style.transform = `translateY(${scrollY * factor * -1}px)`;
    });

    // Intro content eases back and fades slightly as it scrolls out
    if (introContent && introSection) {
      const introHeight = introSection.offsetHeight;
      const progress = Math.min(scrollY / introHeight, 1);
      introContent.style.transform = `translateY(${progress * 40}px) scale(${1 - progress * 0.08})`;
      introContent.style.opacity = `${1 - progress * 0.7}`;
    }

    // Heart marker travels down the stitched thread as the page scrolls
    if (threadHeart && threadEl) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollFraction = docHeight > 0 ? scrollY / docHeight : 0;
      const threadHeight = threadEl.getBoundingClientRect().height;
      threadHeart.style.top = `${scrollFraction * threadHeight}px`;
    }

    ticking = false;
  });
}

if (!REDUCE_MOTION) {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ==================================================================
   9. MEMORY CARD TILT — subtle 3D tilt that follows the cursor,
   paused only while hovering (the idle-float CSS animation resumes
   automatically once the pointer leaves, via the .tilting class).

   Throttled to one update per animation frame and caches the card's
   bounding rect on enter instead of recomputing it on every single
   mousemove — a mouse can fire far more move events per second than
   a trackpad does, so without this it can bog down on Windows
   machines using a regular mouse even though it felt fine on a
   Mac trackpad.
   ================================================================== */
if (!REDUCE_MOTION) {
  document.querySelectorAll('.memory-media').forEach((card) => {
    let cardRect = null;
    let pendingEvent = null;
    let rafScheduled = false;

    function applyTilt() {
      rafScheduled = false;
      if (!cardRect || !pendingEvent) return;
      const px = (pendingEvent.clientX - cardRect.left) / cardRect.width - 0.5;
      const py = (pendingEvent.clientY - cardRect.top) / cardRect.height - 0.5;
      const rotateY = px * 14;
      const rotateX = py * -14;
      card.style.transform = `translateY(-5px) scale(1.03) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    card.addEventListener('mouseenter', () => {
      card.classList.add('tilting');
      cardRect = card.getBoundingClientRect();
    });

    card.addEventListener('mousemove', (e) => {
      pendingEvent = e;
      if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(applyTilt);
      }
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('tilting');
      card.style.transform = '';
      cardRect = null;
      pendingEvent = null;
    });
  });
}

/* ==================================================================
   10. EXPANDABLE CARDS — Places / Things / Food
   Pressing anywhere on an .expandable card (or its small "See more"
   button specifically) opens the shared #detailModal with that
   card's extra detail (read from its data-expand-* attributes and
   its <template class="card-detail"> content), animated in with a
   lively spring scale. A video card's video area is the one
   exception — clicking that plays the clip instead, handled in the
   VIDEO CARDS section further down. Closing (✕, backdrop, or Esc)
   reverses the animation and hands control straight back to the
   main page — nothing here changes the page underneath.
   ================================================================== */
const detailModal = document.getElementById('detailModal');
const detailModalPanel = document.querySelector('.detail-modal-panel');
const detailModalBackdrop = document.getElementById('detailModalBackdrop');
const detailModalClose = document.getElementById('detailModalClose');
const detailModalMedia = document.getElementById('detailModalMedia');
const detailModalImage = document.getElementById('detailModalImage');
const detailModalIconWrap = document.getElementById('detailModalIconWrap');
const detailModalIcon = document.getElementById('detailModalIcon');
const detailModalMeta = document.getElementById('detailModalMeta');
const detailModalTitle = document.getElementById('detailModalTitle');
const detailModalText = document.getElementById('detailModalText');

let lastExpandTrigger = null;
// Where a moved .video-wrap came from, so closeDetailModal can put it
// back in exactly the right spot in its card instead of just
// anywhere.
let videoWrapHomeParent = null;
let videoWrapHomeNextSibling = null;

function openDetailModal(triggerBtn) {
  const card = triggerBtn.closest('.expandable');
  if (!card || !detailModal) return;

  // Random Moments cards have no data-expand-* attributes: their
  // title, date, and photo are read straight from the visible card,
  // so each one only has to be typed once.
  const title = card.dataset.expandTitle
    || (card.querySelector('.thing-title')?.textContent.trim() ?? '');
  const meta = card.dataset.expandMeta
    || (card.querySelector('.thing-date')?.textContent.trim() ?? '');
  const image = card.dataset.expandImage
    || (card.querySelector('.thing-media img')?.getAttribute('src') ?? '');
  const icon = card.dataset.expandIcon || '';
  const template = card.querySelector('.card-detail');
  const videoWrap = card.querySelector('.video-wrap');

  if (title) {
    detailModalTitle.textContent = title;
    detailModalTitle.hidden = false;
  } else {
    detailModalTitle.hidden = true;
  }

  if (meta) {
    detailModalMeta.textContent = meta;
    detailModalMeta.hidden = false;
  } else {
    detailModalMeta.hidden = true;
  }

  if (videoWrap) {
    // Move the card's own video element into the modal — reusing it
    // directly means the same file and its click-to-play behavior
    // just keep working; nothing is duplicated.
    videoWrapHomeParent = videoWrap.parentElement;
    videoWrapHomeNextSibling = videoWrap.nextSibling;
    detailModalMedia.appendChild(videoWrap);

    // Always force a fresh load here, rather than checking whether
    // it's "already loaded" and only conditionally repainting — this
    // is exactly the kind of DOM move (appendChild to a new parent)
    // that can reset a <video>'s own readyState in Safari, so
    // checking readyState right after the move isn't reliable: by
    // the time we check it, Safari may have already reset it back to
    // 0, silently skipping the repaint. A fresh load is effectively
    // instant for a local file, so unconditionally reloading here
    // costs nothing and sidesteps the whole question of what state
    // did or didn't survive the move.
    const movedVideo = videoWrap.querySelector('.card-video');
    if (movedVideo) {
      evictLeastRecentIfNeeded();
      loadVideoFile(videoWrap);
    }
    detailModalMedia.hidden = false;
    detailModalIconWrap.hidden = true;
    detailModalImage.hidden = true;
    detailModalImage.src = '';
    detailModalImage.alt = '';
  } else if (image) {
    detailModalImage.src = image;
    detailModalImage.alt = title;
    detailModalImage.hidden = false;
    detailModalMedia.hidden = false;
    detailModalIconWrap.hidden = true;
    detailModalIcon.textContent = '';
  } else if (icon) {
    detailModalIcon.textContent = icon;
    detailModalIconWrap.hidden = false;
    detailModalMedia.hidden = true;
    detailModalImage.hidden = true;
    detailModalImage.src = '';
    detailModalImage.alt = '';
  } else {
    detailModalMedia.hidden = true;
    detailModalIconWrap.hidden = true;
    detailModalImage.hidden = true;
    detailModalImage.src = '';
    detailModalImage.alt = '';
    detailModalIcon.textContent = '';
  }

  detailModalText.innerHTML = '';
  if (template) {
    detailModalText.appendChild(template.content.cloneNode(true));
  }

  lastExpandTrigger = triggerBtn;
  detailModal.classList.add('is-open');
  detailModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  if (detailModalPanel) detailModalPanel.scrollTop = 0;
  playCardPop();
}

function closeDetailModal() {
  if (!detailModal || !detailModal.classList.contains('is-open')) return;
  detailModal.classList.remove('is-open');
  detailModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  playCardClose();

  // If a video was moved into the modal, put it back where it came
  // from. Pausing it too — it shouldn't keep playing (with audio)
  // once its enlarged view is no longer visible.
  const movedVideoWrap = detailModalMedia.querySelector('.video-wrap');
  if (movedVideoWrap && videoWrapHomeParent) {
    const video = movedVideoWrap.querySelector('.card-video');
    if (video && !video.paused) video.pause();
    videoWrapHomeParent.insertBefore(movedVideoWrap, videoWrapHomeNextSibling);
    // Same reasoning as when opening the modal: moving the video back
    // to its card is itself a DOM reparent, which can leave Safari
    // showing a blank thumbnail on the card even though the file is
    // still loaded. Forcing a fresh load here keeps the card's own
    // thumbnail correct too, not just the modal's.
    if (video) {
      evictLeastRecentIfNeeded();
      loadVideoFile(movedVideoWrap);
    }
  }
  videoWrapHomeParent = null;
  videoWrapHomeNextSibling = null;

  if (lastExpandTrigger) lastExpandTrigger.focus({ preventScroll: true });
}

document.querySelectorAll('.card-expand-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // don't also trigger the whole-card click handler below
    spawnRipple(btn, e);
    openDetailModal(btn);
  });
});

// Pressing anywhere else on an expandable card also opens the detail
// view — not just the small "See more" button — so the whole card
// reads as clickable. The video area is the one exception: a video
// card's click already has its own job (playing the clip), so clicks
// there are left alone rather than also popping open the modal.
document.querySelectorAll('.expandable').forEach((card) => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('.video-wrap')) return;
    if (e.target.closest('.card-expand-btn')) return; // already handled above
    // Cards without a "See more" button (Random Moments) open from
    // the card itself.
    const btn = card.querySelector('.card-expand-btn');
    openDetailModal(btn || card);
  });
});

if (detailModalClose) detailModalClose.addEventListener('click', closeDetailModal);
if (detailModalBackdrop) detailModalBackdrop.addEventListener('click', closeDetailModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && detailModal && detailModal.classList.contains('is-open')) {
    closeDetailModal();
  }
});

/* ==================================================================
   11. VIDEO CARDS — windowed loading + click-to-play with audio

   Loading on approach alone isn't enough once there are hundreds of
   videos — everything that loads in also has to unload again once
   it's no longer relevant, or scrolling through the whole page once
   ends up with everything loaded simultaneously anyway. This section
   does both:

   1. LOAD-IN: a video's file starts loading once its card is within
      ~600px of the viewport.
   2. LOAD-OUT: a video is unloaded once its card is well outside a
      WIDER distance (~1400px) — the gap between the two thresholds
      stops a video sitting near the edge from loading/unloading
      repeatedly on small scroll jitters.
   3. HARD CAP: on top of that, at most MAX_LOADED_VIDEOS files are
      ever kept loaded at once, no matter how it's scrolled through —
      this is what actually guarantees the browser's media-decoder
      limit is never approached. Making room evicts a loaded video
      that's currently scrolled OFF screen if one exists (so it can
      reload cleanly the next time it comes back into view); only if
      every loaded video happens to be on-screen at once does it fall
      back to the least-recently-used one instead.
   4. A video that's actually playing is never unloaded or evicted —
      only paused ones are ever touched.
   5. If a paused video does get unloaded partway through, its
      position is remembered — scrolling back and pressing play again
      resumes from there instead of restarting.

   The <video> itself is marked `muted` in the HTML purely so browsers
   allow nudging it to a frame before the person has interacted with
   the page; it's explicitly un-muted the moment real playback starts,
   so what actually plays is always the video's own embedded audio.
   ================================================================== */

// How many video files can be loaded (decoded, showing a thumbnail
// frame, or playing) at once. This is comfortably above what a
// normal viewport shows at a time — e.g. a 4-column grid with a row
// and a half visible is already ~6 cards — so a full screen's worth
// of videos doesn't force eviction just from sitting there. It's
// still far below the point where a browser's media-decoder limits
// become a real concern (that's what caused the "hundreds loading at
// once" lag before this windowing system existed at all).
const MAX_LOADED_VIDEOS = 16;

// Which .video-wrap elements currently have their file loaded, in
// least-recently-used-first order. Re-inserting a key (via
// markRecentlyUsed) moves it to the most-recently-used end.
const loadedVideos = new Map();

function markRecentlyUsed(wrap) {
  loadedVideos.delete(wrap);
  loadedVideos.set(wrap, true);
}

// Rough on-screen check for eviction purposes — doesn't need to be
// exact, just enough to tell "currently visible" from "scrolled away".
function isRoughlyOnScreen(el) {
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

// Forces the video to actually repaint a frame at (roughly) its
// current position. Setting currentTime to 0 first, then back,
// guarantees a real value change — some browsers (Safari in
// particular) skip repainting on a seek to the same time it's
// already sitting at, which matters because moving a <video> to a
// new parent in the DOM (e.g. into the detail modal) can silently
// drop its previously-painted frame in Safari, even though the file
// itself is technically still loaded.
function nudgeVideoFrame(video) {
  try {
    const resumeTime = parseFloat(video.dataset.resumeTime || '');
    const target = resumeTime > 0 ? resumeTime : (video.currentTime || 0.1);
    video.currentTime = 0;
    requestAnimationFrame(() => {
      video.currentTime = target;
    });
  } catch (err) {
    // Some browsers disallow seeking before enough data has
    // buffered — harmless to skip, the video just shows black
    // until playback starts instead of a frame preview.
  }
}

function loadVideoFile(wrap) {
  const video = wrap.querySelector('.card-video');
  if (!video) return;
  const source = video.querySelector('source[data-src]');
  if (source && source.dataset.src) {
    source.src = source.dataset.src;
    video.load();
  }
  video.dataset.loaded = 'true';
  markRecentlyUsed(wrap);
}

function unloadVideoFile(wrap) {
  const video = wrap.querySelector('.card-video');
  if (!video || video.dataset.loaded !== 'true') return;
  if (!video.paused) return; // never interrupt something actually playing

  // Remember how far in they'd gotten, so pressing play again later
  // resumes instead of restarting from the beginning.
  if (video.currentTime > 0.5) {
    video.dataset.resumeTime = String(video.currentTime);
  }

  const source = video.querySelector('source[data-src]');
  if (source) source.removeAttribute('src');
  video.removeAttribute('src');
  video.load(); // releases the decoder/buffered data, not just hides it

  video.controls = false;
  video.dataset.loaded = 'false';
  wrap.classList.remove('is-playing');
  loadedVideos.delete(wrap);
}

// Frees up a slot for a new video. Prefers unloading a loaded video
// that's currently scrolled OFF screen — it'll reload cleanly the
// next time its card scrolls back into view via the load observer
// below. Only if every currently-loaded video happens to be visible
// on screen at the same time does this fall back to the plain
// least-recently-used one instead — better than not evicting at all,
// but rare enough with a sane cap that it shouldn't come up often.
function evictLeastRecentIfNeeded() {
  if (loadedVideos.size < MAX_LOADED_VIDEOS) return;

  let offScreenCandidate = null;
  let fallbackCandidate = null;

  for (const candidateWrap of loadedVideos.keys()) {
    const candidateVideo = candidateWrap.querySelector('.card-video');
    if (!candidateVideo || !candidateVideo.paused) continue; // never touch anything playing

    if (!fallbackCandidate) fallbackCandidate = candidateWrap;
    if (!isRoughlyOnScreen(candidateWrap)) {
      offScreenCandidate = candidateWrap;
      break;
    }
  }

  const toEvict = offScreenCandidate || fallbackCandidate;
  if (toEvict) unloadVideoFile(toEvict);
  // If nothing was evictable (everything loaded is either playing or
  // visible on screen right now), allow the cap to be exceeded
  // slightly rather than blank out a thumbnail someone is looking at.
}

function requestLoadVideo(wrap) {
  const video = wrap.querySelector('.card-video');
  if (!video) return;
  if (video.dataset.loaded === 'true') {
    markRecentlyUsed(wrap);
    return;
  }
  evictLeastRecentIfNeeded();
  loadVideoFile(wrap);
}

const videoLoadObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) requestLoadVideo(entry.target);
  });
}, { rootMargin: '600px 0px', threshold: 0 });

const videoUnloadObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) unloadVideoFile(entry.target);
  });
}, { rootMargin: '1400px 0px', threshold: 0 });

document.querySelectorAll('.video-wrap').forEach((wrap) => {
  const video = wrap.querySelector('.card-video');
  const playBtn = wrap.querySelector('.video-play-btn');
  if (!video) return;

  videoLoadObserver.observe(wrap);
  videoUnloadObserver.observe(wrap);

  // Nudge the video to just past the very start once its metadata is
  // ready, so a frame actually renders as the card's cover image
  // (some browsers won't paint anything at exactly currentTime = 0).
  // If this video was unloaded earlier while partway through, resume
  // there instead.
  video.addEventListener('loadedmetadata', () => nudgeVideoFrame(video));

  // A fully-watched video shouldn't resume at its own ending —
  // let a replay start fresh.
  video.addEventListener('ended', () => {
    delete video.dataset.resumeTime;
  });

  function startPlayback() {
    // Defensive: guarantees the file is loaded even if this fires
    // before the load observer got to it.
    requestLoadVideo(wrap);
    video.muted = false; // real playback should always have sound
    video.controls = true;
    wrap.classList.add('is-playing');
    // .play() returns a promise that can reject if the browser
    // blocks it for some reason — fail quietly and leave native
    // controls visible so the person can just press play there.
    video.play().catch(() => {});
  }

  if (playBtn) {
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      spawnRipple(playBtn, e);
      startPlayback();
    });
  }

  // Clicking the video itself (its cover frame, before playback
  // starts) also starts it — not just the button.
  video.addEventListener('click', () => {
    if (!wrap.classList.contains('is-playing')) startPlayback();
  });
});