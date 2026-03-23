const SUPABASE_URL =
    typeof window !== 'undefined' && window.__SUPABASE_URL__
        ? window.__SUPABASE_URL__
        : '';
const SUPABASE_ANON_KEY =
    typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY__
        ? window.__SUPABASE_ANON_KEY__
        : '';
const STORAGE_BUCKET =
    typeof window !== 'undefined' && window.__SUPABASE_STORAGE_BUCKET__
        ? window.__SUPABASE_STORAGE_BUCKET__
        : 'ART';

const db =
    typeof window !== 'undefined' &&
    window.supabase &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        : null;

/** Singleton if `db` was null at parse time (e.g. library/env race on slow networks). */
let __vvDbLazy = null;

/**
 * Prefer global `db`; otherwise build a client when globals exist.
 * Use this from page scripts instead of `db` when timing may beat config.js.
 */
function getDb() {
    if (db) return db;
    if (__vvDbLazy) return __vvDbLazy;
    if (
        typeof window !== 'undefined' &&
        window.supabase &&
        window.__SUPABASE_URL__ &&
        window.__SUPABASE_ANON_KEY__
    ) {
        try {
            __vvDbLazy = window.supabase.createClient(
                window.__SUPABASE_URL__,
                window.__SUPABASE_ANON_KEY__
            );
            return __vvDbLazy;
        } catch (_) {
            return null;
        }
    }
    return null;
}

/**
 * Wait until Supabase UMD + env globals are ready (avoids false empty client on fast Turbo navigations).
 */
async function waitForSupabaseClient(maxMs = 3200) {
    if (!window.__SUPABASE_URL__ || !window.__SUPABASE_ANON_KEY__) {
        return getDb();
    }
    const t0 = Date.now();
    let c = getDb();
    if (c) return c;
    while (Date.now() - t0 < maxMs) {
        await new Promise((r) => {
            setTimeout(r, 45);
        });
        c = getDb();
        if (c) return c;
    }
    return getDb();
}

function storageUrl(path) {
    return path ? `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}` : '';
}

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function slugify(text) {
    return (text || '').toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function formatDate(iso) {
    if (!iso) return '';
    try {
        const dt = new Date(iso);
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return iso.slice(0, 10); }
}

function plainExcerpt(bodyJson, maxLen = 160) {
    let blocks;
    try { blocks = JSON.parse(bodyJson); } catch { return ''; }
    if (!Array.isArray(blocks)) return '';
    const parts = blocks
        .filter(b => ['paragraph', 'heading', 'image_text'].includes(b.type))
        .map(b => b.text || '');
    let t = parts.join(' ').replace(/[`#>*_\[\]()]+/g, '').replace(/\s+/g, ' ').trim();
    if (t.length > maxLen) {
        const cut = t.slice(0, maxLen - 1).replace(/\s\S*$/, '');
        return (cut || t.slice(0, maxLen)) + '\u2026';
    }
    return t;
}

function readTime(post) {
    let blocks;
    try { blocks = JSON.parse(post.body); } catch { return 1; }
    if (!Array.isArray(blocks)) return 1;
    const words = blocks
        .filter(b => ['paragraph', 'heading', 'image_text'].includes(b.type))
        .map(b => b.text || '').join(' ').split(/\s+/).length;
    const images = blocks.reduce((n, b) => {
        if (b.type === 'single_image' || b.type === 'image_text') return n + 1;
        if (b.type === 'triple_image') return n + (b.images || []).length;
        return n;
    }, 0);
    return Math.max(1, Math.round(words / 200 + images * 0.25));
}

function renderBlocksToHtml(blocks) {
    return blocks.map(b => {
        switch (b.type) {
            case 'heading':
                return `<h2 class="post-block__heading">${escHtml(b.text)}</h2>`;
            case 'paragraph':
                return `<div class="post-block__paragraph"><p>${escHtml(b.text).replace(/\n/g, '<br>')}</p></div>`;
            case 'single_image':
                if (!b.filename) return '';
                return `<figure class="post-block__figure"><img src="${storageUrl(b.filename)}" alt="${escHtml(b.caption || '')}" data-lightbox>${b.caption ? `<figcaption>${escHtml(b.caption)}</figcaption>` : ''}</figure>`;
            case 'image_text': {
                let h = '<div class="post-block__image-text">';
                if (b.filename) h += `<figure><img src="${storageUrl(b.filename)}" alt="" data-lightbox></figure>`;
                if (b.text) h += `<div class="post-block__image-text-body"><p>${escHtml(b.text).replace(/\n/g, '<br>')}</p></div>`;
                return h + '</div>';
            }
            case 'triple_image': {
                let h = '<div class="post-block__triple">';
                (b.images || []).forEach(img => {
                    if (img.filename) {
                        h += `<figure><img src="${storageUrl(img.filename)}" alt="${escHtml(img.caption || '')}" data-lightbox>${img.caption ? `<figcaption>${escHtml(img.caption)}</figcaption>` : ''}</figure>`;
                    }
                });
                return h + '</div>';
            }
            default: return '';
        }
    }).join('\n');
}

function extractFirstImage(blocks) {
    for (const b of blocks) {
        if ((b.type === 'single_image' || b.type === 'image_text') && b.filename) return b.filename;
        if (b.type === 'triple_image') {
            for (const img of (b.images || [])) { if (img.filename) return img.filename; }
        }
    }
    return '';
}

function showFlash(message, type = 'success') {
    let container = document.querySelector('.flash-messages');
    if (!container) {
        container = document.createElement('div');
        container.className = 'flash-messages';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `flash flash--${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
        el.style.transition = 'opacity 0.3s';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

/**
 * In-page confirmation (replaces window.confirm). Resolves true if confirmed.
 * @param {{ title: string, message: string, confirmText?: string, cancelText?: string, danger?: boolean }} opts
 */
function confirmDialog(opts) {
    const {
        title,
        message,
        confirmText = 'OK',
        cancelText = 'Cancel',
        danger = false,
    } = opts;
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'confirm-dialog-title');

        const backdrop = document.createElement('div');
        backdrop.className = 'confirm-dialog__backdrop';
        backdrop.setAttribute('data-confirm-dismiss', '');

        const panel = document.createElement('div');
        panel.className = 'confirm-dialog__panel';

        const h2 = document.createElement('h2');
        h2.id = 'confirm-dialog-title';
        h2.className = 'confirm-dialog__title';
        h2.textContent = title;

        const p = document.createElement('p');
        p.className = 'confirm-dialog__message';
        p.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'confirm-dialog__actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn--outline btn--small';
        cancelBtn.setAttribute('data-confirm-dismiss', '');
        cancelBtn.textContent = cancelText;

        const okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.className = `btn btn--small ${danger ? 'btn--danger' : 'btn--primary'}`;
        okBtn.setAttribute('data-confirm-ok', '');
        okBtn.textContent = confirmText;

        actions.append(cancelBtn, okBtn);
        panel.append(h2, p, actions);
        overlay.append(backdrop, panel);

        const done = (value) => {
            document.removeEventListener('keydown', onKey);
            overlay.remove();
            resolve(value);
        };

        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                done(false);
            }
        };

        overlay.addEventListener('click', (e) => {
            if (e.target.closest('[data-confirm-dismiss]')) done(false);
            if (e.target.closest('[data-confirm-ok]')) done(true);
        });

        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);
        requestAnimationFrame(() => okBtn.focus());
    });
}

function navPathKey(pathname) {
    if (!pathname) return '/';
    let p = pathname.replace(/\/index\.html$/i, '');
    p = p.replace(/\/+$/, '');
    return p === '' ? '/' : p;
}

function initActiveNav() {
    const path = location.pathname;
    const pathKey = navPathKey(path);
    document.querySelectorAll('.nav__links a').forEach((a) => {
        a.classList.remove('active');
        const href = a.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('mailto:')) return;
        const hrefKey = navPathKey(href);
        if (
            hrefKey === pathKey ||
            (hrefKey === '/audio' && pathKey.startsWith('/audio')) ||
            (hrefKey === '/mag' && pathKey.startsWith('/post'))
        ) {
            a.classList.add('active');
        }
    });
    document.querySelectorAll('.nav__admin-icon').forEach((a) => a.classList.remove('active'));
    if (path.startsWith('/admin')) {
        document.querySelectorAll('.nav__admin-icon').forEach((a) => a.classList.add('active'));
    }
}

if (typeof window !== 'undefined' && !window.__vvNavHamburgerDelegated) {
    window.__vvNavHamburgerDelegated = true;
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav__hamburger');
        if (!btn) return;
        const nav = btn.closest('.nav');
        const links = nav?.querySelector('.nav__links');
        if (!links) return;
        const open = links.classList.toggle('open');
        btn.setAttribute('aria-expanded', open);
    });
}

document.addEventListener('DOMContentLoaded', initActiveNav);
document.addEventListener('turbo:load', initActiveNav);
