// Customer-facing shop enhancement. Product text is written with textContent, never innerHTML.
const mount = document.getElementById('etsy-live');
if (mount) {
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const validProduct = (item) => {
    try {
      const url = new URL(item.url);
      const image = new URL(item.image);
      return url.protocol === 'https:' && url.hostname === 'www.etsy.com' &&
        /^\/listing\/[1-9]\d*$/.test(url.pathname) &&
        image.protocol === 'https:' && image.hostname.endsWith('.etsystatic.com') &&
        typeof item.title === 'string' && item.title.length > 0;
    } catch { return false; }
  };
  const showStatus = message => mount.replaceChildren(element('p','shop-note',message));
  try {
    const response = await fetch('/api/etsy-prints', { cache: 'no-store' });
    if (!response.ok) throw Error('Etsy catalogue unavailable');
    const data = await response.json();
    if (data.shop !== 'SapiverPrints' || !Array.isArray(data.items)) throw Error('Wrong or incomplete shop');
    const listings = data.items.filter(validProduct);
    if (!listings.length) {
      showStatus('No active posters are currently available. Visit our Etsy shop for the latest products.');
    } else {
      const heading = element('h3', '', 'Available prints');
      const grid = element('div', 'shop-grid');
      for (const item of listings) {
        const article = element('article','shop-item');
        const photo = element('a','shop-photo');
        photo.href = item.url;
        photo.target = '_blank';
        photo.rel = 'noopener noreferrer';
        const image = element('img');
        image.src = item.image;
        image.alt = item.imageAlt || item.title;
        image.loading = 'lazy';
        image.decoding = 'async';
        photo.append(image);
        const info = element('div','shop-info');
        info.append(element('span','','Sapiver Prints'),element('h3','',item.title));
        if (item.description) info.append(element('p','',item.description));
        const buy = element('a','button','View on Etsy ↗');
        buy.href = item.url;
        buy.target = '_blank';
        buy.rel = 'noopener noreferrer';
        info.append(buy);
        article.append(photo, info);
        grid.append(article);
      }
      mount.replaceChildren(heading, grid);
    }
  } catch {
    showStatus('Live product photographs are temporarily unavailable here. You can still browse and order directly from our Etsy shop.');
  }
}
