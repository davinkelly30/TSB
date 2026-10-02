'use strict';
const ROLES={owner:['*'],manager:['records.read','records.manage','requests.create','products.manage','rentals.manage','photos.upload'],staff:['records.read','requests.create','photos.upload'],viewer:['records.read']};
function can(role,permission){return Object.hasOwn(ROLES,role)&&(ROLES[role].includes('*')||ROLES[role].includes(permission));}
function permissionFor(req){
 const path=req.path.toLowerCase();
 if(path.startsWith('/api/admin/users'))return 'users.manage';
 if(req.method==='GET'||req.method==='HEAD')return 'records.read';
 if(path.startsWith('/api/admin/rental-'))return 'rentals.manage';
 if(path==='/api/admin/requests'||path==='/rfq'||path==='/site-assessments')return 'requests.create';
 if(/^\/products(?:\/|$)/.test(path))return 'products.manage';
 if(/^\/(quotes|invoices|rfq|site-assessments)(\/|$)/.test(path))return 'records.manage';
 return 'owner.only';
}
function createAccess({mongoose,jwt,bcrypt,env=process.env}){
 const schema=new mongoose.Schema({username:{type:String,unique:true,required:true},passwordHash:{type:String,required:true,select:false},role:{type:String,enum:Object.keys(ROLES),required:true},active:{type:Boolean,default:true},version:{type:Number,default:0}},{timestamps:true,collection:'staff_accounts'});
 const Account=mongoose.models.StaffAccount||mongoose.model('StaffAccount',schema);
 const safe=u=>({id:String(u._id),username:u.username,role:u.role,active:u.active});
 async function identity(req){
  const header=req.headers.authorization||'';if(!/^Bearer \S+$/.test(header))throw Error('session');
  const claims=jwt.verify(header.slice(7),env.JWT_SECRET,{algorithms:['HS256']});
  if(claims.principal==='environment-owner'||(!claims.sub&&claims.role==='admin')){
   if(!env.ADMIN_USER||claims.username!==env.ADMIN_USER)throw Error('session');
   return {id:'environment-owner',username:env.ADMIN_USER,role:'owner'};
  }
  if(!claims.sub||!mongoose.isValidObjectId(claims.sub))throw Error('session');
  const user=await Account.findById(claims.sub);
  if(!user||!user.active||claims.version!==user.version)throw Error('session');
  return safe(user);
 }
 async function authenticate(req,res,next){
  try{req.user=await identity(req);}catch{return res.status(401).json({error:'Please sign in again.'});}
  if(!can(req.user.role,permissionFor(req)))return res.status(403).json({error:'Your access level does not allow this action.'});
  res.set('Cache-Control','no-store');return next();
 }
 function optionalRequest(req,res,next){if(req.headers.authorization)return authenticate(req,res,next);return next();}
 const attempts=new Map();
 function limited(req){const key=req.ip+':'+String(req.body?.username||'').toLowerCase().slice(0,100);const now=Date.now();for(const [k,v]of attempts)if(now-v.start>900000)attempts.delete(k);const item=attempts.get(key)||{start:now,count:0};item.count++;attempts.set(key,item);return item.count>30;}
 async function login(req,res){
  if(limited(req))return res.status(429).json({error:'Too many sign-in attempts. Try again later.'});
  const {username,password}=req.body||{};
  if(typeof username!=='string'||typeof password!=='string'||username.length>100||password.length>128)return res.status(400).json({error:'Enter a username and password.'});
  try{
   let claims,user;
   if(username===env.ADMIN_USER&&env.ADMIN_PASSWORD_HASH){
    if(!await bcrypt.compare(password,env.ADMIN_PASSWORD_HASH))return res.status(401).json({error:'Invalid credentials'});
    claims={principal:'environment-owner',username};user={id:'environment-owner',username,role:'owner'};
   }else{
    const account=await Account.findOne({username:username.toLowerCase().trim()}).select('+passwordHash');
    if(!account||!account.active||!await bcrypt.compare(password,account.passwordHash))return res.status(401).json({error:'Invalid credentials'});
    claims={sub:String(account._id),version:account.version};user=safe(account);
   }
   res.set('Cache-Control','no-store');res.json({token:jwt.sign(claims,env.JWT_SECRET,{algorithm:'HS256',expiresIn:'8h'}),user,permissions:ROLES[user.role]});
  }catch{res.status(503).json({error:'Sign-in unavailable. Please retry.'});}
 }
 function validPassword(p){return typeof p==='string'&&p.length>=12&&Buffer.byteLength(p,'utf8')<=72;}
 function register(app){
  app.get('/api/me',authenticate,(req,res)=>res.json({...req.user,permissions:ROLES[req.user.role]}));
  app.get('/api/admin/users',authenticate,async(req,res)=>{try{res.json({accounts:(await Account.find().sort({username:1})).map(safe),roles:ROLES,owner:env.ADMIN_USER});}catch{res.status(503).json({error:'Accounts unavailable'});}});
  app.post('/api/admin/users',authenticate,async(req,res)=>{
   const {username,password,role}=req.body||{};
   if(typeof username!=='string'||! /^[a-z0-9._-]{3,60}$/.test(username)||username===String(env.ADMIN_USER).toLowerCase()||!Object.hasOwn(ROLES,role)||!validPassword(password))return res.status(400).json({error:'Use a unique lowercase username (3–60 letters, numbers, dots or dashes), a valid role and a password of at least 12 characters (maximum 72 UTF-8 bytes).'});
   try{const account=await Account.create({username,role,passwordHash:await bcrypt.hash(password,12)});res.status(201).json(safe(account));}catch(e){res.status(e.code===11000?409:500).json({error:e.code===11000?'Username already exists':'Could not create account'});}
  });
  app.patch('/api/admin/users/:id',authenticate,async(req,res)=>{
   const {role,active,password}=req.body||{};
   if(!mongoose.isValidObjectId(req.params.id)||req.params.id===req.user.id)return res.status(400).json({error:'You cannot change your own account here.'});
   if((role!==undefined&&!Object.hasOwn(ROLES,role))||(active!==undefined&&typeof active!=='boolean')||(password!==undefined&&!validPassword(password)))return res.status(400).json({error:'Invalid account changes or password.'});
   const update={};if(role!==undefined)update.role=role;if(active!==undefined)update.active=active;
   try{if(password!==undefined)update.passwordHash=await bcrypt.hash(password,12);if(!Object.keys(update).length)return res.status(400).json({error:'No changes supplied'});const u=await Account.findByIdAndUpdate(req.params.id,{$set:update,$inc:{version:1}},{new:true,runValidators:true});if(!u)return res.status(404).json({error:'Account not found'});res.json(safe(u));}catch{res.status(500).json({error:'Could not update account'});}
  });
 }
 return {authenticate,optionalRequest,login,register,Account};
}
module.exports={createAccess,ROLES,can,permissionFor};
