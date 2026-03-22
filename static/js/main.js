document.addEventListener('DOMContentLoaded', () => {
    initLightbox();
    initGalleryFilter();
    initFlashDismiss();
});

// ── Lightbox ────────────────────────────────────────────────────

function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const lbImg = lightbox.querySelector('img');
    const closeBtn = lightbox.querySelector('.lightbox__close');
    const prevBtn = lightbox.querySelector('.lightbox__nav--prev');
    const nextBtn = lightbox.querySelector('.lightbox__nav--next');
    if (!lbImg || !closeBtn || !prevBtn || !nextBtn) return;

    let images = [];
    let currentIndex = 0;

    function collectImages() {
        images = Array.from(document.querySelectorAll('[data-lightbox] img, img[data-lightbox]'));
    }

    function open(index) {
        collectImages();
        if (!images.length || index < 0 || index >= images.length) return;
        currentIndex = index;
        lbImg.src = images[currentIndex].src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function prev() {
        if (!images.length) return;
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        lbImg.src = images[currentIndex].src;
    }

    function next() {
        if (!images.length) return;
        currentIndex = (currentIndex + 1) % images.length;
        lbImg.src = images[currentIndex].src;
    }

    document.addEventListener('click', (e) => {
        const card = e.target.closest('[data-lightbox]');
        if (card) {
            const img = card.tagName === 'IMG' ? card : card.querySelector('img');
            if (img) {
                collectImages();
                const idx = images.indexOf(img);
                if (idx >= 0) open(idx);
            }
        }
    });

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); next(); });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) close();
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') prev();
        if (e.key === 'ArrowRight') next();
    });
}

// ── Gallery Filter ──────────────────────────────────────────────

function initGalleryFilter() {
    const tabs = document.querySelectorAll('.filter-tabs button');
    const grid = document.getElementById('gallery-grid');
    if (!tabs.length || !grid) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.dataset.filter;
            const cards = grid.querySelectorAll('.photo-card');

            cards.forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// ── Flash Messages ──────────────────────────────────────────────

function initFlashDismiss() {
    document.querySelectorAll('.flash').forEach(flash => {
        setTimeout(() => {
            flash.style.transition = 'opacity 0.3s';
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 300);
        }, 4000);
    });
}
