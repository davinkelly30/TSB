(()=>{
 'use strict';const key='tsb-quote-cart-v1';let lines=[],storageOK=true;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const valid=r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&Number.isInteger(r.quantity)&&r.quantity>0&&r.quantity<=999;
 try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))lines=saved.filter(valid).slice(0,200);}catch{storageOK=false;}
 const section=el('section');section.className='tsb-cart';section.id='quoteCart';section.setAttribute('aria-label','Quote cart');
 const heading=el('h2','Your quote cart'),status=el('p');status.setAttribute('role','status');const list=el('div'),actions=el('div');
 const checkout=el('a','Request a quote for cart');checkout.href='/rfq.html?cart=1';checkout.className='cart-checkout';
 const clear=el('button','Clear cart');clear.type='button';clear.addEventListener('click',()=>{lines=[];save();render();});actions.append(checkout,clear);section.append(heading,status,list,actions);
 (document.querySelector('.container')||document.querySelector('.rfq-form-card')||document.querySelector('main')||document.body).append(section);
 const drawer=el('dialog');drawer.className='cart-drawer';drawer.setAttribute('aria-label','Your quote cart');const close=el('button','Close cart');close.type='button';close.onclick=()=>drawer.close();drawer.append(close,section);document.body.append(drawer);
 const jump=el('a','View quote cart');jump.onclick=e=>{e.preventDefault();drawer.showModal();};jump.href='#quoteCart';jump.className='cart-jump';document.body.append(jump);
 function save(){try{localStorage.setItem(key,JSON.stringify(lines));}catch{storageOK=false;}jump.textContent='View cart ('+lines.reduce((n,l)=>n+l.quantity,0)+')';}
 function render(){heading.textContent='Your quote cart ('+lines.reduce((n,l)=>n+l.quantity,0)+')';list.replaceChildren();status.textContent=storageOK?'Prices and availability will be confirmed in your quote.':'Browser storage is unavailable. Cart may not carry to the quote form.';
  if(!lines.length)list.append(el('p','Your cart is empty. Add individual parts, service kits, or catalog items.'));
  for(const row of lines){const card=el('div');card.className='cart-line';const desc=el('div');desc.append(el('strong',row.name),el('p',[row.partNumber,row.model,row.engine].filter(Boolean).join(' · ')));if(row.note)desc.append(el('p',row.note));const label=el('label','Quantity '),qty=el('input');qty.type='number';qty.min='1';qty.max='999';qty.step='1';qty.value=row.quantity;qty.setAttribute('aria-label','Quantity for '+row.name+' '+(row.partNumber||'')+' '+(row.engine||''));qty.addEventListener('input',()=>{const n=Number(qty.value);if(!Number.isInteger(n)||n<1||n>999){qty.value=row.quantity;return;}row.quantity=n;save();heading.textContent='Your quote cart ('+lines.reduce((sum,item)=>sum+item.quantity,0)+')';});label.append(qty);const remove=el('button','Remove');remove.type='button';remove.setAttribute('aria-label','Remove '+row.name+' '+(row.partNumber||'')+' '+(row.engine||''));remove.addEventListener('click',()=>{lines=lines.filter(l=>l.id!==row.id);save();render();});card.append(desc,label,remove);list.append(card);}
  checkout.hidden=!lines.length;clear.hidden=!lines.length;
 }
 function addMany(items){const copy=lines.map(l=>({...l}));for(const item of items){if(!valid(item))throw Error('Invalid cart item');const found=copy.find(l=>l.id===item.id);if(found){if(found.quantity+item.quantity>999)throw Error('Maximum quantity is 999 per line.');found.quantity+=item.quantity;}else{if(copy.length>=200)throw Error('Cart is full. Send this quote before adding more items.');copy.push({...item});}}lines=copy;save();render();status.textContent=storageOK?'Added to your quote cart.':'Added, but browser storage is unavailable.';}
 window.TSBCart={addMany,quoteText:()=>lines.map(l=>`${l.quantity} x ${l.name}${l.partNumber?' | Part '+l.partNumber:''}${l.model?' | Generator '+l.model:''}${l.engine?' | Engine '+l.engine:''}${l.note?' | '+l.note:''}`).join('\n'),getItems:()=>lines.map(l=>({...l}))};render();
 if(new URLSearchParams(location.search).get('cart')==='1'&&document.getElementById('rfqForm')){document.getElementById('requestType').value='Parts';if(!lines.length)status.textContent='Your cart is empty. Return to Catalog to add items.';document.getElementById('rfqForm').addEventListener('submit',e=>{if(!lines.length){e.preventDefault();e.stopImmediatePropagation();status.textContent='Add items to your cart before sending a cart quote.';section.scrollIntoView();}},true);}
})();


