import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/shop-products.json'), 'utf8'));
const esc = (x) => String(x ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const accepted = (p) => {
  if (p?.status !== 'active' || !['etsy','kdp'].includes(p.platform) || !p.url || !p.image || !p.title || !p.imageAlt) return false;
  try {
    const url = new URL(p.url), image = new URL(p.image);
    const hosts = p.platform === 'etsy' ? ['www.etsy.com','etsy.com'] : ['amzn.eu','www.amazon.co.uk','amazon.co.uk','www.amazon.com','amazon.com'];
    return url.protocol === 'https:' && hosts.includes(url.hostname) && image.protocol === 'https:';
  } catch { return false; }
};
if (data.etsyShopUrl !== 'https://www.etsy.com/shop/SapiverPrints') throw Error('Wrong Etsy shop URL');
const products = data.items.filter(accepted);
const etsy = products.filter(p => p.platform === 'etsy');
const kdp = products.filter(p => p.platform === 'kdp');
const card = p => '<article class="shop-item"><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer" class="shop-photo"><img src="'+esc(p.image)+'" alt="'+esc(p.imageAlt)+'" loading="lazy" decoding="async"></a><div class="shop-info"><span>'+esc(p.category)+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.description || '')+'</p>'+(p.imageCaption ? '<small>'+esc(p.imageCaption)+'</small>' : '')+'<a class="button" href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">View on '+(p.platform === 'etsy' ? 'Etsy' : 'Amazon')+' ↗</a></div></article>';
const grid = list => '<div class="shop-grid">'+list.map(card).join('\n')+'</div>';
const styles = '.shop-categories{display:flex;gap:1rem;flex-wrap:wrap}.shop-categories a{font-weight:750}.shop-section{background:#fbf8f1;border:1px solid #d9cfbb;border-radius:22px;padding:clamp(20px,3vw,32px);margin:1.5rem 0}.shop-section h2{margin-top:.2rem}.shop-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,255px),1fr));gap:1rem}.content .shop-item{padding:0;margin:0;border-radius:17px;overflow:hidden;background:#fff}.shop-photo{display:block;aspect-ratio:1 / 1;background:#efe9dc;overflow:hidden}.shop-photo img{width:100%;height:100%;object-fit:cover;display:block}.shop-info{padding:1.25rem}.shop-info span{font-size:.78rem;color:#24574c;font-weight:800}.shop-info h3{margin:.35rem 0}.shop-info p{margin:.5rem 0}.shop-info small{display:block;color:#66716b;margin-bottom:1rem}.shop-info .button{margin-top:.5rem}.shop-store{background:#edf0e7;border-radius:18px;padding:1.2rem;display:flex;gap:1rem;align-items:center;justify-content:space-between;flex-wrap:wrap}.shop-store p{margin:.3rem 0}.shop-note{max-width:65ch;color:#586c61}';
const html = [
'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>Shop educational posters and children’s books | Sapiver Press</title><meta name="description" content="Explore Sapiver Prints posters on Etsy and Sapiver Press children’s books on Amazon.">',
'<link rel="canonical" href="https://suite.sapiverpress.co.uk/shop/"><link rel="stylesheet" href="/styles.css"><style>'+styles+'</style></head><body>',
'<header class="site-header"><a class="brand" href="/">Sapiver Press</a><p>Human-led. AI-empowered.</p><nav aria-label="Site links"><a href="/">Home</a><a href="/shop/" aria-current="page">Shop</a><a href="/daily-brief/">Daily Brief</a><a href="/podcast/">Podcast</a><a href="/learn/">Sapiver Learn</a><a href="/parents/">AI Inquisitive Parents</a><a href="/puzzles/">Sapiver Puzzles</a><a href="/resources/">Resources</a></nav></header>',
'<main class="content"><section class="hero"><p class="eyebrow">Sapiver Press shop</p><h1>Educational prints and children’s books</h1><p>Browse our Sapiver Prints collections and story-led books. Orders are placed directly with Etsy or Amazon.</p><div class="shop-categories"><a class="button" href="#etsy">Etsy posters</a><a class="button button-secondary" href="#amazon">Amazon books</a></div></section>',
'<section class="shop-section" id="etsy"><p class="eyebrow">Sapiver Prints</p><h2>Posters &amp; prints · Etsy</h2><div class="shop-store"><div><strong>Shop Sapiver Prints</strong><p>Find current designs, sizes and prices in our Etsy shop.</p></div><a class="button" href="'+esc(data.etsyShopUrl)+'" target="_blank" rel="noopener noreferrer">Visit Etsy shop ↗</a></div>',
 etsy.length ? '<h3>Available individual prints</h3>'+grid(etsy) : '<p class="shop-note">Individual poster links and photographs will be added here as they are confirmed. Browse our Etsy shop for the latest available prints.</p>',
'</section><section class="shop-section" id="amazon"><p class="eyebrow">Sapiver Press books</p><h2>Children’s books · Amazon KDP</h2><p>Our books are sold through Amazon.</p>',
 grid(kdp),
'</section><section class="shop-section"><h2>Ordering and delivery</h2><p>Follow a product link to complete your purchase on Etsy or Amazon. The retailer displays the final price, delivery details and current availability.</p></section></main>',
'<footer class="site-footer"><p><strong>Sapiver Press</strong> · Human-led. AI-empowered.</p><p><a href="/">Home</a> · <a href="/shop/">Shop</a> · <a href="/resources/">Resources</a></p></footer></body></html>'
].join('\n');
const output = path.join(root,'public','shop','index.html');
fs.mkdirSync(path.dirname(output), {recursive:true});
fs.writeFileSync(output,html,'utf8');
console.log('Built Shop: '+etsy.length+' verified Etsy product(s), '+kdp.length+' Amazon book(s).');
