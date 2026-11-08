import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import axios from 'axios';

const id='11111111-1111-4111-8111-111111111111';
const receipt=()=>({requestId:id,status:'pending_review',createdAt:'2026-11-08T00:00:00Z',resolvedAt:null,version:1,resolutionCode:null,
  membershipImpact:{requiresReview:true},retentionSummary:[{category:'payment_records',policyStatus:'pending_approval',reason:null,retainUntil:null}]});
async function fixture() {
  let token='original-session', next={status:200,data:{requests:[]}};
  const requests=[];
  const context=vm.createContext({localStorage:{getItem:()=>token}});
  const mockAxios={isAxiosError:axios.isAxiosError,create({baseURL}){
    let interceptor;
    return {interceptors:{request:{use(run){interceptor=run;}}},request(config){
      return Promise.resolve().then(()=>interceptor({...config,headers:new axios.AxiosHeaders(config.headers)})).then((request)=>{
        requests.push({...request,baseURL}); return next;
      });
    }};
  }};
  const source=await readFile(new URL('../src/services/accountDeletionService.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const module=new vm.SourceTextModule(compiled,{context});
  await module.link((specifier)=>{
    const exports=specifier==='axios'?{default:mockAxios}:specifier==='../api/api'?{API:{defaults:{baseURL:'https://api.example.invalid/api'}}}:null;
    assert.ok(exports,'Unexpected dependency');
    return new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value] of Object.entries(exports))this.setExport(key,value);},{context});
  });
  await module.evaluate();
  return {api:module.namespace,requests,respond(status,data){next={status,data};},changeSession(value){token=value;}};
}
test('requests stay on the configured real API paths and Google sends no client identity or password',async()=>{
  const f=await fixture();
  f.respond(202,{challengeId:id,method:'otp',expiresAt:new Date(Date.now()+300000).toISOString()});
  await f.api.verifyIdentity('',true,'original-session');
  assert.equal(f.requests[0].baseURL,'https://api.example.invalid/api');
  assert.equal(f.requests[0].url,'/auth/reauthenticate');
  assert.deepEqual(JSON.parse(JSON.stringify(f.requests[0].data)),{purpose:'account-cancellation',method:'google-email'});
  assert.equal(f.requests[0].headers.get('Authorization'),'Bearer original-session');
});
test('a login change before Axios dispatch cannot authorize an old command as the new account',async()=>{
  const f=await fixture(); f.respond(200,receipt());
  const pending=f.api.decideAdministrativeCancellation(id,{status:'under_review',version:1,reasonCode:'SYNTHETIC_REVIEW'},id,'original-session');
  f.changeSession('another-session');
  await assert.rejects(pending,/DELETION_SESSION_CHANGED/); assert.equal(f.requests.length,0);
});
test('malformed or ambiguous successful HTTP responses never create a proof',async()=>{
  const f=await fixture();
  for(const [httpStatus,data] of [
    [200,{reauthenticationToken:'not-a-proof',expiresAt:new Date(Date.now()+300000).toISOString()}],
    [200,{reauthenticationToken:'a'.repeat(43),expiresAt:'invalid-date'}],
    [202,{challengeId:id,method:'otp',reauthenticationToken:'a'.repeat(43),expiresAt:new Date(Date.now()+300000).toISOString()}],
    [200,{reauthenticationToken:'a'.repeat(43),expiresAt:'2000-01-01T00:00:00Z'}],
  ]) {f.respond(httpStatus,data); await assert.rejects(()=>f.api.verifyIdentity('synthetic',false),/INVALID_DELETION_RESPONSE/);}
});
test('malformed lists and an unapproved completed status are rejected without reflecting server content',async()=>{
  const f=await fixture();
  for(const data of [{},'private upstream content',{requests:[receipt(),receipt()]}]) {
    f.respond(200,data); await assert.rejects(()=>f.api.listCancellations(),/INVALID_DELETION_RESPONSE/);
  }
  assert.throws(()=>f.api.parseCancellation({...receipt(),status:'completed',resolvedAt:'2026-11-08T01:00:00Z'}),/INVALID_DELETION_RESPONSE/);
});
test('idempotent replies must confirm the expected administrative folio',async()=>{
  const f=await fixture(); f.respond(200,{...receipt(),requestId:'22222222-2222-4222-8222-222222222222'});
  await assert.rejects(()=>f.api.decideAdministrativeCancellation(id,{status:'under_review',version:1,reasonCode:'SYNTHETIC_REVIEW'},id,'original-session'),/INVALID_DELETION_RESPONSE/);
});
