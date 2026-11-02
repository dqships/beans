// The landing page's only script. No dependencies, and the page works without it.
(function () {
  // Reveal on view. Only things below the fold get hidden, and each animates once.
  var items = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.dataset.reveal = "in";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach(function (item) {
      if (item.getBoundingClientRect().top < innerHeight) return;
      item.dataset.reveal = "wait";
      observer.observe(item);
    });
  }

  // The bean on the vine. It sets off from the hero's now line, rides down the page, and passes
  // behind anything on the vine while an outline draws round that thing from where it went in.
  var stalk = document.querySelector("[data-stalk]");
  var now = stalk && stalk.querySelector("[data-now]");
  var track = stalk && stalk.querySelector("[data-bean-track]");
  if (now && track) {
    var traveler = track.firstElementChild;
    var still = matchMedia("(prefers-reduced-motion: reduce)");
    var crossings = Array.prototype.map.call(stalk.querySelectorAll("[data-cross]"), function (el) {
      var trace = el.querySelector("[data-trace]");
      return { el: el, trace: trace, halves: trace.querySelectorAll("path"), key: "" };
    });

    // Both halves start where the bean goes in and meet where it comes out, so each is a share of one outline.
    var shape = function (c, box, x) {
      var gap = (c.trace.getBoundingClientRect().width - box.width) / 2;
      var media = c.el.querySelector("img, video") || c.el;
      var w = box.width + gap * 2;
      var h = box.height + gap * 2;
      var r = (parseFloat(getComputedStyle(media).borderTopLeftRadius) || 0) + gap;
      x = Math.min(w - r, Math.max(r, x - box.left + gap));
      var key = [w, h, r, x].map(Math.round).join();
      if (key === c.key) return;
      c.key = key;
      c.trace.setAttribute("viewBox", "0 0 " + w + " " + h);
      var arc = "A" + r + " " + r + " 0 0 ";
      c.halves[0].setAttribute("d", "M" + x + " 0H" + (w - r) + arc + "1 " + w + " " + r + "V" + (h - r) + arc + "1 " + (w - r) + " " + h + "H" + x);
      c.halves[1].setAttribute("d", "M" + x + " 0H" + r + arc + "0 0 " + r + "V" + (h - r) + arc + "0 " + r + " " + h + "H" + x);
    };

    var hold = 0;

    // Near the foot of the page the vine's root is still below the middle of the screen, so in the
    // last stretch of scrolling the bean speeds up and lands on the root just as the page ends.
    var land = function () {
      var root = track.getBoundingClientRect().bottom - parseFloat(getComputedStyle(traveler).height);
      var left = Math.max(0, document.documentElement.scrollHeight - innerHeight - scrollY);
      var gap = root - left - hold;
      traveler.style.translate = "-50% calc(-50% + " + Math.max(0, gap - left) + "px)";
    };

    var queued = false;
    var trace = function () {
      queued = false;
      land();
      var bean = traveler.getBoundingClientRect();
      var x = bean.left + bean.width / 2;
      var y = bean.top + bean.height / 2;
      crossings.forEach(function (c) {
        var box = c.el.getBoundingClientRect();
        if (x < box.left || x > box.right || y < box.top) {
          c.trace.style.opacity = 0;
          return;
        }
        shape(c, box, x);
        var drawn = still.matches ? 1 : Math.min(1, (y - box.top) / box.height);
        // Once the bean is out, the outline fades over the next stretch of vine.
        c.trace.style.opacity = y <= box.bottom ? 1 : Math.max(0, 1 - (y - box.bottom) / box.height);
        c.halves[0].style.strokeDashoffset = 1 - drawn;
        c.halves[1].style.strokeDashoffset = 1 - drawn;
      });
    };
    var queue = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(trace);
    };

    var place = function () {
      var line = now.getBoundingClientRect();
      var lineY = line.top + line.height / 2;
      stalk.style.setProperty("--bean-start", lineY - stalk.getBoundingClientRect().top + "px");
      // Hold halfway down the screen, unless the now line starts higher than that.
      hold = Math.min(innerHeight / 2, lineY + scrollY);
      stalk.style.setProperty("--bean-stick", hold + "px");
      stalk.dataset.bean = "";
      crossings.forEach(function (c) {
        c.key = "";
      });
      queue();
    };

    place();
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", place);
    addEventListener("load", place);
  }

  // Phones play the square cut, so they get its poster too.
  var film = document.querySelector("video");
  if (film && matchMedia("(max-width: 720px)").matches) film.poster = "/video/beans-demo-poster-square.avif";

  // The hero demo: plant tasks on the Timebox.
  var demo = document.querySelector("[data-demo]");
  var grid = demo && demo.querySelector("[data-timebox]");
  if (!grid) return;
  var blocks = grid.querySelector("[data-blocks]");
  var template = grid.querySelector("[data-block-template]");
  var status = demo.querySelector("[data-status]");
  var hint = demo.querySelector("[data-hint]");
  var firstHour = 8;
  var slots = 16; // half hours on the grid
  var taken = { 0: 1, 2: 1, 4: 1, 5: 1 };

  function clock(slot, minutes) {
    var total = firstHour * 60 + slot * 30 + (minutes || 0);
    var hour = Math.floor(total / 60);
    var minute = total % 60;
    return (hour % 12 || 12) + ":" + (minute < 10 ? "0" : "") + minute + (hour < 12 ? "am" : "pm");
  }

  function span(minutes) {
    return Math.max(1, Math.ceil(minutes / 30));
  }

  function free(start, size) {
    for (var slot = start; slot + size <= slots; slot++) {
      var open = true;
      for (var i = 0; i < size; i++) if (taken[slot + i]) open = false;
      if (open) return slot;
    }
    return -1;
  }

  function plant(card, wanted) {
    var minutes = Number(card.dataset.minutes);
    var size = span(minutes);
    var slot = free(wanted, size);
    if (slot < 0) slot = free(0, size);
    if (slot < 0) return;
    for (var i = 0; i < size; i++) taken[slot + i] = 1;

    var block = template.cloneNode(true);
    block.removeAttribute("data-block-template");
    block.dataset.block = "";
    block.hidden = false;
    block.style.setProperty("--label-color", "var(--label-" + card.dataset.label + ")");
    block.style.gridRow = slot + 1 + " / span " + size;
    block.children[0].textContent = card.dataset.task;
    block.children[1].textContent = clock(slot) + " – " + clock(slot, minutes);
    blocks.appendChild(block);

    card.dataset.time = "";
    card.querySelector("[data-task-time]").textContent = clock(slot);
    var button = card.querySelector("[data-plant]");
    if (button) button.remove();
    status.textContent = card.dataset.task + " scheduled at " + clock(slot) + ".";
  }

  demo.dataset.dragReady = "";
  if (matchMedia("(pointer: coarse)").matches) hint.textContent = "Try it. Press Schedule to put a task on the Timebox.";
  hint.hidden = false;
  demo.querySelectorAll("[data-plant]").forEach(function (button) {
    button.hidden = false;
    button.addEventListener("click", function () {
      plant(button.closest("[data-task]"), 6);
    });
  });

  // Mouse and pen drag. Touch keeps scrolling the page, and uses the Schedule button.
  demo.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "touch" || event.button !== 0) return;
    var card = event.target.closest("[data-task]");
    if (!card || "time" in card.dataset || event.target.closest("label, button")) return;
    event.preventDefault();

    var rect = card.getBoundingClientRect();
    var ghost = card.cloneNode(true);
    ghost.style.cssText = "position:fixed;left:0;top:0;margin:0;pointer-events:none;z-index:80;";
    ghost.style.width = rect.width + "px";
    ghost.style.boxShadow = "var(--shadow-md)";
    ghost.style.rotate = "-1deg";
    var offsetX = event.clientX - rect.left;
    var offsetY = event.clientY - rect.top;
    function follow(move) {
      ghost.style.transform = "translate(" + (move.clientX - offsetX) + "px," + (move.clientY - offsetY) + "px)";
    }
    follow(event);
    document.body.appendChild(ghost);
    card.style.opacity = "var(--opacity-ghost)";

    function drop(up) {
      removeEventListener("pointermove", follow);
      removeEventListener("pointerup", drop);
      removeEventListener("pointercancel", drop);
      ghost.remove();
      card.style.opacity = "";
      var box = grid.getBoundingClientRect();
      var inside = up.clientX >= box.left && up.clientX <= box.right && up.clientY >= box.top && up.clientY <= box.bottom;
      if (up.type === "pointerup" && inside) {
        var half = parseFloat(getComputedStyle(blocks).gridTemplateRows);
        plant(card, Math.max(0, Math.min(slots - 1, Math.floor((up.clientY - box.top) / half))));
      }
    }
    addEventListener("pointermove", follow);
    addEventListener("pointerup", drop);
    addEventListener("pointercancel", drop);
  });
})();
