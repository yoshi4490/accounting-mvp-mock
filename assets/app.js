(() => {
  const topbar = document.querySelector(".topbar");
  const sidebar = document.querySelector(".sidebar");

  if (topbar && sidebar) {
    const leftGroup = document.createElement("div");
    leftGroup.className = "topbar-group";

    const menuToggle = document.createElement("button");
    menuToggle.className = "menu-toggle";
    menuToggle.type = "button";
    menuToggle.textContent = "メニュー";

    menuToggle.addEventListener("click", () => {
      document.body.classList.toggle("nav-open");
    });

    const first = topbar.firstElementChild;
    topbar.prepend(leftGroup);
    leftGroup.appendChild(menuToggle);

    if (first) {
      leftGroup.appendChild(first);
    }

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!document.body.classList.contains("nav-open")) return;
      if (target.closest(".sidebar") || target.closest(".menu-toggle")) return;
      document.body.classList.remove("nav-open");
    });
  }

  const revealTargets = document.querySelectorAll(".card, .landing-header, .step");
  revealTargets.forEach((el, idx) => {
    el.classList.add("reveal");
    setTimeout(() => {
      el.classList.add("show");
    }, 40 + idx * 26);
  });

  const progressBars = document.querySelectorAll(".progress");
  progressBars.forEach((bar) => {
    const current = bar.getAttribute("style") || "";
    const match = current.match(/width\s*:\s*([\d.]+%)/i);
    if (!match) return;

    bar.style.width = "0";
    requestAnimationFrame(() => {
      bar.style.width = match[1];
    });
  });
})();
