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

const VV_VIDEO_MOBILE_MQ = '(max-width: 768px)';

/** Pick desktop vs mobile file (see data-desktop-src / data-mobile-src on the video). */
function applyResponsiveHeroVideoSrc(v) {
    const desk = v.dataset.desktopSrc;
    const mob = v.dataset.mobileSrc;
    if (!desk || !mob) return;
    const useMobile = window.matchMedia(VV_VIDEO_MOBILE_MQ).matches;
    const next = useMobile ? mob : desk;
    if (v.dataset.vvActiveSrc === next) return;
    v.dataset.vvActiveSrc = next;
    v.src = next;
    v.load();
}

/** iOS / mobile: muted autoplay often needs explicit play() + webkit-playsinline; lighter preload helps cellular. */
function initMobileFriendlyAutoplayVideos() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const candidates = document.querySelectorAll('video.page-bg-video__media, video.art-hero__media');
    candidates.forEach((v) => {
        applyResponsiveHeroVideoSrc(v);
        if (reduceMotion) {
            v.removeAttribute('autoplay');
            v.pause();
            return;
        }
        v.muted = true;
        v.defaultMuted = true;
        v.setAttribute('muted', '');
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        if ('playsInline' in v) v.playsInline = true;
        if (!v.preload || v.preload === 'auto') v.preload = 'metadata';

        const nudge = () => {
            const p = v.play();
            if (p !== undefined && typeof p.catch === 'function') p.catch(() => {});
        };
        nudge();
        v.addEventListener('canplay', nudge, { once: true });
        v.addEventListener('loadeddata', nudge, { once: true });
    });
}

document.addEventListener('DOMContentLoaded', initMobileFriendlyAutoplayVideos);
document.addEventListener('turbo:load', initMobileFriendlyAutoplayVideos);

if (typeof window !== 'undefined' && !window.__vvVideoResizeBound) {
    window.__vvVideoResizeBound = true;
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => initMobileFriendlyAutoplayVideos(), 200);
    });
}

if (typeof window !== 'undefined' && !window.__vvVideoInteractionUnlock) {
    window.__vvVideoInteractionUnlock = true;
    const unlockVideos = () => {
        document.querySelectorAll('video.page-bg-video__media, video.art-hero__media').forEach((v) => {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const p = v.play();
            if (p !== undefined && typeof p.catch === 'function') p.catch(() => {});
        });
    };
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') unlockVideos();
    });
    document.addEventListener('touchstart', unlockVideos, { passive: true, capture: true });
    document.addEventListener('click', unlockVideos, { capture: true });
}
