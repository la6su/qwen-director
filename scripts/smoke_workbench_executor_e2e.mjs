import http from 'node:http';
import { ComfyWorkbenchExecutor } from '@qwendirector/workflow-adapters/executors';
const server = http.createServer((req, res) => {
  if (req.url === '/prompt') { let body=''; req.on('data', c=>body+=c); req.on('end',()=>{ res.setHeader('content-type','application/json'); res.end(JSON.stringify({prompt_id:'wb-e2e'})); }); return; }
  if (req.url === '/history/wb-e2e') { res.setHeader('content-type','application/json'); res.end(JSON.stringify({'wb-e2e':{status:{status_str:'success',completed:true},outputs:{'2':{images:[{filename:'actor.png',subfolder:'',type:'output'}]}}}})); return; }
  if (req.url?.startsWith('/view?')) { res.setHeader('content-type','image/png'); res.end(Buffer.from('png-fixture')); return; }
  res.statusCode=404; res.end();
});
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
try {
  const graph = {'1':{class_type:'LoadImage',inputs:{}},'2':{class_type:'SaveImage',inputs:{}}};
  const executor = new ComfyWorkbenchExecutor(`http://127.0.0.1:${port}`, graph, 'actor');
  const ctx = { planHash:'plan', jobId:'job', attemptId:'attempt', plan:{} };
  await executor.prepare(ctx); const receipt = await executor.submit(ctx); const state = await executor.poll(receipt); const result = await executor.collect(receipt);
  if (state.state !== 'succeeded' || result.outputs[0].slot !== 'master' || result.outputs[0].provenance.workbench !== 'actor') throw new Error('generic executor contract failed');
  console.log('workbench executor e2e smoke: ok');
} finally { server.close(); }
