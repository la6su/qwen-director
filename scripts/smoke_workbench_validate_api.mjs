import assert from 'node:assert/strict';
process.env.QWEN_STORAGE = 'memory';
process.env.QWEN_API_AUTOSTART = 'false';
const { app } = await import('../apps/api/src/index.ts');
const graph = {
  '1': { class_type:'LoadImage', inputs:{ image:'base.png' } },
  '2': { class_type:'TextEncodeQwenImage21', inputs:{ resolution:0, 'images.image_1':['1',0] } },
  '3': { class_type:'EmptyLatentImage', inputs:{ width:1659, height:948, batch_size:1 } },
  '4': { class_type:'ComfySwitchNode', inputs:{ switch:true, on_true:['3',0], on_false:['2',2] } },
  '5': { class_type:'KSampler', inputs:{ latent_image:['4',0] } },
  '6': { class_type:'SaveImageAdvanced', inputs:{ images:['5',0] } },
};
try {
  const response = await app.inject({ method:'POST', url:'/v1/workbenches/validate', payload:{ kind:'image-edit', graph } });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().graph['4'].inputs.switch, false);
  assert.equal(graph['4'].inputs.switch, true, 'request graph remains unchanged');
  assert.equal(response.json().outputBindings['6'], 'image');
  console.log('workbench validate API smoke: ok');
} finally { await app.close(); }
