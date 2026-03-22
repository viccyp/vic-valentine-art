/**
 * Credits playlist + hidden Spotify embed via iFrame API.
 * https://developer.spotify.com/documentation/embeds/references/iframe-api
 *
 * Tracks are read from #credits-playlist when that block exists; otherwise the
 * last parsed list (or DEFAULT_TRACKS on first paint) keeps the embed usable site-wide.
 */
if (typeof window !== 'undefined' && !window.__vvMusicSpotifyBundleLoaded) {
    window.__vvMusicSpotifyBundleLoaded = true;
    (function () {
        var DEFAULT_TRACKS = [
            { id: '1qho1ycAdjJQVQZ7SdyTeI', title: 'Lisbon', artist: 'Marianne Collective' },
            { id: '2NHENv26qc6uGFafOxLMOm', title: 'Hypnotic', artist: 'Marianne Collective' },
            { id: '07TXXN0JHsLFR6oSFEITPq', title: 'Just Like You', artist: 'Searching For Sergio' },
            { id: '3guORTZpFBeAoy963TadRL', title: 'Parce que', artist: 'Harpie, Hendy, Tessera, Vic Valentine' },
            { id: '2uI1liemd45f1vSnYabhNF', title: 'Green Mountain State', artist: 'Rory Dinwoodie' },
            { id: '1TwzcE1N7VFkAlsSg3ay2P', title: 'Keep Me in the Garden', artist: 'Rory Dinwoodie' },
        ];

        var tracks = DEFAULT_TRACKS.slice();
        var controller = null;
        var currentIndex = -1;
        var lastPlayback = { isPaused: true, position: 0, duration: 0 };
        var embedCreated = false;
        var iframeApi = null;
        /** After loadUri(), Spotify often fires paused playback_update before resume() runs — avoid row icon flicker. */
        var expectPlayingAfterLoadUntil = 0;

        function $(sel, root) {
            return (root || document).querySelector(sel);
        }

        function $$(sel, root) {
            return Array.prototype.slice.call((root || document).querySelectorAll(sel));
        }

        function spotifyUri(id) {
            return 'spotify:track:' + id;
        }

        /** When #credits-playlist is in the document, replace `tracks` from markup. */
        function syncTracksFromDom() {
            var root = document.getElementById('credits-playlist');
            if (!root) return;
            var items = Array.from(root.querySelectorAll('li[data-track-index]'));
            items.sort(function (a, b) {
                return (
                    parseInt(a.getAttribute('data-track-index'), 10) -
                    parseInt(b.getAttribute('data-track-index'), 10)
                );
            });
            var next = [];
            items.forEach(function (li) {
                var a = li.querySelector('a.music-credit-spotify[href*="spotify.com/track/"]');
                if (!a) return;
                var href = a.getAttribute('href') || '';
                var m = href.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
                if (!m) return;
                var titleEl = li.querySelector('.music-credit-text__track');
                var artistEl = li.querySelector('.music-credit-text__artist');
                next.push({
                    id: m[1],
                    title: (titleEl && titleEl.textContent.trim()) || 'Track',
                    artist: (artistEl && artistEl.textContent.trim()) || '',
                });
            });
            if (next.length) tracks = next;
            if (currentIndex >= tracks.length) currentIndex = -1;
        }

        function syncRowButtons(data) {
            var playingNow = data.isPaused === false;
            $$('.music-credit-play').forEach(function (btn, i) {
                var on = i === currentIndex;
                var playing = on && playingNow;
                btn.classList.toggle('music-credit-play--on', on);
                btn.classList.toggle('music-credit-play--playing', playing);
                var t = tracks[i];
                var name = t ? t.title : 'Track';
                btn.setAttribute('aria-label', playing ? 'Pause ' + name : 'Play ' + name);
            });
            var transportPlay = $('#credits-transport-play');
            if (transportPlay) {
                var tPlaying = currentIndex >= 0 && playingNow;
                transportPlay.classList.toggle('music-credits-transport__btn--playing', tPlaying);
                transportPlay.setAttribute('aria-label', tPlaying ? 'Pause' : 'Play');
            }
        }

        function resetDockUi() {
            expectPlayingAfterLoadUntil = 0;
            lastPlayback = { isPaused: true, position: 0, duration: 0 };
            syncRowButtons({ isPaused: true });
        }

        function onPlaybackUpdate(e) {
            var data = e && e.data;
            if (!data) return;
            lastPlayback = {
                isPaused: data.isPaused,
                position: data.position || 0,
                duration: data.duration || 0,
            };
            if (data.isPaused === false) {
                expectPlayingAfterLoadUntil = 0;
            }
            var rowPaused = data.isPaused;
            if (
                expectPlayingAfterLoadUntil > 0 &&
                Date.now() < expectPlayingAfterLoadUntil &&
                currentIndex >= 0 &&
                data.isPaused === true
            ) {
                rowPaused = false;
            }
            syncRowButtons({ isPaused: rowPaused });
        }

        function playIndex(i, opts) {
            opts = opts || {};
            if (!controller || !tracks.length) return;
            var idx = ((i % tracks.length) + tracks.length) % tracks.length;
            var track = tracks[idx];

            if (opts.toggleIfSame && idx === currentIndex) {
                expectPlayingAfterLoadUntil = 0;
                controller.togglePlay();
                return;
            }

            currentIndex = idx;
            expectPlayingAfterLoadUntil = Date.now() + 1200;
            syncRowButtons({ isPaused: false });
            controller.loadUri(spotifyUri(track.id));

            window.setTimeout(function () {
                try {
                    controller.resume();
                } catch (_) {
                    try {
                        controller.play();
                    } catch (_) { /* autoplay / embed quirks */ }
                }
            }, 150);
        }

        function bindPlayerUIClicks() {
            if (typeof window === 'undefined' || window.__vvMusicPlayerUIClicks) return;
            window.__vvMusicPlayerUIClicks = true;
            document.addEventListener('click', function (e) {
                if (e.target.closest('#credits-transport-play')) {
                    if (!controller) return;
                    if (currentIndex < 0) playIndex(0);
                    else controller.togglePlay();
                    return;
                }
                if (e.target.closest('#credits-transport-prev')) {
                    if (!controller) return;
                    if (currentIndex < 0) playIndex(tracks.length - 1);
                    else playIndex(currentIndex - 1);
                    return;
                }
                if (e.target.closest('#credits-transport-next')) {
                    if (!controller) return;
                    if (currentIndex < 0) playIndex(0);
                    else playIndex(currentIndex + 1);
                    return;
                }
                var credBtn = e.target.closest('#credits-playlist .music-credit-play');
                if (credBtn) {
                    var li = credBtn.closest('li[data-track-index]');
                    if (!li || !controller) return;
                    var idx = parseInt(li.getAttribute('data-track-index'), 10);
                    if (Number.isNaN(idx)) return;
                    playIndex(idx, { toggleIfSame: true });
                }
            });
        }

        function attachController(embedController) {
            controller = embedController;
            embedController.addListener('playback_update', onPlaybackUpdate);
            embedController.addListener('playback_started', function () {
                syncRowButtons({ isPaused: false, position: 0, duration: 0 });
            });
            try {
                embedController.pause();
            } catch (_) { /* ignore */ }
            currentIndex = -1;
            resetDockUi();
        }

        function tryCreateEmbed() {
            if (embedCreated || !iframeApi) return;
            var anchor = document.getElementById('music-spotify-embed-anchor');
            if (!anchor) return;
            embedCreated = true;
            syncTracksFromDom();
            var first = tracks[0];
            iframeApi.createController(
                anchor,
                {
                    uri: spotifyUri(first.id),
                    width: 300,
                    height: 80,
                },
                function (embedController) {
                    attachController(embedController);
                }
            );
        }

        function onSpotifyReady(IFrameAPI) {
            iframeApi = IFrameAPI;
            tryCreateEmbed();
        }

        window.onSpotifyIframeApiReady = onSpotifyReady;

        function onNavigation() {
            syncTracksFromDom();
            if (controller) syncRowButtons(lastPlayback);
            tryCreateEmbed();
        }

        bindPlayerUIClicks();
        document.addEventListener('DOMContentLoaded', onNavigation);
        document.addEventListener('turbo:load', onNavigation);
    })();
}
