'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),express=require('express'),mongoose=require('mongoose'),jwt=require('jsonwebtoken'),bcrypt=require('bcrypt');
const {createAccess,can,permissionFor}=require('../access-control');const {rentalDetails}=require('../rentals-api');
test('roles explicitly grant permissions and reject inherited object properties',()=>{assert(can('owner','users.manage'));assert(can('manager','products.manage'));assert(!can('manager','users.manage'));assert(can('staff','requests.create'));assert(!can('staff','products.manage'));assert(!can('viewer','requests.create'));assert(!can('toString','records.read'));for(const path of ['/products','/quotes/123','/rfq/123/status','/invoices/123/payments'])assert(!can('staff',permissionFor({path,method:'POST'})));});
test('rental dates reject impossible dates and reversed ranges',()=>{const base={startDate:'2026-10-02',endDate:'2026-10-04',location:'Test',requirements:'Lights',application:'Event',model:'',phone:''};assert.equal(rentalDetails(base).location,'Test');for(const change of [{startDate:'2026-02-30'},{endDate:'2026-10-01'},{requirements:''},{location:{}},{startDate:'next week'}])assert.throws(()=>rentalDetails({...base,...change}));});
test('HTTP authorization, account lifecycle and role changes',async()=>{
 const records=new Map();const ids={owner:'000000000000000000000001',manager:'000000000000000000000002',staff:'000000000000000000000003',viewer:'000000000000000000000004'};
 for(const [role,id]of Object.entries(ids))records.set(id,{_id:id,username:role,role,active:true,version:0,passwordHash:await bcrypt.hash('test-password-long',4)});
 const Account={findById:async id=>records.get(id),findOne:query=>({select:async()=>Array.from(records.values()).find(r=>r.username===query.username)}),find:()=>({sort:async()=>Array.from(records.values())}),create:async input=>{if(Array.from(records.values()).some(r=>r.username===input.username))throw Object.assign(Error(),{code:11000});const id='000000000000000000000099';const row={_id:id,active:true,version:0,...input};records.set(id,row);return row;},findByIdAndUpdate:async(id,update)=>{const row=records.get(id);if(!row)return null;Object.assign(row,update.$set);row.version+=update.$inc.version;return row;}};
 const env={JWT_SECRET:'local-test-secret-not-production',ADMIN_USER:'original-owner',ADMIN_PASSWORD_HASH:await bcrypt.hash('original-test-password',4)};
 const access=createAccess({mongoose:{Schema:mongoose.Schema,models:{StaffAccount:Account},isValidObjectId:mongoose.isValidObjectId},jwt,bcrypt,env});const app=express();app.use(express.json());access.register(app);app.post('/login',access.login);
 for(const path of ['/products','/quotes','/api/admin/rental-units','/api/admin/requests'])app.post(path,access.authenticate,(req,res)=>res.json({ok:true}));app.get('/rfq',access.authenticate,(req,res)=>res.json([]));app.post('/rfq',access.optionalRequest,(req,res)=>res.json({ok:true}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port;
 const tokens=Object.fromEntries(Object.entries(ids).map(([r,id])=>[r,jwt.sign({sub:id,version:0},env.JWT_SECRET,{expiresIn:'1h'})]));
 const request=async(path,method='GET',token,body)=>{const r=await fetch(url+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
 try{
  assert.equal((await request('/rfq')).status,401);
  for(const [role,token]of Object.entries(tokens)){
   assert.equal((await request('/rfq','GET',token)).status,200);
   for(const path of ['/products','/quotes','/api/admin/rental-units'])assert.equal((await request(path,'POST',token,{})).status,['owner','manager'].includes(role)?200:403,role+' '+path);
   assert.equal((await request('/api/admin/requests','POST',token,{})).status,role==='viewer'?403:200);
   assert.equal((await request('/api/admin/users','GET',token)).status,role==='owner'?200:403);assert.equal((await request('/API/ADMIN/USERS','GET',token)).status,role==='owner'?200:403);
  }
  assert.equal((await request('/rfq','POST',undefined,{})).status,200);assert.equal((await request('/rfq','POST',tokens.viewer,{})).status,403);
  assert.equal((await request('/api/me','GET',jwt.sign({role:'owner',username:'attacker'},env.JWT_SECRET))).status,401);
  const legacy=jwt.sign({username:env.ADMIN_USER,role:'admin'},env.JWT_SECRET);assert.equal((await request('/api/me','GET',legacy)).body.role,'owner');
  const login=await request('/login','POST',undefined,{username:'staff',password:'test-password-long'});assert.equal(login.status,200);assert.equal(login.body.user.role,'staff');assert(!JSON.stringify(login.body).includes('passwordHash'));
  const create=await request('/api/admin/users','POST',tokens.owner,{username:'new-staff',role:'staff',password:'long-new-password'});assert.equal(create.status,201);assert(!JSON.stringify(create.body).includes('passwordHash'));
  assert.equal((await request('/api/admin/users','POST',tokens.staff,{username:'evil',role:'owner',password:'long-new-password'})).status,403);
  assert.equal((await request('/api/admin/users/'+ids.manager,'PATCH',tokens.owner,{role:'viewer'})).status,200);assert.equal((await request('/products','POST',tokens.manager,{})).status,401);
  assert.equal((await request('/api/admin/users/'+ids.staff,'PATCH',tokens.owner,{active:false})).status,200);assert.equal((await request('/rfq','GET',tokens.staff)).status,401);
  assert.equal((await request('/api/admin/users/'+ids.owner,'PATCH',tokens.owner,{active:false})).status,400);
  assert.equal((await request('/api/admin/users','POST',tokens.owner,{username:'badrole',role:'toString',password:'long-new-password'})).status,400);
  assert.equal((await request('/api/admin/users/'+ids.viewer,'PATCH',tokens.owner,{password:'reset-long-password'})).status,200);assert.equal((await request('/api/me','GET',tokens.viewer)).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
