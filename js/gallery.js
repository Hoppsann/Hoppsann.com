// =========================================
// GALLERY — inline section below cards
// =========================================

const PHOTOS_URL = '/data/photos.json';

let photos = [];
let currentIndex = 0;
let loaded = false;

// ---- data ----

async function loadPhotos() {
  const res = await fetch(PHOTOS_URL);
  if (!res.ok) throw new Error(`photos.json not found (${res.status})`);
  const data = await res.json();
  photos = data.photos;
  loaded = true;
}

// ---- grid ----

function buildGrid() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '300px 0px' });

  photos.forEach((photo, i) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    item.appendChild(img);
    item.addEventListener('click', () => openLightbox(i));
    grid.appendChild(item);
    observer.observe(item);
  });
}

// ---- open / close ----

async function openGallery() {
  const section = document.getElementById('gallery-section');
  section.classList.add('is-open');

  if (!loaded) {
    try {
      document.getElementById('gallery-grid').innerHTML =
        '<p class="gallery-loading">Loading…</p>';
      await loadPhotos();
      buildGrid();
    } catch (e) {
      document.getElementById('gallery-grid').innerHTML =
        `<p class="gallery-loading">Error: ${e.message}</p>`;
      console.error('[gallery]', e);
    }
  }
}

function closeGallery() {
  document.getElementById('gallery-section').classList.remove('is-open');
}

// ---- lightbox ----

function openLightbox(index) {
  currentIndex = index;
  const lb   = document.getElementById('lightbox');
  const img  = document.getElementById('lightbox-img');
  const ctr  = document.getElementById('lightbox-counter');
  img.src    = photos[index].src;
  img.alt    = photos[index].alt || '';
  ctr.textContent = `${index + 1} / ${photos.length}`;
  lb.classList.add('is-open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('is-open');
}

function navigate(dir) {
  currentIndex = (currentIndex + dir + photos.length) % photos.length;
  openLightbox(currentIndex);
}

// ---- init ----

document.addEventListener('DOMContentLoaded', () => {

  // card1 toggles gallery; card2/3 close it
  document.querySelector('.card1')?.addEventListener('click', () => {
    const section = document.getElementById('gallery-section');
    section.classList.contains('is-open') ? closeGallery() : openGallery();
  });
  document.querySelector('.card2')?.addEventListener('click', closeGallery);
  document.querySelector('.card3')?.addEventListener('click', closeGallery);

  // lightbox controls
  document.getElementById('lightbox-close')
    .addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev')
    .addEventListener('click', () => navigate(-1));
  document.getElementById('lightbox-next')
    .addEventListener('click', () => navigate(1));

  // click backdrop to close lightbox
  document.getElementById('lightbox')
    .addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeLightbox();
    });

  // keyboard
  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('lightbox');
    const lbOpen = lb.classList.contains('is-open');
    if (e.key === 'Escape' && lbOpen) closeLightbox();
    if (lbOpen && e.key === 'ArrowLeft')  navigate(-1);
    if (lbOpen && e.key === 'ArrowRight') navigate(1);
  });

  // swipe in lightbox
  let touchStartX = 0;
  document.getElementById('lightbox').addEventListener('touchstart',
    (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  document.getElementById('lightbox').addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
  });
});