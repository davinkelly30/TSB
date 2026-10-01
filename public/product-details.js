(()=>{
 'use strict';
 const names={'Oil filter':'Engine Oil Filter','Fuel filter':'Fuel Filter','Air filter':'Engine Air Filter','Fan belt':'Fan Drive Belt','Alternator belt':'Alternator Drive Belt','Cover gasket':'Engine Cover Gasket'};
 const descriptions={'Oil Filters':'Replacement oil filter. Our team will confirm the specification and equipment fitment before quoting.','Fuel Filters':'Replacement fuel filter. Include your equipment details so our team can confirm the correct selection.','Other Filters':'Replacement filter for your equipment. Our team will confirm the application before quoting.','Parts':'Replacement maintenance component. Provide your equipment details to confirm the application.'};
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const dialog=el('dialog');dialog.className='part-quick-view';dialog.setAttribute('aria-labelledby','quickPartTitle');document.body.append(dialog);
 const title=p=>names[p.name]||p.name.replace(/\b\w/g,c=>c.toUpperCase());
 function open(p,add){
  dialog.replaceChildren();const close=el('button','Close details');close.type='button';close.className='quick-close';close.onclick=()=>dialog.close();
  const heading=el('h2',title(p));heading.id='quickPartTitle';const badge=el('p',p.category);badge.className='quick-category';
  const photo=el('div','Product photo coming soon');photo.className='quick-photo-placeholder';
  const qtyLabel=el('label','Quantity'),qty=el('input');qty.id='quickPartQuantity';qtyLabel.htmlFor=qty.id;qty.type='number';qty.min='1';qty.max='999';qty.step='1';qty.value='1';
  const action=el('button','Add to quote cart');action.type='button';const feedback=el('p');feedback.setAttribute('role','status');action.onclick=()=>{if(qty.reportValidity()){try{add(Number(qty.value));feedback.textContent='Added to your quote cart.';}catch(e){feedback.textContent=e.message;}}};
  dialog.append(close,badge,heading,el('p','Part number: '+p.partNumber),photo,el('p',descriptions[p.category]||descriptions.Parts),qtyLabel,qty,action,feedback,el('small','Price and availability confirmed with your quote.'));dialog.showModal();
 }
 window.TSBProductUI={title,open};
})();
