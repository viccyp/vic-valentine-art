'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPages = path.join(root, 'src', 'pages');

// ── Env (shared) ────────────────────────────────────────────────

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const out = {};
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq === -1) continue;
        const key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        out[key] = val;
    }
    return out;
}

const fileEnv = parseEnvFile(path.join(root, '.env'));
const siteUrlRaw = process.env.SITE_URL || fileEnv.SITE_URL || '';
const siteUrl = siteUrlRaw.replace(/\/$/, '');

// ── 1. HTML templates + SEO ────────────────────────────────────

const INCLUDE_RE = /^(\s*)<!--\s*@include\s+([\w/._-]+)\s*-->\s*$/gm;

const partialCache = {};

function readPartial(name) {
    if (partialCache[name]) return partialCache[name];
    const filePath = path.join(root, 'src', name);
    if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠  Partial not found: ${name}`);
        return '';
    }
    const content = fs.readFileSync(filePath, 'utf8');
    partialCache[name] = content;
    return content;
}

function processIncludes(html) {
    let out = html;
    let prev;
    do {
        prev = out;
        out = out.replace(INCLUDE_RE, (_match, _indent, partialPath) => {
            const content = readPartial(partialPath);
            return content.trimEnd();
        });
    } while (out !== prev);
    return out;
}

const DEFAULT_SITE_DESCRIPTION =
    'Vic Valentine — London-based drummer, producer, bassist, filmmaker, editor, and web & software developer. Official portfolio.';

/** Keys: posix path relative to src/pages (e.g. visual/index.html) */
const DESCRIPTION_BY_REL = {
    'index.html':
        'Vic Valentine — official site. London drummer, producer, bassist, filmmaker, editor, and web & software developer.',
    'visual/index.html':
        'Visual work by Vic Valentine — film, photography, Hopkingdom, and ride films.',
    'audio/index.html': 'Music and audio by Vic Valentine — drums, production, and releases.',
    'audio/event/index.html': 'Audio event — Vic Valentine.',
    'code/index.html':
        'Code and software by Vic Valentine — web development and creative technology.',
    'mag/index.html': 'Mag — writing and magazine by Vic Valentine.',
    'blog/index.html': 'Mag — articles and writing by Vic Valentine.',
    'post/index.html': 'Article from Mag by Vic Valentine.',
    'velo/index.html': 'Cycling and velo work by Vic Valentine.',
};

function decodeBasicHtmlEntities(s) {
    return String(s)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function escapeAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function escapeXml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normalizeRel(relPath) {
    return relPath.split(path.sep).join('/');
}

function relPathToSitePath(relNorm) {
    if (relNorm === 'index.html') return '/';
    if (relNorm.endsWith('/index.html')) {
        return '/' + relNorm.slice(0, -'index.html'.length) + '/';
    }
    return '/' + relNorm.replace(/\.html$/i, '');
}

function isAdminRel(relNorm) {
    return relNorm.startsWith('admin/');
}

function pageTitle(html) {
    const m = html.match(/<title>([^<]*)<\/title>/i);
    return m ? m[1].trim() : 'Vic Valentine';
}

function pageDescription(html) {
    const m = html.match(
        /<meta\s+name=["']description["']\s+content=["']([^"']*)["']\s*\/?>/i
    );
    return m ? m[1].trim() : '';
}

function ensureMetaDescription(html, relNorm) {
    if (/<meta\s+[^>]*name\s*=\s*["']description["']/i.test(html)) return html;
    const desc = DESCRIPTION_BY_REL[relNorm];
    if (!desc) return html;
    return html.replace(
        /<\/title>\s*/i,
        '</title>\n    <meta name="description" content="' + escapeAttr(desc) + '">\n'
    );
}

function injectOpenGraph(html, siteBase, sitePath) {
    const title = decodeBasicHtmlEntities(pageTitle(html));
    let description = decodeBasicHtmlEntities(pageDescription(html));
    if (!description) description = DEFAULT_SITE_DESCRIPTION;

    const base = siteBase.replace(/\/$/, '');
    const canonical = base + (sitePath === '/' ? '/' : sitePath);
    const ogImage = base + '/public/vic.JPG';

    const lines = [
        `    <link rel="canonical" href="${escapeAttr(canonical)}">`,
        `    <meta property="og:site_name" content="Vic Valentine">`,
        `    <meta property="og:type" content="website">`,
        `    <meta property="og:url" content="${escapeAttr(canonical)}">`,
        `    <meta property="og:title" content="${escapeAttr(title)}">`,
        `    <meta property="og:description" content="${escapeAttr(description)}">`,
        `    <meta property="og:image" content="${escapeAttr(ogImage)}">`,
        `    <meta property="og:locale" content="en_GB">`,
        `    <meta name="twitter:card" content="summary_large_image">`,
        `    <meta name="twitter:title" content="${escapeAttr(title)}">`,
        `    <meta name="twitter:description" content="${escapeAttr(description)}">`,
        `    <meta name="twitter:image" content="${escapeAttr(ogImage)}">`,
    ];

    if (sitePath === '/') {
        const ld = {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'WebSite',
                    '@id': base + '/#website',
                    url: base + '/',
                    name: 'Vic Valentine',
                    description,
                    publisher: { '@id': base + '/#person' },
                    inLanguage: 'en-GB',
                },
                {
                    '@type': 'Person',
                    '@id': base + '/#person',
                    name: 'Vic Valentine',
                    url: base + '/',
                    jobTitle:
                        'Drummer, producer, bassist, filmmaker, editor, web & software developer',
                    address: {
                        '@type': 'PostalAddress',
                        addressLocality: 'London',
                        addressCountry: 'GB',
                    },
                },
            ],
        };
        lines.push(
            '    <script type="application/ld+json">' +
                JSON.stringify(ld).replace(/</g, '\\u003c') +
                '</script>'
        );
    }

    const block = lines.join('\n') + '\n';
    return html.replace(/<\/head>/i, block + '</head>');
}

function applySeoToPage(html, relNorm, siteBase) {
    if (isAdminRel(relNorm)) return html;
    let out = ensureMetaDescription(html, relNorm);
    if (siteBase) {
        out = injectOpenGraph(out, siteBase, relPathToSitePath(relNorm));
    }
    return out;
}

function writeRobotsTxt(siteBase) {
    let body = 'User-agent: *\nAllow: /\n\nDisallow: /admin/\n';
    if (siteBase) {
        body += '\nSitemap: ' + siteBase.replace(/\/$/, '') + '/sitemap.xml\n';
    }
    fs.writeFileSync(path.join(root, 'robots.txt'), body, 'utf8');
    console.log('Wrote robots.txt');
}

function writeSitemapXml(siteBase, paths) {
    const sitemapPath = path.join(root, 'sitemap.xml');
    if (!siteBase || !paths.length) {
        if (fs.existsSync(sitemapPath)) fs.unlinkSync(sitemapPath);
        return;
    }
    const base = siteBase.replace(/\/$/, '');
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = [...new Set(paths)]
        .sort()
        .map((p) => {
            const loc = p === '/' ? base + '/' : base + p;
            return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
        })
        .join('\n');
    const xml =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls +
        '\n</urlset>\n';
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log('Wrote sitemap.xml');
}

function buildPages() {
    if (!fs.existsSync(srcPages)) {
        console.warn('No src/pages/ directory — skipping HTML template build.');
        return { count: 0, publicSitePaths: [] };
    }

    let count = 0;
    const publicSitePaths = [];

    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name.endsWith('.html')) {
                const relPath = path.relative(srcPages, fullPath);
                const relNorm = normalizeRel(relPath);
                const destPath = path.join(root, relPath);
                const destDir = path.dirname(destPath);
                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

                const template = fs.readFileSync(fullPath, 'utf8');
                let output = processIncludes(template);
                output = applySeoToPage(output, relNorm, siteUrl);
                fs.writeFileSync(destPath, output, 'utf8');
                count++;

                if (!isAdminRel(relNorm)) {
                    publicSitePaths.push(relPathToSitePath(relNorm));
                }
            }
        }
    }

    walk(srcPages);
    writeRobotsTxt(siteUrl);
    writeSitemapXml(siteUrl, publicSitePaths);
    if (!siteUrl) {
        console.warn(
            'SITE_URL is not set — skipped Open Graph, canonical, JSON-LD, and sitemap.xml. ' +
                'Add SITE_URL to .env (see .env.example) and Vercel env for production SEO.'
        );
    }
    return { count, publicSitePaths };
}

const { count: pageCount } = buildPages();
if (pageCount > 0) {
    console.log(`Built ${pageCount} HTML page(s) from src/pages/.`);
}

// ── 2. Inject Supabase runtime config ───────────────────────────

const url = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || fileEnv.SUPABASE_ANON_KEY || '';
const bucket =
    process.env.SUPABASE_STORAGE_BUCKET ||
    fileEnv.SUPABASE_STORAGE_BUCKET ||
    'ART';

const outPath = path.join(root, 'static/js/supabase-runtime.js');

if (!url || !key) {
    console.warn(
        'Missing SUPABASE_URL or SUPABASE_ANON_KEY — writing empty supabase-runtime.js so the build can finish. ' +
            'For local dev, copy .env.example to .env. On Vercel, add those variables under Project → Settings → Environment Variables and redeploy.'
    );
    const stub =
        '/* Generated by npm run build — no Supabase env; blog/admin need Vercel env vars */\n' +
        'window.__SUPABASE_URL__="";\n' +
        'window.__SUPABASE_ANON_KEY__="";\n' +
        `window.__SUPABASE_STORAGE_BUCKET__=${JSON.stringify(bucket)};\n`;
    fs.writeFileSync(outPath, stub, 'utf8');
    console.log('Wrote', path.relative(root, outPath), '(stub)');
} else {
    const body =
        '/* Generated by npm run build — do not edit */\n' +
        `window.__SUPABASE_URL__=${JSON.stringify(url)};\n` +
        `window.__SUPABASE_ANON_KEY__=${JSON.stringify(key)};\n` +
        `window.__SUPABASE_STORAGE_BUCKET__=${JSON.stringify(bucket)};\n`;
    fs.writeFileSync(outPath, body, 'utf8');
    console.log('Wrote', path.relative(root, outPath));
}
