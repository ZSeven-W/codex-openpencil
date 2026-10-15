import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readCanvasSelection, prepareSelectionEdit } from '../plugins/openpencil/scripts/canvas-selection.mjs';
import { CanvasController } from '../plugins/openpencil/scripts/canvas-controller.mjs';
import { EditorSession } from '../plugins/openpencil/scripts/editor-session.mjs';
import { createUiHarness, initializeApp, openPanel, settle } from './ui-harness.mjs';

const live = () => ({ version: 7, activePageIndex: 0, document: { version:'0.8.5', children:[
  {id:'card',name:'Card',type:'frame',children:[{id:'title',type:'text',name:'Headline',content:'Hello'}]},
  {id:'other',name:'Other card',type:'frame'},
] } });
const raw = (ids = 'title', pageId = '0', pageIndex = 0) => ({ active_page_id:pageId, active_page_index:String(pageIndex), selection_ids:ids });
function session(states = [raw()], value = live()) {
  let index = 0;
  return { source:'/design.op', draft:'/recovery.op', document:async () => value,
    forward:async () => ({result:{content:[{type:'text',text:JSON.stringify(states[Math.min(index++,states.length-1)])}]}}) };
}
const selection = ids => ({pageId:'0',pageIndex:0,nodeIds:ids,count:ids.length,nodes:ids.map(id=>({id,name:id,type:'frame'}))});

test('Selection resolves nested IDs on the active page without leaking document content', async () => {
  const current = await readCanvasSelection(session([raw('title,card,title,0')]));
  assert.deepEqual(current.selection.nodeIds,['card','title']);
  assert.equal(current.selection.nodes[1].parentId,'card');
  assert.equal(current.selection.nodes[1].name,'Headline');
  assert.ok(!JSON.stringify(current.selection).includes('Hello'));
  const empty = await readCanvasSelection(session([raw('')]));
  assert.equal(empty.selection.count,0);
  assert.deepEqual(empty.selection.nodes,[]);
  const multi = live();
  multi.document = {version:'0.8.5', pages:[{id:'p1',children:[{id:'other',type:'frame'}]},{id:'p2',children:[{id:'title',type:'text',name:'Page two'}]}]};
  multi.activePageIndex = 1;
  assert.equal((await readCanvasSelection(session([raw('title','p2',1)],multi))).selection.nodes[0].name,'Page two');
});

test('Missing nodes, page switches and failed selection reads cannot broaden an edit', async () => {
  await assert.rejects(readCanvasSelection(session([raw('deleted')])),error => error.code === 'SELECTION_STALE');
  await assert.rejects(readCanvasSelection(session([raw('title'),raw('other')])),error => error.code === 'SELECTION_TRANSITION');
  await assert.rejects(readCanvasSelection(session([raw('title','other-page',1)])),/切换/);
  await assert.rejects(readCanvasSelection({forward:async()=>({result:{isError:true}})}),/Cannot read/);
});

test('Prompt preparation freezes the scope and rejects empty, stale or unsynced requests', async () => {
  const active = session(), current = await readCanvasSelection(active);
  const input = {prompt:'把标题改成蓝色', expectedSelection:{pageId:'0',nodeIds:['title']}, docJson:JSON.stringify(current.live.document)};
  const result = prepareSelectionEdit(input,current,active);
  assert.deepEqual(result.nodeIds,['title']);
  assert.equal(result.pageId,'0'); assert.equal(result.version,7);
  assert.match(result.message,/把标题改成蓝色/); assert.match(result.message,/仅修改/);
  assert.ok(!result.message.includes('Other card'));
  assert.throws(()=>prepareSelectionEdit({...input,expectedSelection:{pageId:'0',nodeIds:['other']}},current,active),/选区已变化/);
  assert.throws(()=>prepareSelectionEdit({...input,docJson:JSON.stringify({children:[]})},current,active),/尚未同步/);
  assert.throws(()=>prepareSelectionEdit({...input,prompt:' '},current,active),/请输入/);
  assert.throws(()=>prepareSelectionEdit(input,{...current,selection:selection([])},active),/先在画布/);
});

test('Managed selection tool returns typed state and prepare failures do not invoke mutations', async () => {
  const controller = new CanvasController(); controller.session = session();
  const read = await controller.call('canvas_selection',{});
  assert.deepEqual(read.structuredContent.selection.nodeIds,['title']);
  const result = await controller.dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'canvas_prepare_edit',arguments:{prompt:'Change',expectedSelection:{pageId:'0',nodeIds:['other']}}}});
  assert.equal(result.result.isError,true);
  assert.equal(result.result.structuredContent.code,'SELECTION_CHANGED');
});

test('Selection transition codes survive both tool and panel transports without replaying a read', async t => {
  const controller = new CanvasController();
  const message = {jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'canvas_status'}};
  controller.session = session([raw('title'),raw('other')]);
  const result = await controller.dispatch(message);
  assert.equal(result.result.structuredContent.code,'SELECTION_TRANSITION');
  controller.session = session([raw('title'),raw('other')]);
  const panel = await controller.ensurePanel(); t.after(() => panel.close());
  const response = await fetch(panel.url + '/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'canvas_status'})});
  assert.equal(response.status,400);
  assert.equal((await response.json()).code,'SELECTION_TRANSITION');
});

test('Selection polling reuses unchanged document images and invalidates on version or page changes', async t => {
  let value = live(), reads = 0;
  const server = http.createServer((req,res) => {
    res.setHeader('Content-Type','application/json');
    if (req.url === '/api/mcp/version') res.end(JSON.stringify({version:value.version}));
    else { reads++; res.end(JSON.stringify(value)); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const active = Object.assign(Object.create(EditorSession.prototype),{port:server.address().port});
  await active.selectionDocument(0); await active.selectionDocument(0); assert.equal(reads,1);
  value.version++; await active.selectionDocument(0); assert.equal(reads,2);
  value.activePageIndex = 1; await active.selectionDocument(1); assert.equal(reads,3);
});

function panelMessage(app, url, data, origin = new URL(url).origin) {
  app.window.emit('message',{source:app.frame.contentWindow,origin,data});
}
test('Only the trusted frame can send a prompt, and the host must acknowledge delivery', async () => {
  const app = await createUiHarness('app');
  await initializeApp(app,'dark',{serverTools:{},message:{text:{}},updateModelContext:{text:{}}});
  const url = await openPanel(app);
  panelMessage(app,url,{type:'codex-canvas/ready'});
  assert.equal(app.frameMessages.at(-1).data.canSendPrompt,true);
  const value = {type:'codex-canvas/prompt',requestId:'req-1',message:'Modify title only'};
  panelMessage(app,url,value,'https://foreign.example');
  assert.ok(!app.hostMessages.some(item=>item.data.method==='ui/message'));
  panelMessage(app,url,value); panelMessage(app,url,value);
  const sent = app.hostMessages.filter(item=>item.data.method==='ui/message');
  assert.equal(sent.length,1); assert.equal(sent[0].data.params.role,'user');
  assert.ok(!app.frameMessages.some(item=>item.data.type==='codex-canvas/prompt-result'));
  app.host({jsonrpc:'2.0',id:sent[0].data.id,result:{}}); await settle();
  assert.equal(app.frameMessages.at(-1).data.ok,true);
  panelMessage(app,url,{...value,requestId:'req-2'});
  const second = app.hostMessages.at(-1).data;
  app.host({jsonrpc:'2.0',id:second.id,result:{isError:true}}); await settle();
  assert.equal(app.frameMessages.at(-1).data.ok,false);
  assert.equal(app.hostMessages.filter(item=>item.data.method==='ui/message').length,2);
});

test('Unsupported hosts report copy fallback and context updates are deduplicated and cleared', async () => {
  const app = await createUiHarness('app'); await initializeApp(app,'light'); const url = await openPanel(app);
  panelMessage(app,url,{type:'codex-canvas/ready'});
  assert.equal(app.frameMessages.at(-1).data.canSendPrompt,false);
  panelMessage(app,url,{type:'codex-canvas/prompt',requestId:'req',message:'Change'}); await settle();
  assert.equal(app.frameMessages.at(-1).data.ok,false);
  const value = {type:'codex-canvas/context',filePath:'/design.op',selection:selection(['title'])};
  panelMessage(app,url,value); panelMessage(app,url,value);
  assert.equal(app.hostMessages.filter(item=>item.data.method==='ui/update-model-context').length,1);
  panelMessage(app,url,{...value,selection:selection([])});
  assert.equal(app.hostMessages.filter(item=>item.data.method==='ui/update-model-context').length,2);
});

async function readyPanel(direct = false) {
  const ui = await createUiHarness('panel',{embedded:direct});
  if (direct) ui.host({type:'codex-canvas/theme',colorScheme:'dark',canSendPrompt:true});
  ui.editor({type:'op-bridge/ready',generation:1,revision:0});
  ui.rpc(({name,arguments:args}) => name === 'canvas_prepare_edit'
    ? {requestId:'prepared-1',message:JSON.stringify(args),selection:selection(['title'])}
    : {selection:selection(['title']),version:7});
  await ui.state('refreshSelection()');
  ui.element('edit-prompt').value = '改成蓝色'; ui.element('edit-prompt').oninput();
  return ui;
}
async function flushPanel(ui) {
  const pending = ui.editorMessages.findLast(item=>item.type==='op-bridge/snapshot');
  ui.editor({type:'op-bridge/snapshot-result',requestId:pending.requestId,docJson:JSON.stringify(live().document),generation:1,revision:0});
  await settle();
}

test('Standalone prompt copies the captured selection after flush, preserves draft and handles clipboard denial', async () => {
  const ui = await readyPanel();
  assert.equal(ui.element('edit-submit').textContent,'复制修改请求');
  const submitted = ui.state('submitSelectionPrompt()');
  ui.state('renderSelection({pageId:"0",nodeIds:["other"],count:1,nodes:[]})');
  await flushPanel(ui); await submitted;
  assert.equal(JSON.parse(ui.clipboard[0]).expectedSelection.nodeIds[0],'title');
  assert.equal(ui.element('edit-prompt').value,'改成蓝色');
  assert.ok(!ui.hostMessages.some(item=>item.data.type==='codex-canvas/prompt'));
  ui.navigator.clipboard.writeText = async () => {throw new Error('Denied');};
  await ui.state('copyRequest("manual request")');
  assert.equal(ui.element('request-dialog').open,true); assert.equal(ui.element('request-text').value,'manual request');
});

test('Direct prompt preserves text on rejection/timeout and clears it only after a trusted acknowledgement', async () => {
  const ui = await readyPanel(true);
  const submitted = ui.state('submitSelectionPrompt()'); await flushPanel(ui);
  const sent = ui.hostMessages.find(item=>item.data.type==='codex-canvas/prompt').data;
  ui.host({type:'codex-canvas/prompt-result',requestId:sent.requestId,ok:true},'https://foreign.example');
  assert.equal(ui.element('edit-prompt').value,'改成蓝色');
  ui.host({type:'codex-canvas/prompt-result',requestId:sent.requestId,ok:false,error:'Rejected'}); await submitted;
  assert.equal(ui.element('edit-prompt').value,'改成蓝色');
  const retry = ui.state('submitSelectionPrompt()'); await flushPanel(ui);
  ui.host({type:'codex-canvas/prompt-result',requestId:sent.requestId,ok:true}); await retry;
  assert.equal(ui.element('edit-prompt').value,'');
  ui.element('edit-prompt').value = 'Other edit';
  const timeout = ui.state('submitSelectionPrompt()'); await flushPanel(ui);
  const timer = [...ui.timers].find(([,fn])=>String(fn).includes('发送状态未确认'));
  timer[1](); await timeout;
  assert.equal(ui.element('edit-prompt').value,'Other edit');
  assert.equal(ui.hostMessages.filter(item=>item.data.type==='codex-canvas/prompt').length,3);
});

test('Empty and failed selections disable submission without dropping the prompt', async () => {
  const ui = await readyPanel();
  ui.state('renderSelection({count:0,nodeIds:[],nodes:[]})');
  assert.equal(ui.element('edit-submit').disabled,true);
  await ui.state('submitSelectionPrompt()'); assert.equal(ui.editorMessages.filter(item=>item.type==='op-bridge/snapshot').length,0);
  ui.rpc(()=>{throw new Error('Offline');}); await ui.state('refreshSelection()');
  assert.equal(ui.element('edit-submit').disabled,true); assert.equal(ui.element('edit-prompt').value,'改成蓝色');
});

test('Opaque MCP App origins use wildcard delivery while replies remain source and origin bound', async () => {
  const ui = await createUiHarness('panel');
  ui.host({type:'codex-canvas/theme',colorScheme:'dark',canSendPrompt:true},'null');
  const result = ui.state('sendPrompt({requestId:"opaque",message:"Change selected"})');
  assert.equal(ui.hostMessages.at(-1).origin,'*');
  ui.window.emit('message',{source:{},origin:'null',data:{type:'codex-canvas/prompt-result',requestId:'opaque',ok:true}});
  assert.equal(ui.state('promptReplies.size'),1);
  ui.host({type:'codex-canvas/prompt-result',requestId:'opaque',ok:true},'null'); await result;
});

test('Fast selection polling cannot starve the recovery checkpoint timer', async () => {
  const ui = await readyPanel();
  ui.state('checkpointSoon()'); const timerId = ui.state('checkpointTimer');
  ui.state('checkpointSoon()'); assert.equal(ui.state('checkpointTimer'),timerId);
  ui.timers.get(timerId)(); await settle();
  assert.ok(ui.rpcCalls.some(item=>JSON.parse(item.options.body).name==='canvas_checkpoint'));
  assert.equal(ui.state('checkpointTimer'),undefined);
});
