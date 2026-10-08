import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogue = JSON.parse(fs.readFileSync(path.join(root,'data/shop-products.json'),'utf8'));
const shop = fs.readFileSync(path.join(root,'public/shop/index.html'),'utf8');
const homepage = fs.readFileSync(path.join(root,'public/index.html'),'utf8');

assert.equal(catalogue.etsyShopUrl,'https://www.etsy.com/shop/SapiverPrints');
assert.ok(shop.includes(catalogue.etsyShopUrl),'Wrong Etsy destination');
assert.ok(shop.includes('id="etsy"') && shop.includes('id="amazon"'),'Shop sections missing');
assert.ok(homepage.includes('href="/shop/"'),'Homepage Shop navigation missing');
assert.ok(!shop.includes('sapiverpress.etsy.com'),'Old puzzle-shop URL present');
assert.ok(!/Sudoku|Kropki|Commercial Classic Sudoku/i.test(shop),'Puzzle inventory appeared in shop');
const published = catalogue.items.filter(item => item.status === 'active');
for (const item of published) {
  assert.ok(item.image && item.imageAlt && item.url,'Incomplete product '+item.id);
  assert.ok(shop.includes(item.url),'Missing purchase link '+item.id);
  assert.ok(shop.includes(item.title.replaceAll('&','&amp;')),'Missing title '+item.id);
}
for (const draft of catalogue.items.filter(item => item.status !== 'active')) {
  assert.ok(!shop.includes('class="shop-item"') || !shop.includes('href="'+draft.url+'"'),'Draft listing appeared in Shop');
}
assert.equal((shop.match(/<article class="shop-item">/g) || []).length,published.length);
console.log('Shop page contract passed: '+published.length+' verified product(s), no drafts or old Etsy shop.');
