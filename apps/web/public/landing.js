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

    var block = template.content.firstElementChild.cloneNode(true);
    block.style.setProperty("--label-color", "var(--label-" + card.dataset.label + ")");
    block.style.gridRow = slot + 1 + " / span " + size;
    block.children[0].textContent = card.dataset.task;
    block.children[1].textContent = clock(slot) + " – " + clock(slot, minutes);
    blocks.appendChild(block);

    card.dataset.time = "";
    card.querySelector("[data-task-time]").textContent = clock(slot);
    var button = card.querySelector("[data-plant]");
    if (button) button.remove();
    status.textContent = card.dataset.task + " planted at " + clock(slot) + ".";
  }

  demo.dataset.dragReady = "";
  if (matchMedia("(pointer: coarse)").matches) hint.textContent = "This part is live. Press Plant to put a task on the Timebox.";
  hint.hidden = false;
  demo.querySelectorAll("[data-plant]").forEach(function (button) {
    button.hidden = false;
    button.addEventListener("click", function () {
      plant(button.closest("[data-task]"), 6);
    });
  });

  // Mouse and pen drag. Touch keeps scrolling the page, and uses the Plant button.
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
