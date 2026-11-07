(() => {
  "use strict";

  const hero = document.getElementById("hero");
  const stage = document.getElementById("stage");
  const thumb = hero.querySelector(".thumb");
  const thumbImg = document.getElementById("thumbImg");
  const intro = hero.querySelector(".intro");
  const solidEl = hero.querySelector(".title__solid");
  const outlineEl = hero.querySelector(".title__outline");
  const leadEl = hero.querySelector(".lead");
  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("navLinks");
  const cartDrawer = document.getElementById("cart");
  const cartBackdrop = document.getElementById("cartBackdrop");
  const cartOpeners = [...document.querySelectorAll(".nav__cta, .dock__cta")];
  const cartBody = cartDrawer.querySelector(".cart-drawer__body");
  const cartItemsList = document.getElementById("cartItems");
  const cartEmpty = document.getElementById("cartEmpty");
  const cart = new Map();
  let cartOpener = null;
 

  // One entry per watch. Swap the image paths when you have more watches.
  const data = [
    {
      solid: "Wear",
      outline: "Time.",
      lead: "Authentic, hand-picked watches built to last. Find the one that tells your story.",
      img: "assets/images/watch.png",
    },
    {
      solid: "Own",
      outline: "Class.",
      lead: "Classic gold finishes and clean dials, chosen for people who notice the details.",
      img: "assets/images/watch2.png",
    },
    {
      solid: "Keep",
      outline: "Legacy.",
      lead: "A good watch is a gift that outlasts the occasion. Pick one worth passing on.",
      img: "assets/images/watch3.png",
    },
  ];

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FADE = reduce ? 0 : 500;    // text fade time
  const SLIDE = reduce ? 0 : 900;   // watch slide time
  const EASE = "cubic-bezier(.77, 0, .18, 1)";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ===== Wake: only things near the moving watch get pushed + rippled =====
  const WAKE_SELECTOR = ".title__solid, .title__outline, .lead, .actions .btn, .nav__links a, .nav__cta, .lang li, .thumb, .mega__panel, .mega__stage";
  const WAKE_BAND = 140;  // px: how close the watch must get before an item reacts
  const WAKE_PUSH = 8;    // px: how far items are pushed away
  const WAKE_TILT = 7;    // deg: 3D lean
  let wakeOn = false;

  function startWake() {
    if (reduce || wakeOn) return;
    wakeOn = true;
    const items = [...hero.querySelectorAll(WAKE_SELECTOR)];
    const base = items.map((el) => el.getBoundingClientRect());
    const prev = new Map();
    let last = performance.now();

    (function frame(now) {
      const dt = Math.max(now - last, 1);
      last = now;

      // where each watch is, and how fast it is moving
      const wakes = [];
      stage.querySelectorAll(".watch").forEach((w) => {
        const r = w.getBoundingClientRect();
        const c = r.left + r.width / 2;
        const v = prev.has(w) ? Math.abs(c - prev.get(w)) / dt : 0;
        prev.set(w, c);
        wakes.push({ c, half: r.width * 0.3, m: Math.min(1, v / 0.35) });
      });

      items.forEach((el, i) => {
        const r = base[i];
        const mid = r.left + r.width / 2;
        let e = 0, side = 0;
        wakes.forEach((w) => {
          const gap = Math.max(w.c - w.half - r.right, r.left - (w.c + w.half), 0);
          const k = Math.max(0, 1 - gap / WAKE_BAND) * w.m;
          if (k > e) {
            e = k;
            side = Math.max(-1, Math.min(1, (mid - w.c) / (r.width / 2 + w.half)));
          }
        });
        e = e * e * (3 - 2 * e); // smooth in/out
        const wob = Math.sin(now / 120 + i * 0.8);
        el.style.translate = `${(side * e * WAKE_PUSH).toFixed(2)}px ${(wob * e * 2).toFixed(2)}px`;
        el.style.rotate = `0 1 0 ${(-side * e * WAKE_TILT).toFixed(2)}deg`;
      });

      if (wakeOn) requestAnimationFrame(frame);
      else items.forEach((el) => { el.style.translate = ""; el.style.rotate = ""; });
    })(performance.now());
  }

  function stopWake() { wakeOn = false; }

  let current = 0;
  let busy = false;
  let lockedUntil = 0;

  function applyContent(i) {
    const d = data[i];
    solidEl.textContent = d.solid;
    outlineEl.textContent = d.outline;
    leadEl.textContent = d.lead;
    thumbImg.src = data[(i + 1) % data.length].img;
  }

  function animateContentChange(i) {
    applyContent(i);
    intro.classList.remove("is-changing");
    void intro.offsetWidth;
    intro.classList.add("is-changing");
  }

  applyContent(0);
data.forEach((d) => { const i = new Image(); i.src = d.img; });

  // Start position for the incoming watch: tucked inside the thumbnail card, at the little watch's size
  function thumbStart(panel) {
    // measure the panel where it will finally rest
    panel.style.transition = "none";
    panel.style.setProperty("--x", "0px");
    panel.style.setProperty("--y", "0px");
    panel.style.setProperty("--s", "1");

    const img = panel.querySelector("img");
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    const pr = panel.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    const tr = thumbImg.getBoundingClientRect();

    const kMain = Math.min(ir.width / nw, ir.height / nh);   // big watch: object-fit contain
    const kThumb = Math.max(tr.width / nw, tr.height / nh);  // little watch: object-fit cover
    const s = kThumb / kMain;

    const P = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
    const o = { x: ir.left + ir.width / 2 - P.x, y: ir.top + ir.height / 2 - P.y };
    const c = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 };
    const x = c.x - P.x - s * o.x;
    const y = c.y - P.y - s * o.y;

    // mask: show only what sits inside the little card at the start (the card crops the strap ends)
    const q = (px, py) => ({ x: (px - P.x - x) / s, y: (py - P.y - y) / s });
    const tl = q(tr.left, tr.top);
    const br = q(tr.right, tr.bottom);
    const clip = `inset(${tl.y + pr.height / 2}px ${pr.width / 2 - br.x}px ${pr.height / 2 - br.y}px ${tl.x + pr.width / 2}px)`;

    return { s, x, y, clip, ic: { x: ir.left + ir.width / 2, y: ir.top + ir.height / 2 }, tc: c, tr };
  }

  // Same start for the notch layer, so the whole "frame" emerges from the card together with the watch
  function layerStart(layer, from) {
    layer.style.transition = "none";
    layer.style.setProperty("--x", "0px");
    layer.style.setProperty("--y", "0px");
    layer.style.setProperty("--s", "1");
    layer.style.clipPath = "none";

    const lr = layer.getBoundingClientRect();
    const L = { x: lr.left + lr.width / 2, y: lr.top + lr.height / 2 };
    const x = from.tc.x - L.x - from.s * (from.ic.x - L.x);
    const y = from.tc.y - L.y - from.s * (from.ic.y - L.y);

    const q = (px, py) => ({ x: (px - L.x - x) / from.s, y: (py - L.y - y) / from.s });
    const tl = q(from.tr.left, from.tr.top);
    const br = q(from.tr.right, from.tr.bottom);
    const clip = `inset(${tl.y + lr.height / 2}px ${lr.width / 2 - br.x}px ${lr.height / 2 - br.y}px ${tl.x + lr.width / 2}px)`;
    return { x, y, clip };
  }

  function makePanel(src) {
    const panel = document.createElement("div");
    panel.className = "watch";
    const img = new Image();
    img.src = src;
    img.alt = "Gold SALIM watch";
    panel.appendChild(img);
    return panel;
  }

  // Compact layouts move the current watch out and cross-fade the next one in place.
  async function next() {
    if (busy || performance.now() < lockedUntil) return;
    busy = true;

    const target = (current + 1) % data.length;
    const compactLayout = window.matchMedia("(max-width: 1439px)").matches;

    const outgoing = stage.querySelector(".watch");
    const outgoingLayer = compactLayout ? null : stage.querySelector(".notches");
    const incoming = makePanel(data[target].img);
    const incomingLayer = outgoingLayer ? outgoingLayer.cloneNode(true) : null;
    if (incomingLayer) outgoingLayer.parentNode.appendChild(incomingLayer);
    const incomingImage = incoming.firstChild;
    if (compactLayout) {
      incomingImage.style.transition = "none";
      incomingImage.style.opacity = "0";
      incomingImage.style.transform = "scale(.96)";
    }
    stage.appendChild(incoming);
    if (!incomingImage.complete) {
      await new Promise((resolve, reject) => {
        incomingImage.addEventListener("load", resolve, { once: true });
        incomingImage.addEventListener("error", () => reject(new Error(`Failed to load watch image: ${incomingImage.src}`)), { once: true });
      });
    }
    if (!incomingImage.naturalWidth) throw new Error(`Failed to load watch image: ${incomingImage.src}`);

    const dist = hero.clientWidth / 2 + outgoing.offsetWidth / 2 + 40;
    const incomingPanels = incomingLayer ? [incoming, incomingLayer] : [incoming];
    incomingPanels.forEach((el) => {
      el.style.transition = "none";
      el.style.clipPath = "none";
      el.style.setProperty("--x", compactLayout ? "0px" : dist + "px");
      el.style.setProperty("--y", "0px");
      el.style.setProperty("--s", "1");
    });
    void incoming.offsetWidth;

    const OUT_MS = reduce ? 0 : compactLayout ? 750 : 1000;
    const IN_MS = reduce ? 0 : compactLayout ? 750 : 1500;
    const OUT_EASE = "cubic-bezier(.35, 0, .65, 1)"; // steady, no sudden burst
    const IN_EASE = "cubic-bezier(.15, .6, .3, 1)";  // glides in, settles softly

    startWake();

    if (compactLayout) {
      outgoing.style.transition = `transform ${OUT_MS}ms ${OUT_EASE}`;
      outgoing.style.setProperty("--x", dist + "px");
      current = target;
      animateContentChange(current);
      incomingImage.style.transition = `opacity ${IN_MS}ms ease, transform ${IN_MS}ms ease`;
      incomingImage.style.opacity = "1";
      incomingImage.style.transform = "none";
      await wait(Math.max(OUT_MS, IN_MS));
      outgoing.remove();
    } else {
      [outgoing, outgoingLayer].forEach((el) => {
        el.style.transition = `transform ${OUT_MS}ms ${OUT_EASE}`;
        el.style.setProperty("--x", -dist + "px");
      });
      await wait(OUT_MS);
      outgoing.remove();
      outgoingLayer.remove();

      current = target;
      animateContentChange(current);

      [incoming, incomingLayer].forEach((el) => {
        el.style.transition = `transform ${IN_MS}ms ${IN_EASE}`;
        el.style.setProperty("--x", "0px");
      });
      await wait(IN_MS);
    }

    stopWake();

    busy = false;
    lockedUntil = performance.now() + 300;
    scheduleAuto(); // restart the 5s countdown once the new watch has landed
  }

  // ===== Triggers (forward only) =====
  window.addEventListener(
    "wheel",
    (e) => {
      if (window.scrollY > 10) return;               // already in the next section
      if (!(e.deltaY > 10 || e.deltaX > 10)) return; // only forward scrolls
      // on watches 1 and 2 the wheel switches watches; on the last one it scrolls the page
      if (current < data.length - 1 || busy || performance.now() < lockedUntil) {
        e.preventDefault();
        next();
      }
    },
    { passive: false }
  );

  let startX = 0;
  window.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (startX - e.changedTouches[0].clientX > 50) next(); // swipe left
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next(); // ArrowDown now scrolls the page normally
  });

  thumb.setAttribute("role", "button");
  thumb.setAttribute("tabindex", "0");
  thumb.setAttribute("aria-label", "Next watch");
  thumb.addEventListener("click", next);
  thumb.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); }
  });

  // ===== Auto slide: a new watch every 5 seconds =====
  const AUTO_MS = 5000;
  let autoTimer = null;

  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (reduce) return;
    autoTimer = setTimeout(() => {
      const heroInView = hero.getBoundingClientRect().bottom > window.innerHeight * 0.5;
      if (document.hidden || !heroInView || busy) { scheduleAuto(); return; } // wait, then try again
      next();
      scheduleAuto(); // safety; next() also restarts it when the watch lands
    }, AUTO_MS);
  }
  scheduleAuto();

  // ===== Dropdown header =====
  const dock = document.getElementById("dock");
  const dockLinks = document.getElementById("dockLinks");
  const dockPill = dock.querySelector(".dock__pill");
  const mobileNav = document.getElementById("mobileNav");
  const mobilePill = mobileNav.querySelector(".mobile-nav__pill");
  const mobileAnchors = [...mobileNav.querySelectorAll("a")];
  const pageSections = [...document.querySelectorAll(".page-section")];
 
  const dockBurger = document.getElementById("dockBurger");
  const dockAnchors = [...dockLinks.querySelectorAll("a")];
  const spyTargets = dockAnchors
    .map((a) => ({ a, el: document.querySelector(a.getAttribute("href")) }))
    .filter((t) => t.el);
  const mobileSpyTargets = mobileAnchors
    .map((a) => ({ a, el: document.querySelector(a.getAttribute("href")) }))
    .filter((t) => t.el);
  let activeLink = null;
  let activeMobileLink = null;
  let hoveredMobileLink = null;
  let focusedMobileLink = null;

  function updateMobileHighlight() {
    const highlighted = hoveredMobileLink || focusedMobileLink || activeMobileLink;
    mobileNav.classList.toggle("has-hover", Boolean(hoveredMobileLink || focusedMobileLink));
    mobileAnchors.forEach((a) => a.classList.toggle("is-hovered", a === hoveredMobileLink || a === focusedMobileLink));
    mobilePillTo(highlighted);
  }

  function mobilePillTo(link) {
    if (!link) {
      mobilePill.style.opacity = "0";
      mobileAnchors.forEach((a) => a.classList.remove("is-active"));
      return;
    }
    const width = Math.min(60, Math.max(0, link.getBoundingClientRect().width - 8));
    const left = link.offsetLeft + (link.offsetWidth - width) / 2;
    if (mobilePill.style.opacity !== "1") {
      mobilePill.style.transition = "none";
      mobilePill.style.width = width + "px";
      mobilePill.style.transform = `translateX(${left}px)`;
      void mobilePill.offsetWidth;
      mobilePill.style.transition = "";
    }
    mobilePill.style.width = width + "px";
    mobilePill.style.transform = `translateX(${left}px)`;
    mobilePill.style.opacity = "1";
    mobileAnchors.forEach((a) => a.classList.toggle("is-active", a === link));
  }

  // slide the dark pill under a link (or hide it)
  function pillTo(link) {
    if (!link || window.innerWidth <= 900) {
      dockPill.style.opacity = "0";
      dockAnchors.forEach((a) => a.classList.remove("is-under"));
      return;
    }
    if (dockPill.style.opacity !== "1") {          // first appearance: jump, don't fly in
      dockPill.style.transition = "none";
      dockPill.style.width = link.offsetWidth + "px";
      dockPill.style.transform = `translateX(${link.offsetLeft}px)`;
      void dockPill.offsetWidth;
      dockPill.style.transition = "";
    }
    dockPill.style.width = link.offsetWidth + "px";
    dockPill.style.transform = `translateX(${link.offsetLeft}px)`;
    dockPill.style.opacity = "1";
    dockAnchors.forEach((a) => a.classList.toggle("is-under", a === link));
  }

  function updateDock() {
    const y = window.scrollY;
    // visible exactly when the main header has scrolled out of view
    dock.classList.toggle("is-visible", hero.querySelector(".nav").getBoundingClientRect().bottom <= 0);

    // deep brown while any cream content section is under the header
    const overLightSection = pageSections.some((section) => {
      if (section.classList.contains("collection-section") || section.classList.contains("contact-section")) return false;   // deep brown sections
      const rect = section.getBoundingClientRect();
      return rect.top <= 50 && rect.bottom > 50;
    });
    dock.classList.toggle("is-dark", overLightSection);

    // active link = the section crossing 40% down the screen
    const line = window.innerHeight * 0.4;
    let found = null;
    spyTargets.forEach((t) => {
      const r = t.el.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) found = t.a;
    });
    if (found !== activeLink) {
      activeLink = found;
      dockAnchors.forEach((a) => a.classList.toggle("is-active", a === found));
      pillTo(found);
    }

    let mobileFound = null;
    mobileSpyTargets.forEach((t) => {
      const r = t.el.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) mobileFound = t.a;
    });
    if (mobileFound !== activeMobileLink) {
      activeMobileLink = mobileFound;
      updateMobileHighlight();
    }

  }

  window.addEventListener("scroll", updateDock, { passive: true });
  window.addEventListener("resize", () => {
    updateDock();
    pillTo(activeLink);
    updateMobileHighlight();
  });
  window.addEventListener("load", () => pillTo(activeLink));
  updateDock();

  // ===== Collection feature =====
  const collectionData = {
    gold: {
      index: "01",
      title: "Gold<br><em>Classics.</em>",
      kicker: "THE SIGNATURE EDIT",
      description: "Polished gold finishes and considered details. Timeless pieces made to be worn, noticed, and kept.",
      count: "12 PIECES",
      image: "assets/images/watch2.png",
    },
    diamond: {
      index: "02",
      title: "Diamond<br><em>Edition.</em>",
      kicker: "MADE TO BE NOTICED",
      description: "Brilliant stones meet a luminous gold finish in a collection made for your standout moments.",
      count: "8 PIECES",
      image: "assets/images/watch3.png",
    },
    everyday: {
      index: "03",
      title: "Everyday<br><em>Icons.</em>",
      kicker: "THE DAILY ROTATION",
      description: "Clean lines, confident dials, and easy-to-wear silhouettes. The pieces you reach for, day after day.",
      count: "15 PIECES",
      image: "assets/images/watch.png",
    },
    limited: {
      index: "04",
      title: "Limited<br><em>Pieces.</em>",
      kicker: "RARE BY DESIGN",
      description: "Distinctive finishes and considered details, selected in small numbers for those who look closer.",
      count: "5 PIECES",
      image: "assets/images/watch3.png",
    },
  };
  const collectionChoices = [...document.querySelectorAll("[data-collection-select]")];
  const collectionImage = document.querySelector(".collection-art__image");
  const collectionTitle = document.querySelector("[data-collection-title]");
  const collectionKicker = document.querySelector("[data-collection-kicker]");
  const collectionDescription = document.querySelector("[data-collection-description]");
  const collectionCount = document.querySelector("[data-collection-count]");
  const collectionIndex = document.querySelector("[data-collection-index]");

  function selectCollection(key) {
    const item = collectionData[key];
    if (!item) return;

    collectionChoices.forEach((choice) => {
      const selected = choice.dataset.collectionSelect === key;
      choice.classList.toggle("is-active", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
    collectionIndex.textContent = item.index;
    collectionTitle.innerHTML = item.title;
    collectionKicker.textContent = item.kicker;
    collectionDescription.textContent = item.description;
    collectionCount.textContent = item.count;
    if (collectionImage.getAttribute("src") !== item.image) {
      collectionImage.classList.remove("is-changing");
      void collectionImage.offsetWidth;
      collectionImage.src = item.image;
      collectionImage.classList.add("is-changing");
    }
  }

  collectionChoices.forEach((choice) => {
    choice.addEventListener("click", () => selectCollection(choice.dataset.collectionSelect));
  });

  // hover: pill follows the mouse, returns to the active link on leave
  dockAnchors.forEach((a) => a.addEventListener("mouseenter", () => pillTo(a)));
  dockLinks.addEventListener("mouseleave", () => pillTo(activeLink));

  mobileAnchors.forEach((a) => {
    a.addEventListener("mouseenter", () => {
      hoveredMobileLink = a;
      updateMobileHighlight();
    });
    a.addEventListener("mouseleave", () => {
      if (hoveredMobileLink === a) hoveredMobileLink = null;
      updateMobileHighlight();
    });
    a.addEventListener("focus", () => {
      focusedMobileLink = a;
      updateMobileHighlight();
    });
    a.addEventListener("blur", () => {
      if (focusedMobileLink === a) focusedMobileLink = null;
      updateMobileHighlight();
    });
  });

  // mobile burger for the dropdown header
  dockBurger.addEventListener("click", () => {
    toggleMenu(dockBurger);
  });
  dockAnchors.forEach((a) =>
    a.addEventListener("click", () => {
      dockBurger.setAttribute("aria-expanded", "false");
      dockLinks.classList.remove("is-open");
    })
  );

  // ===== Collection mega dropdown =====
  const mega = document.getElementById("mega");
  const megaTriggers = [...document.querySelectorAll(".chev-btn")];
  const megaRows = [...mega.querySelectorAll(".mega__row")];
  const megaHL = mega.querySelector(".mega__hl");
  const megaImgs = [...mega.querySelectorAll(".mega__img")];
  const megaMeta = mega.querySelector(".mega__meta");
  const canHover = window.matchMedia("(hover: hover)").matches;
  let megaTimer = null;
  let activeRow = null;
  let imgFlip = 0; // which of the two preview images is currently showing

  megaRows.forEach((r) => { const i = new Image(); i.src = r.dataset.img; }); // preload previews

  function hlTo(row) {
    megaHL.style.height = row.offsetHeight + "px";
    megaHL.style.transform = `translateY(${row.offsetTop}px)`;
  }

  function setMeta(row, animate) {
    mega.querySelector(".mega__title").textContent = row.dataset.title;
    mega.querySelector(".mega__desc").textContent = row.dataset.desc;
    mega.querySelector(".mega__count").textContent = row.dataset.count;
    if (animate) { megaMeta.classList.remove("in"); void megaMeta.offsetWidth; megaMeta.classList.add("in"); }
  }

  // the old preview slides/blurs out left, the new one drifts in from the right
  function swapImage(src) {
    const cur = megaImgs[imgFlip];
    const nxt = megaImgs[1 - imgFlip];
    imgFlip = 1 - imgFlip;
    nxt.classList.add("no-anim");
    nxt.classList.remove("is-active", "is-leaving");
    void nxt.offsetWidth;
    nxt.src = src;
    nxt.classList.remove("no-anim");
    void nxt.offsetWidth;
    nxt.classList.add("is-active");
    cur.classList.remove("is-active");
    cur.classList.add("is-leaving");
  }

  function selectRow(row, first) {
    if (row === activeRow) return;
    activeRow = row;
    megaRows.forEach((r) => r.classList.toggle("is-active", r === row));
    hlTo(row);
    if (!first) swapImage(row.dataset.img);
    setMeta(row, !first);
  }

  // sit the panel right under whichever header opened it
  function placeMega(trigger) {
    const inDock = !!trigger.closest(".dock");
    const bar = trigger.closest(inDock ? ".dock__left" : ".nav");
    const brand = bar.querySelector(inDock ? ".dock__brand" : ".brand");
    const tr = trigger.getBoundingClientRect();
    const w = mega.offsetWidth;
    const left = Math.max(12, Math.min(brand.getBoundingClientRect().left - 8, window.innerWidth - w - 12));
    mega.style.left = left + "px";
    mega.style.top = (inDock ? bar.getBoundingClientRect().bottom + 12 : tr.bottom + 16) + "px";
  }

  function openMega(trigger) {
    clearTimeout(megaTimer);
    closeMenu();
    placeMega(trigger);
    mega.classList.add("is-open");
    megaTriggers.forEach((t) => {
      t.classList.toggle("is-open", t === trigger);
      t.setAttribute("aria-expanded", String(t === trigger));
    });
    if (activeRow) hlTo(activeRow); // re-measure now that it's on screen
  }

  function closeMega() {
    mega.classList.remove("is-open");
    megaTriggers.forEach((t) => { t.classList.remove("is-open"); t.setAttribute("aria-expanded", "false"); });
  }

  function closeSoon() { clearTimeout(megaTimer); megaTimer = setTimeout(closeMega, 200); }

  megaTriggers.forEach((t) => {
    t.setAttribute("aria-haspopup", "true");
    t.setAttribute("aria-expanded", "false");
    t.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (t.classList.contains("is-open")) closeMega(); else openMega(t);
    });
  });
  document.addEventListener("click", (e) => { if (!mega.contains(e.target)) closeMega(); });

  mega.addEventListener("mouseenter", () => clearTimeout(megaTimer));
  mega.addEventListener("mouseleave", closeSoon);
  mega.addEventListener("focusin", () => clearTimeout(megaTimer));
  mega.addEventListener("focusout", closeSoon);

  megaRows.forEach((r) => {
    r.addEventListener("mouseenter", () => selectRow(r));
    r.addEventListener("focus", () => selectRow(r));
    r.addEventListener("click", () => {
      selectCollection(r.dataset.collectionKey);
      closeMega();
    });
  });
  mega.querySelector(".mega__go").addEventListener("click", () => {
    if (activeRow) selectCollection(activeRow.dataset.collectionKey);
    closeMega();
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMega(); });
  window.addEventListener("scroll", closeMega, { passive: true });
  window.addEventListener("load", () => activeRow && hlTo(activeRow));
  selectRow(megaRows[0], true);

  // ===== Burger menu panel (desktop) =====
  const menu = document.getElementById("menu");
  const menuCats = [...menu.querySelectorAll(".menu__cat")];
  let activeCat = menuCats[0];
  const menuBurgers = [burger, dockBurger];
  let menuFrom = null;

  function openMenuFrom(btn) {
    closeMega();
    menuFrom = btn;
    if (window.innerWidth <= 900) {
      menu.style.top = "76px";
      menu.style.bottom = "calc(76px + env(safe-area-inset-bottom))";
      menu.style.left = "12px";
      menu.style.right = "12px";
    } else {
      const bar = btn.closest(".dock__right, .nav__right").getBoundingClientRect();
      menu.style.top = bar.bottom + 12 + "px";
      menu.style.bottom = "auto";
      menu.style.left = "auto";
      menu.style.right = document.documentElement.clientWidth - bar.right + "px";
    }
    menu.classList.add("is-open");
    menuBurgers.forEach((b) => b.setAttribute("aria-expanded", String(b === btn)));
  }

  function closeMenu() {
    if (!menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    menuFrom = null;
    menuBurgers.forEach((b) => b.setAttribute("aria-expanded", "false"));
  }

  function toggleMenu(btn) {
    if (menu.classList.contains("is-open") && menuFrom === btn) closeMenu();
    else openMenuFrom(btn);
  }

  function menuSelect(cat) {
    if (cat === activeCat) return;
    activeCat = cat;
    menuCats.forEach((c) => c.classList.toggle("is-active", c === cat));
  }

  menuCats.forEach((c) => {
    c.addEventListener("mouseenter", () => menuSelect(c));
    c.querySelector(".menu__row").addEventListener("focus", () => menuSelect(c));
  });
  menu.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link) {
      const collectionLink = link.dataset.collectionKey
        ? link
        : link.closest(".menu__cat")?.querySelector(".menu__row[data-collection-key]");
      if (collectionLink) selectCollection(collectionLink.dataset.collectionKey);
      closeMenu();
    }
  });
  document.addEventListener("click", (e) => {
    if (menu.classList.contains("is-open") && !menu.contains(e.target) && !e.target.closest(".burger, .dock__burger")) closeMenu();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  window.addEventListener("scroll", closeMenu, { passive: true });
  window.addEventListener("resize", closeMenu);

  // ===== Cart drawer =====
  function openCart(opener) {
    closeMenu();
    closeMega();
    cartOpener = opener;
    cartDrawer.classList.add("is-open");
    cartBackdrop.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden", "false");
    cartDrawer.inert = false;
    cartBackdrop.setAttribute("aria-hidden", "false");
    cartDrawer.querySelector("[data-cart-close]").focus();
  }

  function closeCart() {
    if (!cartDrawer.classList.contains("is-open")) return;
    cartDrawer.classList.remove("is-open");
    cartBackdrop.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    cartDrawer.inert = true;
    cartBackdrop.setAttribute("aria-hidden", "true");
    cartOpener?.focus();
    cartOpener = null;
  }

  cartOpeners.forEach((opener) => opener.addEventListener("click", (e) => {
    e.preventDefault();
    openCart(opener);
  }));
  cartDrawer.querySelectorAll("[data-cart-close]").forEach((closer) =>
    closer.addEventListener("click", closeCart)
  );
  cartBackdrop.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  const cartClear = document.getElementById("cartClear");
  const ICON_TRASH = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v5M14 11v5"/></svg>';
  const ICON_PLUS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const ICON_MINUS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';

  function makeBtn(className, html, label, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.innerHTML = html;
    b.setAttribute("aria-label", label);
    b.addEventListener("click", onClick);
    return b;
  }

  function renderCart() {
    cartItemsList.replaceChildren();
    let itemCount = 0;
    cart.forEach((item, id) => {
      itemCount += item.quantity;
      const row = document.createElement("li");
      row.className = "cart-drawer__item";

      const thumb = document.createElement("div");
      thumb.className = "cart-drawer__thumb";
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.name;
      thumb.append(img);

      const info = document.createElement("div");
      info.className = "cart-drawer__info";

      const name = document.createElement("span");
      name.className = "cart-drawer__item-name";
      name.textContent = item.name;

      const qty = document.createElement("div");
      qty.className = "cart-qty";
      const value = document.createElement("span");
      value.className = "cart-qty__value";
      value.textContent = item.quantity;
      const minus = makeBtn("cart-qty__btn", ICON_MINUS, `Decrease ${item.name}`, () => {
        if (item.quantity > 1) item.quantity -= 1;
        else cart.delete(id);
        renderCart();
      });
      const plus = makeBtn("cart-qty__btn", ICON_PLUS, `Increase ${item.name}`, () => {
        item.quantity += 1;
        renderCart();
      });
      qty.append(minus, value, plus);

      info.append(name, qty);

      const remove = makeBtn("cart-drawer__remove", ICON_TRASH, `Remove ${item.name} from cart`, () => {
        cart.delete(id);
        renderCart();
      });

      row.append(thumb, info, remove);
      cartItemsList.append(row);
    });

    cartEmpty.hidden = itemCount > 0;
    cartItemsList.hidden = itemCount === 0;
    cartClear.hidden = itemCount === 0;
    document.getElementById("cartShop").hidden = itemCount > 0;
    document.getElementById("cartView").hidden = itemCount === 0;
    cartBody.classList.toggle("is-empty", itemCount === 0);
    const products = cart.size; // header counts different products, not quantity
    cartOpeners.forEach((opener) => {
      const count = opener.querySelector(".cart-count");
      if (count.textContent !== String(products)) {
        count.textContent = String(products);
        count.classList.remove("is-bump");
        void count.offsetWidth;
        count.classList.add("is-bump");
      }
      opener.setAttribute("aria-label", `Cart, ${products} ${products === 1 ? "product" : "products"}`);
    });

    const diff = itemCount - lastCartQty; // quantity change -> floating +1 / -1 tag
    lastCartQty = itemCount;
    if (diff) popCount(diff);
  }

  let lastCartQty = 0;

  function popCount(delta) {
    const drawerOpen = cartDrawer.classList.contains("is-open");
    const anchors = drawerOpen
      ? [document.getElementById("cartTitle")] // counter is hidden behind the drawer, so tag the title
      : cartOpeners.map((opener) => opener.querySelector(".cart-count"));
    anchors.forEach((el) => {
      let r = el.getBoundingClientRect();
      if (drawerOpen) {
        const range = document.createRange();
        range.selectNodeContents(el);
        r = range.getBoundingClientRect(); // just the title text, not the full-width heading
      }
      if (!r.width || r.bottom < 0 || r.top > window.innerHeight) return; // hidden or off-screen
      const pop = document.createElement("span");
      pop.className = "cart-pop " + (delta > 0 ? "is-plus" : "is-minus");
      pop.textContent = (delta > 0 ? "+" : "\u2212") + Math.abs(delta);
      pop.style.left = Math.min(r.right + 8, window.innerWidth - 52) + "px";
      pop.style.top = r.top + r.height / 2 + "px";
      document.body.append(pop);
      setTimeout(() => pop.remove(), 1200);
    });
  }

  cartClear.addEventListener("click", () => {
    cart.clear();
    renderCart();
  });

  const BTN_ICON_SPIN = '<svg class="btn-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>';
  const BTN_ICON_VERIFIED = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>';

  document.querySelectorAll("[data-cart-add]").forEach((button) => {
    const label = button.querySelector("span");
    const defaultIcon = button.querySelector("svg").outerHTML;
    const defaultText = label.textContent;
    let busy = false; // front-end rate limit: one add at a time per button

    const setState = (iconHtml, text) => {
      button.querySelector("svg").outerHTML = iconHtml;
      label.textContent = text;
    };

    button.addEventListener("click", () => {
      if (busy) return;
      busy = true;
      button.style.minWidth = button.offsetWidth + "px"; // keep width steady while text changes
      button.classList.add("is-busy");
      button.setAttribute("aria-busy", "true");
      setState(BTN_ICON_SPIN, "Adding…");

      setTimeout(() => {
        const id = button.dataset.cartAdd;
        const item = cart.get(id);
        const image = button.closest(".shop-card").querySelector("img").getAttribute("src");
        if (item) item.quantity += 1;
        else cart.set(id, { name: button.dataset.productName, image, quantity: 1 });
        renderCart();
        button.classList.add("is-done");
        setState(BTN_ICON_VERIFIED, "Added");
      }, 450);

      setTimeout(() => {
        button.classList.remove("is-busy", "is-done");
        button.removeAttribute("aria-busy");
        setState(defaultIcon, defaultText);
        button.style.minWidth = "";
        busy = false;
      }, 1100);
    });
  });

  // ===== Shop category filters =====
  const shopFilters = [...document.querySelectorAll("[data-shop-filter]")];
  const shopCards = [...document.querySelectorAll("[data-shop-category]")];
  const shopCount = document.querySelector("[data-shop-count]");

  shopFilters.forEach((filter) => {
    filter.addEventListener("click", () => {
      const category = filter.dataset.shopFilter;
      let visibleCount = 0;
      shopFilters.forEach((button) => {
        const selected = button === filter;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      shopCards.forEach((card) => {
        const visible = category === "all" || card.dataset.shopCategory === category;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      shopCount.textContent = String(visibleCount).padStart(2, "0");
    });
  });

  // ===== Burger menu =====
  burger.addEventListener("click", () => {
    toggleMenu(burger);
  });
  navLinks.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      burger.setAttribute("aria-expanded", "false");
      navLinks.classList.remove("is-open");
    })
  );

  // ===== Language switch (visual only for now) =====
  document.querySelectorAll(".lang button").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".lang button").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    })
  );
})();