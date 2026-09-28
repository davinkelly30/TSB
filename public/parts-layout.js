document.querySelectorAll('[data-part]').forEach(button => button.addEventListener('click', () => {
  document.getElementById('part').value = button.dataset.part;
  document.getElementById('brand').value = 'Rehlko';
  document.getElementById('parts-request').scrollIntoView({behavior:'smooth'});
  document.getElementById('name').focus({preventScroll:true});
}));
document.getElementById('referenceRequest').addEventListener('click', () => {
  const manufacturer = document.getElementById('filterBrand').value.trim();
  const number = document.getElementById('filterNumber').value.trim();
  const type = document.getElementById('filterType').value;
  const status = document.getElementById('referenceStatus');
  if (!manufacturer || !number) { status.textContent = 'Enter the filter manufacturer and part number.'; return; }
  document.getElementById('part').value = [type || 'Filter', manufacturer, number].join(' / ');
  const message = document.getElementById('msg');
  const reference = `Cross-reference review requested: ${manufacturer} ${number} (${type || 'type to confirm'}). Please verify replacement compatibility.`;
  if (!message.value.includes(reference)) message.value = reference + '\n' + message.value;
  status.textContent = 'Details added below. Complete your contact and equipment information to submit.';
  document.getElementById('parts-request').scrollIntoView({behavior:'smooth'});
  document.getElementById('name').focus({preventScroll:true});
});
