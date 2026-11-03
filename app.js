(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hero = document.querySelector('.hero');
  const replay = document.querySelector('.replay-intro');
  const replayIntro = () => {
    if (!hero || reducedMotion.matches) return;
    hero.classList.remove('intro-running');
    void hero.offsetWidth;
    hero.classList.add('intro-running');
  };
  if (hero && !reducedMotion.matches) {
    replayIntro();
    replay.hidden = false;
    replay.addEventListener('click', replayIntro);
  }

  // Pointer movement is confined to the product artwork; reading and clicking stay stable.
  document.querySelectorAll('.project-card, .hero-stage').forEach(surface => {
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    surface.addEventListener('pointermove', event => {
      if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
      const rect = surface.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width - .5;
      pointerY = (event.clientY - rect.top) / rect.height - .5;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        surface.style.setProperty('--tilt-rx', `${(-pointerY * 4).toFixed(2)}deg`);
        surface.style.setProperty('--tilt-ry', `${(pointerX * 4).toFixed(2)}deg`);
        surface.style.setProperty('--scene-x', `${(pointerX * 10).toFixed(2)}px`);
        surface.style.setProperty('--scene-y', `${(pointerY * 10).toFixed(2)}px`);
        frame = 0;
      });
    });
    surface.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      frame = 0;
      ['--tilt-rx', '--tilt-ry', '--scene-x', '--scene-y'].forEach(property => surface.style.removeProperty(property));
    });
  });

  // Scroll effects decorate the page; links, reading and native scrolling stay unchanged.
  const desktopDepth = window.matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');
  const projectScenes = [...document.querySelectorAll('.project-art')];
  const depthScenes = [...document.querySelectorAll('.hero-stage, .project-art')];
  const headingSources = [...document.querySelectorAll('.section-head h2, .contact h2')].map(heading => ({heading, html: heading.innerHTML}));
  const splitHeading = ({heading, html}) => {
    heading.innerHTML = html;
    const atoms = [];
    const flatten = (node, classes = '') => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).filter(Boolean).forEach(part => {
          if (/^\s+$/.test(part)) atoms.push({node: document.createTextNode(part), space: true});
          else {
            const word = document.createElement('span');
            word.className = `heading-word ${classes}`.trim();
            word.textContent = part;
            atoms.push({node: word});
          }
        });
      } else if (node.nodeName === 'BR') atoms.push({break: true});
      else [...node.childNodes].forEach(child => flatten(child, `${classes} ${node.className || ''}`.trim()));
    };
    [...heading.childNodes].forEach(node => flatten(node));
    heading.replaceChildren(...atoms.map(atom => atom.break ? document.createElement('br') : atom.node));
    const lines = [];
    let line;
    let top;
    let spacing = '';
    atoms.forEach(atom => {
      if (atom.break) {line = null; top = undefined; spacing = ''; return;}
      if (atom.space) {spacing += atom.node.textContent; return;}
      const nextTop = atom.node.getBoundingClientRect().top;
      if (!line || Math.abs(nextTop - top) > 3) {
        line = document.createElement('span');
        line.className = 'heading-line';
        const mask = document.createElement('span');
        mask.className = 'heading-mask';
        mask.style.setProperty('--line-index', String(lines.length));
        mask.append(line);
        lines.push(mask);
        top = nextTop;
        spacing = '';
      }
      if (spacing) line.append(document.createTextNode(spacing));
      line.append(atom.node.cloneNode(true));
      spacing = '';
    });
    heading.replaceChildren(...lines);
  };
  headingSources.forEach(splitHeading);
  document.querySelectorAll('.evidence-image').forEach(button => {
    const image = button.querySelector('img');
    const ready = () => button.classList.add('media-ready');
    if (image.complete) ready();
    else {
      image.addEventListener('load', ready, {once: true});
      image.addEventListener('error', ready, {once: true});
    }
  });
  const updateScrollEffects = () => {
    const enabled = !reducedMotion.matches && 'IntersectionObserver' in window;
    document.documentElement.classList.toggle('scroll-motion-ready', enabled);
    projectScenes.forEach(scene => {
      const rect = scene.getBoundingClientRect();
      if (enabled && (rect.bottom < -100 || rect.top > innerHeight + 100)) return;
      const progress = enabled ? Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight * .78))) : 1;
      const angle = scene.classList.contains('planzo-art') ? 5 : -6;
      scene.style.setProperty('--settle-angle', `${((1 - progress) * angle).toFixed(2)}deg`);
      scene.style.setProperty('--settle-scale', (.95 + .05 * progress).toFixed(3));
      scene.style.setProperty('--settle-y', `${((1 - progress) * 16).toFixed(2)}px`);
    });
    depthScenes.forEach(scene => {
      if (!enabled || !desktopDepth.matches) {
        scene.style.removeProperty('--depth-y');
        return;
      }
      const rect = scene.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const distance = Math.max(-1, Math.min(1, (innerHeight * .5 - rect.top - rect.height * .5) / (innerHeight * .5)));
      scene.style.setProperty('--depth-y', `${(distance * 16).toFixed(2)}px`);
    });
  };
  let headingResizeFrame;
  addEventListener('resize', () => {
    cancelAnimationFrame(headingResizeFrame);
    headingResizeFrame = requestAnimationFrame(() => {
      headingSources.forEach(splitHeading);
      updateScrollEffects();
    });
  });
  desktopDepth.addEventListener?.('change', updateScrollEffects);
  reducedMotion.addEventListener?.('change', updateScrollEffects);

  let progressFrame = 0;
  const updateProgress = () => {
    const distance = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--reading-progress', distance > 0 ? String(Math.min(1, scrollY / distance)) : '0');
    updateTimelines();
    updateScrollEffects();
    progressFrame = 0;
  };
  addEventListener('scroll', () => {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  }, {passive:true});
  addEventListener('resize', updateProgress);
  const timelines = [...document.querySelectorAll('[data-timeline]')];
  const updateTimelines = () => {
    let active = null;
    let nearest = Infinity;
    timelines.forEach(track => {
      const rect = track.getBoundingClientRect();
      const crossing = innerHeight * .68;
      const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (crossing - rect.top - 34) / Math.max(1, rect.height - 68)));
      track.style.setProperty('--timeline-progress', String(progress));
      const items = [...track.querySelectorAll('.journey-item')];
      const readingLine = innerHeight * .52;
      items.forEach(item => {
        const bounds = item.getBoundingClientRect();
        if (bounds.bottom < 140 || bounds.top > innerHeight * .86) return;
        const distance = bounds.top <= readingLine && bounds.bottom >= readingLine ? 0 : Math.min(Math.abs(bounds.top - readingLine), Math.abs(bounds.bottom - readingLine));
        if (distance < nearest) {active = item; nearest = distance;}
      });
      items.forEach(item => {
        item.classList.toggle('is-reached', reducedMotion.matches || item.getBoundingClientRect().top + 34 <= crossing);
      });
    });
    document.querySelectorAll('.journey-item').forEach(item => {
      item.querySelector('.journey-card').classList.toggle('is-active-chapter', !reducedMotion.matches && item === active);
    });
  };
  const chapterControls = new Map();
  document.querySelectorAll('.journey-card').forEach(details => {
    const summary = details.querySelector('summary');
    const panel = details.querySelector('.expand-panel');
    let animation;
    let expanded = details.open;
    const show = requested => {
      expanded = requested;
      const currentHeight = details.open ? panel.getBoundingClientRect().height : 0;
      if (animation) animation.cancel();
      animation = null;
      details.classList.toggle('is-expanded', expanded);
      if (expanded) details.open = true;
      const finish = () => {
        details.open = expanded;
        animation = null;
        updateProgress();
      };
      if (reducedMotion.matches || !panel.animate) {
        finish();
        return;
      }
      animation = panel.animate([
        {height: `${currentHeight}px`, opacity: currentHeight ? 1 : 0},
        {height: expanded ? `${panel.scrollHeight}px` : '0px', opacity: expanded ? 1 : 0}
      ], {duration: 380, easing: 'cubic-bezier(.22,1,.36,1)'});
      animation.onfinish = finish;
    };
    summary.addEventListener('click', event => {
      event.preventDefault();
      show(!expanded);
    });
    details.addEventListener('toggle', () => {
      if (!animation) {
        expanded = details.open;
        details.classList.toggle('is-expanded', expanded);
        updateProgress();
      }
    });
    reducedMotion.addEventListener?.('change', event => {
      if (event.matches && animation) animation.finish();
    });
    chapterControls.set(details.id, show);
  });
  const openChapter = id => chapterControls.get(id)?.(true);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) openChapter(link.getAttribute('href').slice(1));
  });
  addEventListener('hashchange', () => openChapter(location.hash.slice(1)));
  openChapter(location.hash.slice(1));
  if (timelines.length && 'ResizeObserver' in window) {
    new ResizeObserver(() => {
      if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
    }).observe(document.querySelector('main'));
  }
  updateTimelines();

  updateProgress();

  // The gallery remains a native, scrollable strip when JavaScript is unavailable.
  document.querySelectorAll('[data-carousel]').forEach(gallery => {
    const track = gallery.querySelector('.carousel-track');
    const slides = [...track.querySelectorAll('.carousel-slide')];
    const previous = gallery.querySelector('[data-prev]');
    const next = gallery.querySelector('[data-next]');
    const dots = [...gallery.querySelectorAll('[data-slide]')];
    const count = gallery.querySelector('.slide-count');
    const status = gallery.querySelector('[data-carousel-status]');
    let current = 0;
    let settleTimer;

    const update = (index, announce = false) => {
      current = Math.max(0, Math.min(slides.length - 1, index));
      previous.disabled = current === 0;
      next.disabled = current === slides.length - 1;
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
      count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      if (announce) status.textContent = `Slide ${current + 1} of ${slides.length}: ${slides[current].querySelector('figcaption b').textContent}`;
    };
    const go = index => {
      const target = Math.max(0, Math.min(slides.length - 1, index));
      update(target, true);
      track.scrollTo({left: target * track.clientWidth, behavior: reducedMotion.matches ? 'auto' : 'smooth'});
    };
    previous.addEventListener('click', () => go(current - 1));
    next.addEventListener('click', () => go(current + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
    track.addEventListener('keydown', event => {
      const destinations = {ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1};
      if (!(event.key in destinations)) return;
      event.preventDefault();
      go(destinations[event.key]);
    });
    track.addEventListener('scroll', () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => update(Math.round(track.scrollLeft / track.clientWidth), true), 120);
    }, {passive: true});
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        track.scrollTo({left: current * track.clientWidth, behavior: 'instant'});
      }).observe(track);
    }
    gallery.querySelector('.carousel-controls').hidden = false;
    update(0);
  });

  const mediaDialog = document.querySelector('.media-dialog');
  if (mediaDialog) {
    document.querySelectorAll('[data-enlarge]').forEach(button => {
      button.addEventListener('click', () => {
        const source = button.querySelector('img');
        const image = mediaDialog.querySelector('img');
        image.src = source.currentSrc || source.src;
        image.alt = source.alt;
        mediaDialog.querySelector('#media-caption').textContent = source.alt;
        mediaDialog.showModal();
      });
    });
    mediaDialog.querySelector('.media-close').addEventListener('click', () => mediaDialog.close());
    mediaDialog.addEventListener('click', event => {
      if (event.target === mediaDialog) {
        const rect = mediaDialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) mediaDialog.close();
      }
    });
  }

  const filterGroup = document.querySelector('.filters');
  if (filterGroup) {
    const items = [...document.querySelectorAll('.lab-item')];
    filterGroup.hidden = false;
    filterGroup.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      const selection = button.dataset.filter;
      filterGroup.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      let visible = 0;
      items.forEach(item => {
        item.hidden = selection !== 'all' && item.dataset.category !== selection;
        item.classList.remove('filter-enter');
        if (!item.hidden) {
          visible += 1;
          item.classList.add('is-visible');
          if (!reducedMotion.matches) {
            void item.offsetWidth;
            item.classList.add('filter-enter');
          }
        }
      });
      document.querySelector('.lab-count').textContent = `${visible} ${visible === 1 ? 'exploration' : 'explorations'}`;
    });
  }

  // Only nonessential decoration animates; content and navigation work without it.
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: 0.08});
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    document.documentElement.classList.add('reveal-ready');
    reducedMotion.addEventListener?.('change', event => {
      if (event.matches) document.documentElement.classList.remove('reveal-ready');
    });
  }

  reducedMotion.addEventListener?.('change', event => {
    if (replay) replay.hidden = event.matches;
    if (event.matches) hero?.classList.remove('intro-running');
  });
})();
