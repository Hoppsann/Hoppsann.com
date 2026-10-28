// =========================================
// GALLERY — inline section below cards
//
// The grid shows small WebP thumbnails from /img/gallery/thumbs/
// (made by tools/make_thumbs.py). The lightbox shows the full image.
// If a thumbnail is missing, the full image is used instead.
// =========================================

(() => {
  const PHOTOS_URL = '/data/photos.json';
  const THUMB_DIR = '/img/gallery/thumbs/';

  let photos = [];
  let currentIndex = 0;
  let loadPromise = null;
  let built = false;

  const $ = (id) => document.getElementById(id);

  // ---- data ----

  function thumbFor(photo) {
    if (photo.thumb) return photo.thumb;
    const file = photo.src.split('/').pop().replace(/\.[^.]+$/, '');
    return `${THUMB_DIR}${file}.webp`;
  }

  function loadPhotos() {
    if (!loadPromise) {
      loadPromise = fetch(PHOTOS_URL)
        .then(res => {
          if (!res.ok) throw new Error(`photos.json not found (${res.status})`);
          return res.json();
        })
        .then(data => {
          photos = data.photos || [];
        })
        .catch(err => {
          loadPromise = null; // allow a retry on the next click
          throw err;
        });
    }
    return loadPromise;
  }

  // ---- grid ----

  function buildGrid() {
    const grid = $('gallery-grid');

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }
    }, { rootMargin: '300px 0px' });

    // build everything off-DOM, then insert once
    const fragment = document.createDocumentFragment();

    photos.forEach((photo, i) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'gallery-item';
      item.dataset.index = i;
      item.setAttribute('aria-label', `Open photo ${i + 1}`);

      const img = document.createElement('img');
      img.src = thumbFor(photo);
      img.alt = photo.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      // reserves the right space before the image loads (no layout jumps)
      if (photo.width && photo.height) {
        img.width = photo.width;
        img.height = photo.height;
      }
      img.addEventListener('error', () => {
        if (img.src !== new URL(photo.src, location.href).href) img.src = photo.src;
      }, { once: true });

      item.appendChild(img);
      fragment.appendChild(item);
      observer.observe(item);
    });

    grid.replaceChildren(fragment);
    built = true;
  }

  // ---- open / close ----

  async function openGallery() {
    $('gallery-section').classList.add('is-open');
    if (built) return;

    const grid = $('gallery-grid');
    grid.innerHTML = '<p class="gallery-loading">Loading…</p>';

    try {
      await loadPhotos();
      buildGrid();
    } catch (e) {
      grid.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'gallery-loading';
      p.textContent = `Error: ${e.message}`;
      grid.appendChild(p);
      console.error('[gallery]', e);
    }
  }

  function closeGallery() {
    $('gallery-section').classList.remove('is-open');
  }

  // ---- lightbox ----

  function preload(index) {
    const photo = photos[(index + photos.length) % photos.length];
    if (photo) new Image().src = photo.src;
  }

  function showPhoto(index) {
    if (!photos.length) return;
    currentIndex = (index + photos.length) % photos.length;
    const photo = photos[currentIndex];

    const img = $('lightbox-img');
    // show the (already loaded) thumbnail instantly, then swap in the full image
    img.src = thumbFor(photo);
    img.alt = photo.alt || '';

    const full = new Image();
    full.decoding = 'async';
    full.src = photo.src;
    full.decode().then(() => {
      if (photos[currentIndex] === photo) img.src = photo.src;
    }).catch(() => {
      if (photos[currentIndex] === photo) img.src = photo.src;
    });

    $('lightbox-counter').textContent = `${currentIndex + 1} / ${photos.length}`;

    preload(currentIndex + 1);
    preload(currentIndex - 1);
  }

  function openLightbox(index) {
    showPhoto(index);
    $('lightbox').classList.add('is-open');
    document.documentElement.classList.add('lightbox-open');
  }

  function closeLightbox() {
    $('lightbox').classList.remove('is-open');
    document.documentElement.classList.remove('lightbox-open');
  }

  function isLightboxOpen() {
    return $('lightbox').classList.contains('is-open');
  }

  // ---- init ----

  document.addEventListener('DOMContentLoaded', () => {
    // card1 opens the gallery; card2/3 close it
    document.querySelector('.card1')?.addEventListener('click', openGallery);
    document.querySelector('.card2')?.addEventListener('click', closeGallery);
    document.querySelector('.card3')?.addEventListener('click', closeGallery);

    // one listener for the whole grid instead of one per photo
    $('gallery-grid').addEventListener('click', (e) => {
      const item = e.target.closest('.gallery-item');
      if (item) openLightbox(Number(item.dataset.index));
    });

    $('lightbox-close').addEventListener('click', closeLightbox);
    $('lightbox-prev').addEventListener('click', () => showPhoto(currentIndex - 1));
    $('lightbox-next').addEventListener('click', () => showPhoto(currentIndex + 1));

    // click the dark backdrop to close
    $('lightbox').addEventListener('click', (e) => {
      if (e.target === e.currentTarget || e.target.id === 'lightbox-img-wrap') closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!isLightboxOpen()) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showPhoto(currentIndex - 1);
      else if (e.key === 'ArrowRight') showPhoto(currentIndex + 1);
    });

    // swipe in the lightbox
    let touchStartX = 0;
    let touchStartY = 0;
    const lb = $('lightbox');
    lb.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        showPhoto(currentIndex + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
  });
})();
