/**
 * Turbo can leave the window scrolled mid-page after Drive visits (e.g. from the
 * previous page). Reset scroll on forward navigations only; keep restore visits
 * so back/forward still recover prior scroll positions.
 */
(function () {
    if (typeof document === 'undefined' || window.__vvTurboScrollTop) return;
    window.__vvTurboScrollTop = true;

    let lastVisitAction;

    document.addEventListener('turbo:visit', (e) => {
        lastVisitAction = (e.detail && e.detail.action) || 'advance';
    });

    function shouldResetScroll() {
        return lastVisitAction === 'advance' || lastVisitAction === 'replace';
    }

    function scrollWindowToTop() {
        const html = document.documentElement;
        const prev = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        html.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
        html.style.scrollBehavior = prev;
    }

    function resetScrollIfNeeded() {
        if (!shouldResetScroll()) return;
        scrollWindowToTop();
    }

    document.addEventListener('turbo:render', resetScrollIfNeeded);
    document.addEventListener('turbo:load', resetScrollIfNeeded);
})();
