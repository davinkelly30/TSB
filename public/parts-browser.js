(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const displayName=p=>window.TSBProductUI.title(p);const normalize=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
const host=document.querySelector('.parts-categories');host.replaceChildren();host.className='parts-product-grid';
const controls=el('section');controls.className='parts-lookup';controls.id='shopParts';
const label=el('label','Search parts'),search=el('input');search.id='partsLookup';search.type='search';search.placeholder='Item name or part number';label.htmlFor=search.id;
const clear=el('button','Clear search');clear.type='button';const tabs=el('div');tabs.className='parts-category-tabs';tabs.setAttribute('aria-label','Part categories');const status=el('p');status.setAttribute('role','status');
controls.append(label,search,clear,tabs,status);host.before(controls);
const toast=el('div');toast.className='parts-toast';toast.setAttribute('role','status');document.body.append(toast);let toastTimer;
let items=[],selected='All',limit=12;
const more=el('button','Show more items');more.type='button';more.className='parts-more';host.after(more);more.onclick=()=>{limit+=12;render();};
function add(rows){try{window.TSBCart.addMany(rows);status.textContent='Added to your quote cart.';toast.textContent='Added to your quote cart';toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);}catch(e){status.textContent=e.message;}}
const cartItem=(p,q=1)=>({id:'part:'+p.id,name:displayName(p),partNumber:p.partNumber||'',quantity:q,note:'Confirm equipment compatibility and availability before ordering.'});
for(const category of ['All','Fuel Filters','Oil Filters','Other Filters','Parts']){const b=el('button',category);b.type='button';b.dataset.category=category;b.onclick=()=>{selected=category;limit=12;render();};tabs.append(b);}
const tiles=el('div');tiles.className='parts-visual-categories';controls.before(tiles);for(const [name,file,caption] of [['Fuel Filters','fuel-filters','Keep your fuel system protected'],['Oil Filters','oil-filters','Care for your engine'],['Other Filters','air-filters','Support clean airflow'],['Parts','v-belts','Find your maintenance essentials']]){const tile=el('button');tile.type='button';const img=el('img');img.src='/images/parts/'+file+'.webp';img.alt='';img.loading='lazy';tile.append(img,el('strong',name),el('span',caption));tile.onclick=()=>{selected=name;search.value='';limit=12;render();controls.scrollIntoView({behavior:'smooth'});};tiles.append(tile);}
function render(){
 host.replaceChildren();[...tabs.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===selected)));
 const terms=search.value.toLowerCase().trim().split(/\s+/).filter(Boolean),matches=items.filter(p=>(selected==='All'||selected===p.category)&&terms.every(t=>normalize(displayName(p)+' '+p.name+' '+p.partNumber).includes(normalize(t))));
 for(const p of matches.slice(0,limit)){const card=el('article');card.className='parts-product-card';
 const visual=el('div',p.category);visual.className='part-placeholder';card.append(visual,el('h3',displayName(p)),el('p','Part number: '+p.partNumber));
 const details=el('button','View details');details.type='button';details.className='part-kit-link';details.setAttribute('aria-label','View details for '+displayName(p)+' '+p.partNumber);details.onclick=()=>window.TSBProductUI.open(p,q=>window.TSBCart.addMany([cartItem(p,q)]));card.append(details);
 const quantity=el('input');quantity.type='number';quantity.min='1';quantity.max='999';quantity.value='1';quantity.setAttribute('aria-label','Quantity for '+p.name+' '+p.partNumber);
 const button=el('button','Add to quote cart');button.type='button';button.onclick=()=>{if(quantity.reportValidity())add([cartItem(p,Number(quantity.value))]);};const actions=el('div');actions.className='parts-match-actions';actions.append(quantity,button);card.append(actions);
 const kit=el('button','Find matching service kit');kit.type='button';kit.className='part-kit-link';kit.onclick=()=>{number.value=p.partNumber;finder.scrollIntoView({behavior:'smooth'});model.focus({preventScroll:true});};card.append(kit);host.append(card);}
 status.textContent=matches.length?'Choose an item or use the service-kit finder below.':'No matching items. Clear your search or choose another category.';more.hidden=matches.length<=limit;
}
const suggestions=el('div');suggestions.className='part-search-suggestions';suggestions.setAttribute('aria-label','Search suggestions');search.after(suggestions);function suggest(){suggestions.replaceChildren();if(!search.value.trim())return;const terms=search.value.trim().split(/\s+/).map(normalize).filter(Boolean);for(const p of items.filter(p=>terms.every(t=>normalize(displayName(p)+' '+p.partNumber).includes(t))).slice(0,5)){const choice=el('button',displayName(p)+' — '+p.partNumber);choice.type='button';choice.onclick=()=>{selected='All';search.value=p.partNumber;limit=12;render();suggestions.replaceChildren();search.focus();};suggestions.append(choice);}}search.addEventListener('input',suggest);search.addEventListener('keydown',e=>{if(e.key==='Escape')suggestions.replaceChildren();});
clear.onclick=()=>{suggestions.replaceChildren();search.value='';selected='All';limit=12;render();search.focus();};search.oninput=()=>{limit=12;render();};
const finder=el('section');finder.className='parts-kit-panel';finder.id='serviceKitFinder';finder.append(el('p','SERVICE KIT FINDER'),el('h2','Everything for your next service.'),el('p','Find the oil, fuel and air filters listed for your generator, together in one quote. Enter your equipment details to get started.'));
const form=el('form');const field=(caption,id,required=false)=>{const l=el('label',caption),i=el('input');l.htmlFor=id;i.id=id;i.required=required;i.maxLength=100;form.append(l,i);return i;};
const model=field('Generator model','kitModel',true),engine=field('Engine (optional)','kitEngine'),number=field('Part number (optional)','kitPartNumber');const find=el('button','Find service kit');find.type='submit';const result=el('div');result.setAttribute('aria-live','polite');form.append(find);finder.append(form,result);more.after(finder);
const openFinder=el('button','Find my service kit');openFinder.type='button';openFinder.onclick=()=>{finder.scrollIntoView({behavior:'smooth'});model.focus({preventScroll:true});};controls.append(openFinder);
form.onsubmit=async e=>{e.preventDefault();find.disabled=true;result.textContent='Looking up your kit…';try{const params=new URLSearchParams({model:model.value.trim(),engine:engine.value.trim(),partNumber:number.value.trim()});const r=await fetch('/api/service-kits?'+params);const data=await r.json();if(!r.ok)throw Error(data.error||'Lookup unavailable.');result.replaceChildren();if(!data.length)result.append(el('p','No listed kit matches those details. Check the model or contact our team.'));for(const kit of data){const card=el('article');card.className='parts-match';card.append(el('h3',kit.model+' — '+kit.engine));const list=el('ul');kit.parts.forEach(p=>list.append(el('li',p.name+' — '+p.partNumber)));card.append(list);const button=el('button','Add kit to cart');button.type='button';button.disabled=!kit.parts.length||kit.parts.some(p=>!p.quantity);button.onclick=()=>add(kit.parts.map(p=>({...cartItem(p,p.quantity),id:'kit:'+kit.id+':'+p.id,model:kit.model,engine:kit.engine})));card.append(button);result.append(card);}}catch(e){result.textContent=e.message;}finally{find.disabled=false;}};
fetch('/api/parts').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{items=data;render();}).catch(()=>{status.textContent='Parts are temporarily unavailable. Please refresh or contact us.';more.hidden=true;});
})();




