(()=>{'use strict';let permissions=[];const allowed=p=>permissions.includes('*')||permissions.includes(p);
function apply(){
 document.querySelectorAll('[data-permission]').forEach(el=>{el.hidden=!allowed(el.dataset.permission);});
 const writes=/^(createInvoice|createQuoteFromAssessment|createQuoteFromRFQ|deleteAssessment|deleteQuote|deleteRFQ|editQuote|emailInvoiceDocument|emailQuote|openNewQuote|recordInvoicePayment|saveQuote|shareQuote|setQuoteSource|addQuoteLine)\(/;
 const products=/^(deleteProduct|editProduct|openProductForm|saveProduct)\(/;
 document.querySelectorAll('[onclick],[onchange]').forEach(el=>{const action=(el.getAttribute('onclick')||el.getAttribute('onchange')||'').trim();const permission=products.test(action)?'products.manage':writes.test(action)||/^update.*Status\(/.test(action)?'records.manage':null;if(permission){if(!allowed(permission)){el.dataset.accessDisabled='true';el.disabled=true;el.title='Your access level does not allow this action.';}else if(el.dataset.accessDisabled){el.disabled=false;delete el.dataset.accessDisabled;el.title='';}}});
}
async function refresh(){const token=localStorage.getItem('tsb_admin_token');const r=await fetch('/api/me',{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error('Please sign in to the admin portal.');const user=await r.json();permissions=user.permissions;document.querySelectorAll('[data-account]').forEach(el=>el.textContent=user.username+' · '+user.role);apply();return user;}
window.TSBAccess={refresh,allowed,apply};new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
