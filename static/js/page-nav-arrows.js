(function () {
    const ORDER = ['/', '/visual/', '/audio/', '/velo/', '/code/', '/blog/'];
    const LABELS = ['Home', 'Visual', 'Audio', 'Velo', 'Code', 'Blog'];

    function normPath(pathname) {
        let p = pathname || '/';
        p = p.split('?')[0].split('#')[0];
        p = p.replace(/\/index\.html$/i, '/');
        if (p === '' || p === '/') return '/';
        if (!p.endsWith('/')) p += '/';
        return p;
    }

    function pageNavSlot(pathname) {
        const p = normPath(pathname);
        if (/^\/admin(\/|$)/i.test(p)) return -1;
        const exact = ORDER.indexOf(p);
        if (exact >= 0) return exact;
        if (p.startsWith('/post/')) return 5;
        if (p.startsWith('/audio/event/')) return 2;
        if (p.startsWith('/audio/')) return 2;
        if (p.startsWith('/visual/')) return 1;
        if (p.startsWith('/velo/')) return 3;
        if (p.startsWith('/code/')) return 4;
        if (p.startsWith('/blog/')) return 5;
        return -1;
    }

    function init() {
        const root = document.getElementById('page-nav-arrows');
        if (!root) return;
        const slot = pageNavSlot(window.location.pathname);
        if (slot < 0) {
            root.setAttribute('hidden', '');
            return;
        }
        const n = ORDER.length;
        const prevIdx = (slot - 1 + n) % n;
        const nextIdx = (slot + 1) % n;
        const prevA = root.querySelector('.page-nav-arrows__btn--prev');
        const nextA = root.querySelector('.page-nav-arrows__btn--next');
        if (!prevA || !nextA) return;
        prevA.href = ORDER[prevIdx];
        nextA.href = ORDER[nextIdx];
        prevA.setAttribute('aria-label', `Previous: ${LABELS[prevIdx]}`);
        nextA.setAttribute('aria-label', `Next: ${LABELS[nextIdx]}`);
        root.removeAttribute('hidden');
    }

    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('turbo:load', init);
})();
