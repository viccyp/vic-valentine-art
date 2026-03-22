/**
 * Turbo replaces the entire <body>, which detaches nodes briefly — enough to reload
 * iframes and break Spotify's embed controller. Keep the live #music-dock attached
 * to document.documentElement during the swap, then place it back on the new body.
 */
(function () {
    if (typeof document === 'undefined' || window.__vvTurboPersistMusicDock) return;
    window.__vvTurboPersistMusicDock = true;

    function removeStaleDockFromIncoming(newBody) {
        if (!newBody || !(newBody instanceof HTMLBodyElement)) return;
        const stale = newBody.querySelector('#music-dock');
        if (stale) stale.remove();
    }

    function hoistLiveDock() {
        const dock = document.getElementById('music-dock');
        if (!dock || dock.parentNode === document.documentElement) return;
        if (document.body && document.body.contains(dock)) {
            document.documentElement.appendChild(dock);
        }
    }

    function restoreDockToBody() {
        const dock = document.getElementById('music-dock');
        if (!dock || dock.parentNode !== document.documentElement || !document.body) return;
        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.parentNode === document.body) {
            document.body.insertBefore(dock, lightbox);
        } else {
            const firstScript = document.body.querySelector('script');
            if (firstScript) {
                document.body.insertBefore(dock, firstScript);
            } else {
                document.body.appendChild(dock);
            }
        }
    }

    document.addEventListener('turbo:before-render', (event) => {
        const newBody = event.detail && event.detail.newBody;
        removeStaleDockFromIncoming(newBody);
        hoistLiveDock();
    });

    document.addEventListener('turbo:load', restoreDockToBody);
})();
