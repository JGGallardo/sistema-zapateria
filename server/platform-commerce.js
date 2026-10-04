import {randomUUID} from 'node:crypto';
import {z} from 'zod';
const interval=z.enum(['month','year']),money=z.number().int().min(0).max(1000000000);
const plan=z.object({code:z.string().trim().min(1).max(40),name:z.string().trim().min(1).max(120),description:z.string().max(1000).default(''),price:money,currency:z.enum(['ARS']),billing_interval:interval,trial_days:z.number().int().min(0).max(365),active:z.coerce.boolean()});
const coupon=z.object({code:z.string().trim().regex(/^[A-Za-z0-9_-]{1,40}$/).transform(x=>x.toUpperCase()),description:z.string().max(1000).default(''),kind:z.enum(['percent','fixed']),value:z.number().int().positive().max(1000000000),currency:z.literal('ARS'),starts_at:z.string().datetime(),ends_at:z.string().datetime().nullable(),max_uses:z.number().int().positive(),max_per_tenant:z.number().int().positive(),benefit_months:z.number().int().min(1).max(36),active:z.coerce.boolean(),plan_ids:z.array(z.string().uuid()).max(100)}).refine(x=>x.kind!=='percent'||x.value<=10000).refine(x=>!x.ends_at||x.ends_at>x.starts_at);
const now=()=>new Date().toISOString();
const months=(date,count)=>{const d=new Date(date),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+count);const end=new Date(d);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);d.setUTCDate(Math.min(day,end.getUTCDate()));return d.toISOString()};
export function installPlatformCommerce(app,db){
 db.exec(`CREATE TABLE IF NOT EXISTS control_plans(id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,data TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS control_coupons(id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,data TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS control_subscriptions(store_id TEXT PRIMARY KEY,plan_id TEXT NOT NULL,contracted_price INTEGER NOT NULL,billing_interval TEXT NOT NULL,currency TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS control_redemptions(id TEXT PRIMARY KEY,store_id TEXT NOT NULL,coupon_id TEXT NOT NULL,data TEXT NOT NULL,ends_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS control_payments(provider_id TEXT PRIMARY KEY,store_id TEXT NOT NULL,amount INTEGER NOT NULL,period_end TEXT NOT NULL,created_at TEXT NOT NULL);`);
 const audit=(req,action,id)=>db.prepare('INSERT INTO control_audit(actor,action,tenant_id,created_at) VALUES(?,?,?,?)').run(req.controlActor,action,id,now());
 const transact=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}};
 const list=table=>db.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC`).all().map(r=>({...JSON.parse(r.data),id:r.id,created_at:r.created_at}));
 const tenant=id=>{const r=db.prepare('SELECT t.data,m.* FROM tenants t JOIN tenant_meta m ON m.tenant_id=t.id WHERE t.id=?').get(id);if(!r)throw Error('Empresa no encontrada.');return {...r,name:JSON.parse(r.data).name}};
 const subscription=id=>{const t=tenant(id),s=db.prepare('SELECT * FROM control_subscriptions WHERE store_id=?').get(id);return {tenant:{id,name:t.name,owner_email:t.owner_email},subscription:s?{...s,id,plan_name:list('control_plans').find(p=>p.id===s.plan_id)?.name,current_period_end:t.expires_at,status:t.status}:null,benefits:db.prepare('SELECT * FROM control_redemptions WHERE store_id=? AND ends_at>?').all(id,now()).map(r=>JSON.parse(r.data))}};
 app.get('/api/control/dashboard',(req,res)=>{const rows=db.prepare('SELECT * FROM tenant_meta').all(),plans=list('control_plans');res.json({total:rows.length,counts:['trial','active','suspended','cancelled'].map(status=>({status,count:rows.filter(t=>t.status===status).length})),plans:plans.map(p=>({...p,count:db.prepare('SELECT COUNT(*) n FROM control_subscriptions WHERE plan_id=?').get(p.id).n})),recent:rows.sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,10).map(t=>({...t,id:t.tenant_id,name:tenant(t.tenant_id).name}))})});
 app.get('/api/control/audit',(req,res)=>res.json(db.prepare('SELECT id,actor actor_id,action,tenant_id entity_id,created_at FROM control_audit ORDER BY id DESC LIMIT 100').all().map(x=>({...x,actor_type:'platform',entity_type:'paso'}))));
 for(const [kind,table,schema] of [['plans','control_plans',plan],['coupons','control_coupons',coupon]]){
  app.get('/api/control/'+kind,(req,res)=>res.json(list(table)));
  const save=(req,res)=>{const p=schema.parse(req.body),id=req.params.id||randomUUID();if(req.params.id&&!db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(id))return res.status(404).json({error:'Registro no encontrado.'});if(kind==='coupons'&&p.plan_ids.some(id=>!db.prepare('SELECT id FROM control_plans WHERE id=?').get(id)))return res.status(400).json({error:'El plan seleccionado no pertenece a Paso.'});
   transact(()=>{db.prepare(`INSERT INTO ${table}(id,code,data,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,data=excluded.data`).run(id,p.code,JSON.stringify(p),now());audit(req,kind+'.saved',id)});res.json({id});};
  app.post('/api/control/'+kind,save);app.put('/api/control/'+kind+'/:id',save);
 }
 app.get('/api/control/tenants/:id/subscription',(req,res)=>res.json(subscription(req.params.id)));
 app.put('/api/control/tenants/:id/subscription',(req,res)=>{
  const t=tenant(req.params.id),p=list('control_plans').find(x=>x.id===req.body.plan_id&&x.active);if(!p)return res.status(400).json({error:'Seleccioná un plan activo de Paso.'});
  transact(()=>{const old=db.prepare('SELECT * FROM control_subscriptions WHERE store_id=?').get(t.tenant_id);db.prepare('INSERT INTO control_subscriptions VALUES(?,?,?,?,?,?) ON CONFLICT(store_id) DO UPDATE SET plan_id=excluded.plan_id,contracted_price=excluded.contracted_price,billing_interval=excluded.billing_interval,currency=excluded.currency,updated_at=excluded.updated_at').run(t.tenant_id,p.id,old?.plan_id===p.id?old.contracted_price:p.price,p.billing_interval,p.currency,now());audit(req,'subscription.saved',t.tenant_id)});res.json({ok:true});
 });
 app.post('/api/control/tenants/:id/coupon',(req,res)=>{
  const s=subscription(req.params.id),c=list('control_coupons').find(x=>x.code===String(req.body.code||'').trim().toUpperCase());
  if(!s.subscription||!c||!c.active||c.starts_at>now()||c.ends_at&&c.ends_at<=now()||c.plan_ids.length&&!c.plan_ids.includes(s.subscription.plan_id))return res.status(400).json({error:'Cupón no disponible para esta suscripción.'});
  const uses=db.prepare('SELECT store_id FROM control_redemptions WHERE coupon_id=?').all(c.id);
  if(uses.length>=c.max_uses||uses.filter(r=>r.store_id===req.params.id).length>=c.max_per_tenant||s.benefits.length)return res.status(409).json({error:'Se alcanzó el límite de uso o ya hay un beneficio vigente.'});
  transact(()=>{const benefit={...c,starts_at:now(),ends_at:months(now(),c.benefit_months)};db.prepare('INSERT INTO control_redemptions VALUES(?,?,?,?,?)').run(randomUUID(),req.params.id,c.id,JSON.stringify(benefit),benefit.ends_at);audit(req,'coupon.applied',req.params.id)});res.json({ok:true});
 });
 // Called only by the signed bridge after the payment provider has been verified.
 app.post('/api/control/tenants/:id/payment',(req,res)=>{
  const p=z.object({payment_id:z.string().min(1).max(160),amount:money,contracted_price:money,currency:z.literal('ARS'),billing_interval:interval,plan_id:z.string().uuid(),paid_at:z.string().datetime()}).parse(req.body);
  const s=subscription(req.params.id);if(!s.subscription||s.subscription.plan_id!==p.plan_id||s.subscription.contracted_price!==p.contracted_price||s.subscription.billing_interval!==p.billing_interval||p.amount!==p.contracted_price)return res.status(409).json({error:'El pago no coincide con la suscripción vigente. Requiere revisión.'});
  const result=transact(()=>{const old=db.prepare('SELECT * FROM control_payments WHERE provider_id=?').get(p.payment_id);if(old){if(old.store_id!==req.params.id)throw Error('Pago asociado a otra empresa.');return {ok:true,period_end:old.period_end}}
   const end=months(s.subscription.current_period_end>p.paid_at?s.subscription.current_period_end:p.paid_at,p.billing_interval==='year'?12:1);
   db.prepare('INSERT INTO control_payments VALUES(?,?,?,?,?)').run(p.payment_id,req.params.id,p.amount,end,now());
   db.prepare("UPDATE tenant_meta SET expires_at=?,status=CASE WHEN status IN ('active','trial') THEN 'active' ELSE status END WHERE tenant_id=?").run(end,req.params.id);audit(req,'subscription.payment',req.params.id);return {ok:true,period_end:end};});res.json(result);
 });
}
