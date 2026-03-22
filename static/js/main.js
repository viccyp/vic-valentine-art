// Lightbox: single delegated listeners so Turbo navigations do not stack handlers.
(function initLightboxDelegation() {
    let images = [];
    let currentIndex = 0;

    function getLightbox() {
        return document.getElementById('lightbox');
    }

    function getLbImg() {
        return getLightbox()?.querySelector('img') || null;
    }

    function getLbCaption() {
        const lightbox = getLightbox();
        if (!lightbox) return null;
        let el = lightbox.querySelector('.lightbox__caption');
        if (!el) {
            el = document.createElement('p');
            el.className = 'lightbox__caption';
            el.setAttribute('hidden', '');
            lightbox.appendChild(el);
        }
        return el;
    }

    function captionForImage(img) {
        if (!img) return '';
        const container = img.closest('[data-lightbox]');
        if (!container) return '';
        const fig = container.querySelector('figcaption');
        if (fig) return fig.textContent.replace(/\s+/g, ' ').trim();
        const overlay = container.querySelector('.photo-card__overlay');
        if (overlay) return overlay.textContent.replace(/\s+/g, ' ').trim();
        return '';
    }

    function syncLightboxCaption() {
        const lightbox = getLightbox();
        const cap = getLbCaption();
        if (!cap || !lightbox) return;
        const img = images[currentIndex];
        const text = captionForImage(img);
        if (text) {
            cap.textContent = text;
            cap.removeAttribute('hidden');
            lightbox.classList.add('lightbox--has-caption');
        } else {
            cap.textContent = '';
            cap.setAttribute('hidden', '');
            lightbox.classList.remove('lightbox--has-caption');
        }
    }

    function collectImages() {
        images = Array.from(document.querySelectorAll('[data-lightbox] img, img[data-lightbox]'));
    }

    function open(index) {
        const lightbox = getLightbox();
        const lbImg = getLbImg();
        if (!lightbox || !lbImg) return;
        collectImages();
        if (!images.length || index < 0 || index >= images.length) return;
        currentIndex = index;
        lbImg.src = images[currentIndex].src;
        syncLightboxCaption();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        const lightbox = getLightbox();
        if (lightbox) {
            lightbox.classList.remove('active');
            lightbox.classList.remove('lightbox--has-caption');
        }
        document.body.style.overflow = '';
    }

    function prev() {
        const lbImg = getLbImg();
        if (!lbImg || !images.length) return;
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        lbImg.src = images[currentIndex].src;
        syncLightboxCaption();
    }

    function next() {
        const lbImg = getLbImg();
        if (!lbImg || !images.length) return;
        currentIndex = (currentIndex + 1) % images.length;
        lbImg.src = images[currentIndex].src;
        syncLightboxCaption();
    }

    document.addEventListener('click', (e) => {
        const lightbox = getLightbox();
        if (e.target.closest('.lightbox__close')) {
            e.preventDefault();
            close();
            return;
        }
        if (e.target.closest('.lightbox__nav--prev')) {
            e.preventDefault();
            e.stopPropagation();
            prev();
            return;
        }
        if (e.target.closest('.lightbox__nav--next')) {
            e.preventDefault();
            e.stopPropagation();
            next();
            return;
        }
        const card = e.target.closest('[data-lightbox]');
        if (card) {
            const img = card.tagName === 'IMG' ? card : card.querySelector('img');
            if (img) {
                collectImages();
                const idx = images.indexOf(img);
                if (idx >= 0) open(idx);
            }
            return;
        }
        if (lightbox && e.target === lightbox && lightbox.classList.contains('active')) {
            close();
        }
    });

    document.addEventListener('keydown', (e) => {
        const lightbox = getLightbox();
        if (!lightbox?.classList.contains('active')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') prev();
        if (e.key === 'ArrowRight') next();
    });
})();

// Gallery filter tabs: delegated (runs on any page with .filter-tabs + #gallery-grid).
document.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tabs button');
    if (!tab) return;
    const tabsRoot = tab.closest('.filter-tabs');
    const grid = document.getElementById('gallery-grid');
    if (!tabsRoot || !grid) return;
    tabsRoot.querySelectorAll('button').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const filter = tab.dataset.filter;
    grid.querySelectorAll('.photo-card').forEach((card) => {
        if (filter === 'all' || card.dataset.category === filter) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
});

function initFlashDismiss() {
    document.querySelectorAll('.flash').forEach((flash) => {
        setTimeout(() => {
            flash.style.transition = 'opacity 0.3s';
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 300);
        }, 4000);
    });
}

document.addEventListener('DOMContentLoaded', initFlashDismiss);
document.addEventListener('turbo:load', initFlashDismiss);
