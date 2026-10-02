'use strict';
const {validatePhotos,newReference}=require('./request-photos');
function rentalDetails(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Enter rental details.');
 const result={};for(const key of ['startDate','endDate','location','requirements','application','model','phone']){if(typeof input[key]!=='string'||input[key].length>2000)throw Error('Invalid rental details.');result[key]=input[key].trim();}
 for(const key of ['startDate','endDate']){if(!/^\d{4}-\d{2}-\d{2}$/.test(result[key])||!Number.isFinite(Date.parse(result[key]))||new Date(result[key]).toISOString().slice(0,10)!==result[key])throw Error('Enter valid rental dates.');}
 if(result.endDate<result.startDate||!result.location||!result.requirements)throw Error('Enter a location, equipment to power and a valid date range.');return result;
}
function setupRentals(app,mongoose,RFQ,authenticate){
 const Unit=mongoose.models.RentalUnit||mongoose.model('RentalUnit',new mongoose.Schema({assetTag:{type:String,unique:true,required:true},model:String,status:{type:String,enum:['Unconfirmed','Available','Reserved','Maintenance'],default:'Unconfirmed'},published:{type:Boolean,default:false},dimensions:String,connections:String,noise:String,notes:String,photoCount:{type:Number,default:0},photos:{type:[{name:String,mime:String,data:Buffer}],select:false},updatedBy:String},{timestamps:true,collection:'rental_units'}));
 const Policy=mongoose.models.RentalPolicy||mongoose.model('RentalPolicy',new mongoose.Schema({key:{type:String,unique:true},delivery:String,setup:String,fuel:String,collection:String,updatedBy:String},{timestamps:true,collection:'rental_policy'}));
 app.get('/api/rentals/fleet',async(req,res)=>{try{res.json(await Unit.find({published:true}).select('model status dimensions connections noise photoCount updatedAt').lean());}catch{res.status(503).json({error:'Fleet information unavailable'});}});
 app.get('/api/rentals/policy',async(req,res)=>{try{res.json(await Policy.findOne({key:'current'}).select('delivery setup fuel collection -_id').lean()||{});}catch{res.status(503).json({error:'Rental details unavailable'});}});
 app.get('/api/rentals/fleet/:id/photos/:index',async(req,res)=>{
  if(!mongoose.isValidObjectId(req.params.id)||! /^[0-2]$/.test(req.params.index))return res.sendStatus(404);
  try{const unit=await Unit.findOne({_id:req.params.id,published:true}).select('+photos');const photo=unit?.photos?.[+req.params.index];if(!photo)return res.sendStatus(404);res.set({'Content-Type':photo.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=60'}).send(photo.data);}catch{res.sendStatus(503);}
 });
 app.get('/api/admin/rental-units',authenticate,async(req,res)=>{try{res.json(await Unit.find().sort({assetTag:1}).lean());}catch{res.status(503).json({error:'Fleet unavailable'});}});
 async function saveUnit(req,res){
  const input=req.body||{},data={};
  for(const key of ['assetTag','model','dimensions','connections','noise','notes']){if(typeof input[key]!=='string'||input[key].length>1000)return res.status(400).json({error:'Invalid unit details'});data[key]=input[key].trim();}
  if(!data.assetTag||!data.model||!['Unconfirmed','Available','Reserved','Maintenance'].includes(input.status)||typeof input.published!=='boolean')return res.status(400).json({error:'Enter asset tag, model and a valid status.'});
  data.status=input.status;data.published=input.published;data.updatedBy=req.user.username;
  try{if(input.photos!==undefined){data.photos=validatePhotos(input.photos);data.photoCount=data.photos.length;} }catch(e){return res.status(400).json({error:e.message});}
  try{let unit;if(req.params.id){if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({error:'Invalid unit'});unit=await Unit.findByIdAndUpdate(req.params.id,{$set:data},{new:true,runValidators:true});}else{unit=await Unit.create(data);}if(!unit)return res.status(404).json({error:'Unit not found'});res.json({id:unit._id,message:'Unit saved'});}catch(e){res.status(e.code===11000?409:500).json({error:e.code===11000?'Asset tag already exists':'Unit could not be saved'});}
 }
 app.post('/api/admin/rental-units',authenticate,saveUnit);app.patch('/api/admin/rental-units/:id',authenticate,saveUnit);
 app.patch('/api/admin/rental-policy',authenticate,async(req,res)=>{
  const data={};for(const key of ['delivery','setup','fuel','collection']){if(typeof req.body?.[key]!=='string'||req.body[key].length>2000)return res.status(400).json({error:'Each policy field must be text, up to 2,000 characters.'});data[key]=req.body[key].trim();}data.updatedBy=req.user.username;
  try{await Policy.updateOne({key:'current'},{$set:data},{upsert:true});res.json({message:'Rental terms saved'});}catch{res.status(500).json({error:'Terms could not be saved'});}
 });
 app.get('/api/admin/rentals',authenticate,async(req,res)=>{try{res.json(await RFQ.find({$or:[{requestType:'rental'},{message:/^GENERATOR RENTAL REQUEST/}]}).sort({createdAt:-1}).limit(500));}catch{res.status(503).json({error:'Rental requests unavailable'});}});
 app.post('/api/admin/requests',authenticate,async(req,res)=>{
  const {name,email,message,company='',requestType='general'}=req.body||{};
  if(![name,email,message,company].every(x=>typeof x==='string')||!name.trim()||!email.trim()||!message.trim()||name.length>200||email.length>320||message.length>50000||company.length>300||!['general','rental'].includes(requestType))return res.status(400).json({error:'Enter valid customer and request details.'});
  let photos,rental;try{photos=validatePhotos(req.body.photos);if(requestType==='rental')rental=rentalDetails(req.body.rental);}catch(e){return res.status(400).json({error:e.message});}
  try{const record=await RFQ.create({name,email,message,company,requestType,rental,photos,photoCount:photos.length,reference:newReference(),createdBy:req.user.username});res.status(201).json({reference:record.reference});}catch{res.status(500).json({error:'Could not create request'});}
 });
 return {Unit,Policy};
}
module.exports={rentalDetails,setupRentals};
