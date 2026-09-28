let products=[];
const grid=document.getElementById('catalogGrid'), search=document.getElementById('search'), category=document.getElementById('categoryFilter');
function safeUrl(value){try{const u=new URL(value,location.origin);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}}
function element(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el}
function renderProducts(){
 grid.replaceChildren();const term=search.value.trim().toLowerCase();
 const filtered=products.filter(p=>(!category.value||(p.category||'General')===category.value)&&[p.name,p.category,p.description,p.partNumber,p.manufacturer].some(v=>String(v||'').toLowerCase().includes(term)));
 for(const p of filtered){const card=element('article');card.className='card';const image=safeUrl(p.image||p.imageUrl);if(image){const img=element('img');img.src=image;img.alt=p.name||'Product';img.loading='lazy';img.addEventListener('error',()=>img.remove());card.append(img)}
 card.append(element('h3',p.name||'Product'),element('p',p.category||'General'),element('p',p.description));if(p.size)card.append(element('p','Pack sizes: '+p.size));if(p.partNumber)card.append(element('p','Part number: '+p.partNumber));
 const quote=element('a','Request quote →');quote.className='quote-link';quote.href=p.imported?'/rfq.html?catalogItem='+encodeURIComponent(p.id):'/rfq.html?product='+encodeURIComponent(p._id);card.append(quote);grid.append(card)}
 if(!filtered.length)grid.append(element('p','No matching products. Try another search or category.'));
}
async function loadProducts(){const results=await Promise.allSettled(['/products','/rehlko-catalog.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('Load failed');const rows=await r.json();if(!Array.isArray(rows))throw Error('Invalid catalog');return rows}));
 products=results.flatMap((r,index)=>r.status==='fulfilled'?r.value.map(p=>({...p,imported:index===1})):[]);
 document.getElementById('catalogNotice').textContent=results.some(r=>r.status==='rejected')?'Some catalog listings could not load. Please retry later.':products.length+' listings';
 for(const value of [...new Set(products.map(p=>p.category||'General'))].sort()){const option=element('option',value);option.value=value;category.append(option)}renderProducts();
}
search.value=new URLSearchParams(location.search).get('search')||'';
search.addEventListener('input',renderProducts);category.addEventListener('change',renderProducts);loadProducts();


