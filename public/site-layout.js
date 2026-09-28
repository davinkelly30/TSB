(()=>{const nav=document.querySelector('.tsb-main-nav');if(!nav)return;nav.classList.add('menu-ready');nav.id='tsbMainNav';const toggle=document.createElement('button');toggle.type='button';toggle.className='tsb-menu-toggle';toggle.textContent='Menu';toggle.setAttribute('aria-controls',nav.id);toggle.setAttribute('aria-expanded','false');nav.before(toggle);function close(){nav.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.textContent='Menu';}toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Close menu':'Menu';});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('is-open')){close();toggle.focus();}});nav.addEventListener('click',e=>{if(e.target.closest('a'))close();});})();

// Public service information and rental planning enhancements.
(()=>{
 const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const services=document.querySelector('main.tsb-services');
 if(services){
  services.replaceChildren(make('h2','Support for every stage of your power project'),make('p','Tell us about your equipment and requirements so our team can review the scope with you.'));
  const grid=make('div');grid.className='tsb-solution-grid';
  for(const [title,description,url] of [
   ['Installation planning','Review generator placement, connection requirements and electrical work for your project.','/site-assessment.html'],
   ['Maintenance','Include the equipment model, operating hours and service history with your maintenance inquiry.','/rfq.html'],
   ['Repairs & troubleshooting','Describe the symptoms, warning codes and equipment details so we can review your request.','/rfq.html'],
   ['Site assessments','Review your electrical load, location and project requirements before selecting equipment.','/site-assessment.html'],
   ['Generator rentals','Explore mobile generators and share your dates and delivery requirements.','/rental.html'],
   ['Parts & filters','Get help identifying replacement parts, filters and fluids for your equipment.','/parts.html']]){
   const card=make('a');card.href=url;card.append(make('h3',title),make('p',description),make('strong','Discuss your requirements →'));grid.append(card);
  }
  services.append(grid,make('h2','How it works'));
  const steps=make('ol');for(const step of ['Tell us about your equipment and the support you need.','Our team reviews the scope and follows up.','We confirm the quote and arrangements with you.'])steps.append(make('li',step));services.append(steps);
 }
 if(services||location.pathname==='/'||location.pathname==='/index.html'){
  const faq=make('section');faq.className='tsb-faq';faq.append(make('h2','Frequently asked questions'));
  for(const [q,a] of [
   ['What size generator do I need?','Share the equipment you need to power, voltage, phase and starting loads. Our team can review the requirements or arrange a site assessment.'],
   ['What information is needed for a rental?','Provide your dates, project location, application, expected operating hours and delivery or installation requirements.'],
   ['Does an inquiry reserve equipment?','An inquiry does not reserve equipment. Our team will confirm availability, rates and arrangements with you.'],
   ['How do I identify a replacement part?','Provide the equipment model, serial number and existing part number. Replacement and cross-reference requests require compatibility review.'],
   ['Can I request delivery or installation?','Include your location and support requirements. Our team will confirm the scope and arrangements.']]){const item=make('details');item.append(make('summary',q),make('p',a));faq.append(item);}
  (services||document.querySelector('main')).append(faq);
 }
 const market=document.querySelector('.rental-market-layout'),form=document.getElementById('rentalForm');
 if(market&&form){
  const planner=make('fieldset');planner.className='tsb-rental-planner';planner.append(make('legend','Plan your rental'));
  for(const id of ['startDate','endDate','location']){const input=document.getElementById(id);input.setAttribute('form','rentalForm');planner.append(input.closest('.form-group'));}
  planner.append(make('p','Choose your dates and location, then select equipment. Availability and rates are confirmed by our team.'));market.before(planner);
  const start=document.getElementById('startDate'),end=document.getElementById('endDate');
  const validate=()=>{end.setCustomValidity(start.value&&end.value&&end.value<start.value?'End date must be on or after the start date.':'');};start.addEventListener('input',validate);end.addEventListener('input',validate);form.addEventListener('reset',()=>end.setCustomValidity(''));
  const resources=make('details');resources.className='tsb-rental-resources';resources.append(make('summary','Generator specifications & brochure'),make('p','Prime ratings vary with electrical configuration. Confirm voltage, phase and suitability with our team before selecting equipment.'));
  const link=make('a','View Rehlko mobile generator brochure (PDF)');link.href='https://resources.rehlko.com/industrial/pdf/Mobile_Full_Line_Brochure.pdf';link.target='_blank';link.rel='noopener noreferrer';resources.append(link);market.after(resources);
 }
})();
