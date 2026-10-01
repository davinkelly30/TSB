'use strict';
function registerGeneratorsApi(app,load,authenticate){
 app.get('/api/generators',async(req,res)=>{try{res.json((await load()).filter(x=>x.offered&&!x.reviewRequired));}catch{res.status(503).json({error:'Generator catalog temporarily unavailable'});}});
 if(authenticate)app.get('/api/admin/generators',authenticate,async(req,res)=>{try{res.json(await load());}catch{res.status(503).json({error:'Generator catalog temporarily unavailable'});}});
}
function setupMongoGenerators(app,mongoose,authenticate){
 const schema=new mongoose.Schema({id:{type:String,unique:true,required:true},model:String,name:String,manufacturer:String,fuel:String,frequencyHz:Number,sourceUrl:String,sourceCheckedAt:String,offered:Boolean,reviewRequired:Boolean,reviewNote:String},{collection:'generators_offered'});
 const Model=mongoose.models.GeneratorOffered||mongoose.model('GeneratorOffered',schema);
 registerGeneratorsApi(app,()=>Model.find({}).select('-_id -__v').lean(),authenticate);
 return async()=>{const rows=require('./data/generators-offered.json');await Model.bulkWrite(rows.map(row=>({updateOne:{filter:{id:row.id},update:{$setOnInsert:row},upsert:true}})));};
}
module.exports={registerGeneratorsApi,setupMongoGenerators};
