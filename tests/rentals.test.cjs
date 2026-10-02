const test=require('node:test'),assert=require('node:assert/strict'),express=require('express'),mongoose=require('mongoose'),fs=require('fs');const {setupRentals}=require('../rentals-api');const {can,permissionFor}=require('../access-control');
test('fleet publishing, photo access, staff creation and policy permissions',async()=>{
 const units=[];let policy={},created;
 const Unit={find:q=>({lean:async()=>units.map(({photos,...r})=>r),sort:()=>({lean:async()=>units.map(({photos,...r})=>r)}),select:()=>({lean:async()=>units.filter(x=>!q.published||x.published).map(({photos,notes,assetTag,updatedBy,...r})=>r)})}),findOne:q=>({select:async()=>units.find(x=>x._id===q._id&&x.published===q.published)}),create:async data=>{const row={_id:'000000000000000000000011',...data};units.push(row);return row;},findByIdAndUpdate:async(id,update)=>{const row=units.find(x=>x._id===id);if(row)Object.assign(row,update.$set);return row;}};
 const Policy={findOne:()=>({select:()=>({lean:async()=>policy})}),updateOne:async(q,update)=>{policy=update.$set;}};
 const RFQ={find:()=>({sort:()=>({limit:async()=>[]})}),create:async data=>{created=data;return data;}};
 const app=express();app.use(express.json({limit:'5mb'}));const auth=(req,res,next)=>{const role=req.headers['x-test-role'];req.user={role,username:'local-test'};if(!can(role,permissionFor(req)))return res.status(403).json({error:'Denied'});next();};
 setupRentals(app,{Schema:mongoose.Schema,models:{RentalUnit:Unit,RentalPolicy:Policy},isValidObjectId:mongoose.isValidObjectId},RFQ,auth);
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port;
 const request=(path,method='GET',role,body)=>fetch(url+path,{method,headers:{'Content-Type':'application/json',...(role?{'x-test-role':role}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{
 const data={assetTag:'LOCAL-TEST',model:'Test unit',dimensions:'',connections:'',noise:'',notes:'Private test note',status:'Unconfirmed',published:false,photos:[{data:fs.readFileSync(require('path').join(__dirname,'../public/images/projects/generator.jpg')).toString('base64')}]};
 assert.equal((await request('/api/admin/rental-units','POST','staff',data)).status,403);assert.equal((await request('/api/admin/rental-units','POST','manager',data)).status,200);
 assert.deepEqual(await(await request('/api/rentals/fleet')).json(),[]);assert.equal((await request('/api/rentals/fleet/000000000000000000000011/photos/0')).status,404);
 assert.equal((await request('/api/admin/rental-units/000000000000000000000011','PATCH','manager',{...data,published:true,status:'Available'})).status,200);
 const publicRows=await(await request('/api/rentals/fleet')).json();assert.equal(publicRows.length,1);assert(!JSON.stringify(publicRows).includes('Private test note'));assert(!JSON.stringify(publicRows).includes('photos'));
 const photo=await request('/api/rentals/fleet/000000000000000000000011/photos/0');assert.equal(photo.status,200);assert.match(photo.headers.get('content-type'),/image\/jpeg/);assert.equal(photo.headers.get('x-content-type-options'),'nosniff');
 assert.equal((await request('/api/admin/rental-policy','PATCH','viewer',{delivery:'',setup:'',fuel:'',collection:''})).status,403);
 assert.equal((await request('/api/admin/rental-policy','PATCH','manager',{delivery:'Confirmed test terms',setup:'',fuel:'',collection:''})).status,200);
 const req={name:'Test',email:'test@example.com',message:'Local test',requestType:'general',role:'owner',status:'Completed'};assert.equal((await request('/api/admin/requests','POST','staff',req)).status,201);assert.equal(created.role,undefined);assert.equal(created.status,undefined);assert.equal(created.createdBy,'local-test');
 assert.equal((await request('/api/admin/requests','POST','viewer',req)).status,403);
 assert.equal((await request('/api/admin/requests','POST','staff',{...req,requestType:'rental',rental:{}})).status,400);
 }finally{await new Promise(r=>server.close(r));}
});
