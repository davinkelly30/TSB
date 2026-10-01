(()=>{'use strict';
const target=document.querySelector('#rfqForm,#rentalForm') || document.getElementById('partsSubmit')?.parentElement;
if(!target)return;
const box=document.createElement('div');box.className='request-photos';
box.innerHTML='<label for="requestPhotos">Equipment photos (optional)</label><p>Attach up to 3 JPEG or PNG photos of the label, old part or fault. Maximum 10 MB per original. Photos are resized before sending.</p><input id="requestPhotos" type="file" accept="image/jpeg,image/png" multiple><p id="photoFeedback" role="status"></p>';
const submit=target.querySelector('button[type="submit"],#partsSubmit');target.insertBefore(box,submit || null);
const input=box.querySelector('input'),feedback=box.querySelector('[role="status"]');
input.addEventListener('change',()=>{feedback.textContent=input.files.length+' photo(s) selected';});
window.TSBRequestPhotos=async()=>{
 const files=Array.from(input.files);if(files.length>3)throw Error('Choose up to three photos.');
 return Promise.all(files.map(async file=>{
  if(!['image/jpeg','image/png'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose JPEG or PNG photos under 10 MB each.');
  const bitmap=await createImageBitmap(file);try{
   const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/jpeg',.78).split(',')[1];if(data.length>1398104)throw Error('Photo is too detailed. Please choose a smaller image.');return {data};
  }finally{bitmap.close();}
 }));
};
target.addEventListener('reset',()=>feedback.textContent='');
})();
