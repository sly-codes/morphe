// Turns the scroll position into a float progress: 0 on the first section,
// 1 on the second, 1.5 halfway between the second and the third, and so on.
export function trackScroll(sections, state) {
  const links = [...document.querySelectorAll('[data-nav]')];
  let tops = [];

  function measure() {
    tops = sections.map((section) => section.offsetTop);
    update();
  }

  function update() {
    const y = window.scrollY;
    let i = 0;
    while (i < tops.length - 1 && y >= tops[i + 1]) i++;

    const next = tops[i + 1];
    const fraction = next === undefined ? 0 : (y - tops[i]) / (next - tops[i]);
    state.progress = Math.min(sections.length - 1, i + fraction);

    const active = Math.round(state.progress);
    links.forEach((link, n) => {
      if (n === active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', measure);
  measure();
}

export function revealOnScroll(elements) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      }
    },
    { threshold: 0.35 }
  );

  elements.forEach((element) => observer.observe(element));
}
