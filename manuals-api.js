'use strict';
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function searchManuals(records,q){
 const term=normalize(q);
 return records.filter(r=>!term||normalize([r.title,...r.matches.flatMap(m=>[m.model,m.engine,...(m.currentParts||[]).map(p=>p.partNumber)]),...r.partMatches.map(p=>p.partNumber)].join(' ')).includes(term));
}
function registerManualsApi(app,authenticate,load){
 app.get('/api/admin/manuals',authenticate,async(req,res)=>{
  if(req.query.q!==undefined&&(typeof req.query.q!=='string'||req.query.q.length>100))return res.status(400).json({error:'Search must be at most 100 characters.'});
  try{res.set('Cache-Control','no-store');res.json(searchManuals(await load(),req.query.q||''));}catch{res.status(503).json({error:'Manual references are unavailable.'});}
 });
}
function setupMongoManuals(app,mongoose,authenticate){
 const schema=new mongoose.Schema({id:{type:String,unique:true,required:true},title:String,engine:String,type:String,language:String,url:String,source:String,checkedAt:String,matches:[mongoose.Schema.Types.Mixed],inspection:mongoose.Schema.Types.Mixed,partMatches:[mongoose.Schema.Types.Mixed]},{collection:'generator_manuals',strict:true});
 const Model=mongoose.models.GeneratorManual||mongoose.model('GeneratorManual',schema);
 registerManualsApi(app,authenticate,()=>Model.find({},{_id:0,__v:0}).lean());
 return async()=>{const {records}=require('./data/manual-references.json');await Model.bulkWrite(records.map(r=>({updateOne:{filter:{id:r.id},update:{$setOnInsert:r},upsert:true}})));};
}
module.exports={searchManuals,registerManualsApi,setupMongoManuals};

