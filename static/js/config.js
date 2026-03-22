const SUPABASE_URL = 'https://iliihnrgaexwlmegadns.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaWlobnJnYWV4d2xtZWdhZG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDA3MzMsImV4cCI6MjA4OTc3NjczM30.S640pduZ39G8a7UrovAeEbxmv7EUtftcfdqwqYWIgeA';
const STORAGE_BUCKET = 'BLOGS';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

function navPathKey(pathname) {
    if (!pathname) return '/';
    let p = pathname.replace(/\/index\.html$/i, '');
    p = p.replace(/\/+$/, '');
    return p === '' ? '/' : p;
}

function initActiveNav() {
    const path = location.pathname;
    const pathKey = navPathKey(path);
    document.querySelectorAll('.nav__links a').forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('mailto:')) return;
        if (navPathKey(href) === pathKey) {
            a.classList.add('active');
        }
    });
    if (path.startsWith('/admin')) {
        document.querySelectorAll('.nav__admin-icon').forEach(a => a.classList.add('active'));
    }
    const btn = document.querySelector('.nav__hamburger');
    btn?.addEventListener('click', () => {
        const links = document.querySelector('.nav__links');
        const open = links.classList.toggle('open');
        btn.setAttribute('aria-expanded', open);
    });
}

document.addEventListener('DOMContentLoaded', initActiveNav);
