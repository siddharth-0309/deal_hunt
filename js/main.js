const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSQFo8fdvrPmVArNY09QtOBwAQhcQ1v5RRHb12vkAt1saThZowfhnhiNsTivnDeGa2fdsePoq4JNtz/pub?output=csv';
let allProducts = [];

document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) toggle.addEventListener('click', () => nav.classList.toggle('open'));

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.closest('.filters').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterProducts(chip.textContent.trim().toLowerCase());
    });
  });

  const inp = document.getElementById('search-input');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') searchProducts(); });

  loadProducts();
});

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSV(lines[i]);
    if (vals.length < 2) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx]||'').trim().replace(/^"|"$/g,''); });
    if (obj.name) rows.push(obj);
  }
  return rows;
}

function splitCSV(line) {
  const res = []; let cur = '', inQ = false;
  for (let c of line) {
    if (c === '"') inQ = !inQ;
    else if (c === ',' && !inQ) { res.push(cur); cur = ''; }
    else cur += c;
  }
  res.push(cur);
  return res;
}

function getBest(p) {
  const prices = { amazon:+p.price_amazon||0, flipkart:+p.price_flipkart||0, myntra:+p.price_myntra||0, ajio:+p.price_ajio||0 };
  let best = null, bestPrice = Infinity;
  for (const [pl, price] of Object.entries(prices)) {
    if (price > 0 && price < bestPrice) { best = pl; bestPrice = price; }
  }
  return { platform: best, price: bestPrice };
}

function lbl(k) { return {amazon:'Amazon',flipkart:'Flipkart',myntra:'Myntra',ajio:'Ajio'}[k]||k; }

function stars(r) {
  r = parseFloat(r)||0;
  let s = '★'.repeat(Math.floor(r));
  if (r%1>=0.5) s += '☆';
  return s + '☆'.repeat(Math.max(0,5-Math.ceil(r)));
}

function badgeCls(b) {
  b = (b||'').toLowerCase();
  if (b.includes('trend')) return 'badge-trending';
  if (b.includes('top')||b.includes('rated')) return 'badge-rated';
  if (b.includes('hot')) return 'badge-hot';
  return 'badge-default';
}

function getPage() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes('fashion')) return 'fashion';
  if (path.includes('deals')) return 'deals';
  return 'shoes';
}

function buildCard(p) {
  const best = getBest(p);
  const platforms = ['amazon','flipkart','myntra','ajio'];
  const imgHTML = (p.image_url||'').startsWith('http')
    ? `<img src="${p.image_url}" alt="${p.name}" style="width:68px;height:68px;object-fit:cover;border-radius:10px;">`
    : `<span style="font-size:30px;">${p.emoji||'👟'}</span>`;

  const pricesHTML = platforms.map(pl => {
    const price = parseFloat(p[`price_${pl}`])||0;
    const link = p[`link_${pl}`]||'';
    const isW = best.platform === pl;
    const del = p[`del_${pl}`]||'3-day delivery';
    return `<div class="price-cell${isW?' winner':''}"${link?` onclick="window.open('${link}','_blank')" style="cursor:pointer;"`:''}>
      <div class="platform-name">${lbl(pl)}</div>
      <div class="price-amount${isW?' best':''}">${price?'₹'+price.toLocaleString('en-IN'):'—'}</div>
      ${isW?'<div class="lowest-badge">LOWEST</div>':''}
      <div class="delivery-time">${del}</div>
    </div>`;
  }).join('');

  const buyLink = best.platform ? (p[`link_${best.platform}`]||'#') : '#';
  const buyText = best.platform
    ? `Best deal on ${lbl(best.platform)} — ₹${best.price.toLocaleString('en-IN')}`
    : 'View Deal';

  return `<article class="product-card">
    <div class="card-top">
      <div class="product-thumb">${imgHTML}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">${p.meta||''}</div>
        <div class="rating-row">
          <span class="stars">${stars(p.rating)}</span>
          <span class="review-count">${p.rating} (${parseInt(p.reviews||0).toLocaleString('en-IN')} reviews)</span>
          ${p.badge?`<span class="badge ${badgeCls(p.badge)}">${p.badge}</span>`:''}
        </div>
      </div>
    </div>
    <div class="price-grid">${pricesHTML}</div>
    <a href="${buyLink}" target="_blank" rel="nofollow sponsored" class="buy-btn">
      <span>${buyText}</span><span class="arrow">→</span>
    </a>
  </article>`;
}

function buildDealCard(p) {
  const best = getBest(p);
  if (!best.platform) return '';
  const allP = ['amazon','flipkart','myntra','ajio'].map(pl => parseFloat(p[`price_${pl}`])||0);
  const maxP = Math.max(...allP);
  const disc = maxP > best.price ? Math.round((1-best.price/maxP)*100) : 0;
  const buyLink = p[`link_${best.platform}`]||'#';
  const imgHTML = (p.image_url||'').startsWith('http')
    ? `<img src="${p.image_url}" alt="${p.name}" style="width:100%;height:120px;object-fit:cover;">`
    : `<div style="font-size:52px;height:120px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#E6F1FB,#B5D4F4);">${p.emoji||'🛍️'}</div>`;
  return `<div class="deal-card">
    <div class="deal-thumb">${imgHTML}</div>
    <div class="deal-body">
      <div class="deal-name">${p.name}</div>
      <div class="deal-meta">${p.meta||''}</div>
      <div class="deal-prices">
        <span class="deal-price-now">₹${best.price.toLocaleString('en-IN')}</span>
        ${maxP>best.price?`<span class="deal-price-old">₹${maxP.toLocaleString('en-IN')}</span>`:''}
        ${disc>0?`<span class="deal-discount">${disc}% OFF</span>`:''}
      </div>
      <div class="deal-platform">${lbl(best.platform)} · ${p[`del_${best.platform}`]||'3-day delivery'}</div>
    </div>
    <a href="${buyLink}" target="_blank" rel="nofollow sponsored" class="deal-btn">Buy on ${lbl(best.platform)} →</a>
  </div>`;
}

function filterProducts(filter) {
  const container = document.getElementById('products-container');
  const countEl = document.getElementById('product-count');
  if (!container) return;
  const page = getPage();
  let filtered = allProducts.filter(p => (p.page||'shoes') === page);
  if (filter && filter !== 'all') {
    if (filter === 'under ₹1,000') filtered = filtered.filter(p => getBest(p).price < 1000);
    else filtered = filtered.filter(p =>
      (p.category||'').toLowerCase().includes(filter) ||
      (p.name||'').toLowerCase().includes(filter)
    );
  }
  if (countEl) countEl.textContent = `${filtered.length} product${filtered.length!==1?'s':''} found`;
  if (!filtered.length) {
    container.innerHTML = `<div style="text-align:center;padding:50px 20px;">
      <div style="font-size:44px;margin-bottom:12px;">📦</div>
      <div style="font-size:15px;font-weight:600;color:#042C53;margin-bottom:6px;">Koi product nahi mila</div>
      <div style="font-size:12px;color:#185FA5;">Google Sheet mein products add karo</div>
    </div>`;
    return;
  }
  container.innerHTML = page === 'deals'
    ? `<div class="deals-grid">${filtered.map(buildDealCard).join('')}</div>`
    : filtered.map(buildCard).join('');
}

function searchProducts() {
  const q = (document.getElementById('search-input')?.value||'').trim().toLowerCase();
  if (!q) return filterProducts('all');
  const container = document.getElementById('products-container');
  const countEl = document.getElementById('product-count');
  const filtered = allProducts.filter(p =>
    (p.name||'').toLowerCase().includes(q) ||
    (p.meta||'').toLowerCase().includes(q) ||
    (p.category||'').toLowerCase().includes(q)
  );
  if (countEl) countEl.textContent = `${filtered.length} results for "${q}"`;
  container.innerHTML = filtered.length
    ? filtered.map(buildCard).join('')
    : `<div style="text-align:center;padding:40px;color:#185FA5;font-size:13px;">Koi product nahi mila "${q}" ke liye</div>`;
}

function loadProducts() {
  const container = document.getElementById('products-container');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:50px;color:#185FA5;font-size:13px;font-weight:500;">⏳ Products load ho rahe hain...</div>`;
  fetch(SHEET_URL)
    .then(r => { if (!r.ok) throw new Error(); return r.text(); })
    .then(csv => {
      allProducts = parseCSV(csv);
      filterProducts('all');
      // Deals section on homepage
      const dealsContainer = document.getElementById('deals-container');
      if (dealsContainer) {
        const deals = allProducts.filter(p => p.page === 'deals');
        const dealsCount = document.getElementById('deals-count');
        if (dealsCount && deals.length) dealsCount.textContent = `🔥 More Deals (${deals.length})`;
        dealsContainer.innerHTML = deals.length
          ? `<div class="deals-grid">${deals.map(buildDealCard).join('')}</div>`
          : '';
      }
    })
    .catch(() => {
      container.innerHTML = `<div style="text-align:center;padding:50px 20px;">
        <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
        <div style="font-size:14px;font-weight:600;color:#042C53;margin-bottom:6px;">Sheet load nahi hui!</div>
        <div style="font-size:12px;color:#185FA5;">Google Sheet publish karo: File → Share → Publish to web → CSV</div>
      </div>`;
    });
}
