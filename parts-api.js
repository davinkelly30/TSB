'use strict';
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const name=p=>p.name.replace(/ [12]$/,'');
const category=p=>p.name.startsWith('Oil filter')?'Oil Filters':p.name.startsWith('Fuel filter')?'Fuel Filters':p.category==='Filters'?'Other Filters':'Parts';
function publicParts(variants){
 const items=new Map();
 for(const v of variants)for(const p of v.parts){const id=p.partNumber+':'+name(p);if(!items.has(id))items.set(id,{id,name:name(p),partNumber:p.partNumber,category:category(p)});}
 return [...items.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.partNumber.localeCompare(b.partNumber));
}
function kitsFor(variants,query){
 const model=normalize(query.model),engine=normalize(query.engine),number=normalize(query.partNumber);
 return variants.filter(v=>normalize(v.model)===model&&(!engine||normalize(v.engine)===engine)&&(!number||v.parts.some(p=>normalize(p.partNumber)===number))).map(v=>({id:v.id,model:v.model,engine:v.engine,parts:v.parts.filter(p=>p.category==='Filters').map(p=>({id:p.partNumber+':'+name(p),name:name(p),partNumber:p.partNumber,quantity:p.quantity}))}));
}
function registerPartsApi(app,load){
 app.get('/api/parts',async(req,res)=>{try{res.json(publicParts(await load()));}catch{res.status(503).json({error:'Parts lookup temporarily unavailable. Please retry.'});}});
 app.get('/api/service-kits',async(req,res)=>{
  if(typeof req.query.model!=='string'||!normalize(req.query.model)||['model','engine','partNumber'].some(k=>req.query[k]!==undefined&&(typeof req.query[k]!=='string'||req.query[k].length>100)))return res.status(400).json({error:'Enter a generator model (maximum 100 characters).'});
  try{res.json(kitsFor(await load(),req.query));}catch{res.status(503).json({error:'Service-kit lookup temporarily unavailable. Please retry.'});}
 });
}
function setupMongoParts(app,mongoose){
 const schema=new mongoose.Schema({id:{type:String,unique:true,required:true},model:String,engine:String,parts:[{id:String,name:String,partNumber:String,category:String,quantity:Number}]},{collection:'generator_parts',strict:true});
 const Model=mongoose.models.GeneratorParts||mongoose.model('GeneratorParts',schema);
 registerPartsApi(app,()=>Model.find({}).lean());
 return async()=>{const {variants}=require('./data/generator-parts.json');await Model.bulkWrite(variants.map(v=>({updateOne:{filter:{id:v.id},update:{$setOnInsert:{id:v.id,model:v.model,engine:v.engine,parts:v.parts.map(({id,name,partNumber,category,quantity})=>({id,name,partNumber,category,quantity}))}},upsert:true}})));};
}
module.exports={publicParts,kitsFor,registerPartsApi,setupMongoParts};
