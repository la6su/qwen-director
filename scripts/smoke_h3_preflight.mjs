import assert from 'node:assert/strict';
import { preflightH3Runtime } from '../packages/workflow-adapters/src/h3-workflow.ts';
import { withH3VideoPath } from './lib/h3-workflow-fixture.mjs';

const samplerPathSchema = {
  ModelSource: { output: ['MODEL'] }, SigmasSource: { output: ['SIGMAS'] }, SamplerSource: { output: ['SAMPLER'] }, VAESource: { output: ['VAE'] },
  BasicGuider: { input: { required: { model: ['MODEL', {}], conditioning: ['CONDITIONING', {}] } }, output: ['GUIDER'] },
  SamplerCustomAdvanced: { input: { required: { noise: ['NOISE', {}], guider: ['GUIDER', {}], sigmas: ['SIGMAS', {}], sampler: ['SAMPLER', {}], latent_image: ['LATENT', {}] } }, output: ['LATENT'] },
  VAEDecode: { input: { required: { samples: ['LATENT', {}], vae: ['VAE', {}] } }, output: ['IMAGE'] },
  VHS_VideoCombine: { input: { required: { images: ['IMAGE', {}] } }, output: ['VIDEO'] },
};
const outputSchema = { SaveVideo: { input: { required: { video: ['VIDEO', {}], filename_prefix: ['STRING', {}] } } } };

const original = globalThis.fetch;
const available = {
  MiniMaxH3ReferenceToVideo: { input: { required: { prompt: ['STRING', {}] } }, output: ['CONDITIONING', 'LATENT'] },
  RandomNoise: { output: ['NOISE'] }, ...outputSchema, ...samplerPathSchema,
  UNETLoader: { input: { required: { unet_name: [['h3-int8.safetensors']] } } },
  LoraLoaderModelOnly: { input: { required: { lora_name: [['available.safetensors', 'minimax_h3_fl2v_turbo_8step.safetensors', 'MiniMax-H3-Ref2VA-Acc-8Step.safetensors']] } } },
  MiniMaxH3PDDAccApply: { input: { required: { pdd_file: [['fl2va-acc.safetensors']] } } },
};
const baseGraph = withH3VideoPath({
  '1': { class_type: 'MiniMaxH3ReferenceToVideo', inputs: { prompt: 'template' } },
  '2': { class_type: 'UNETLoader', inputs: { unet_name: 'h3-int8.safetensors' } },
  '3': { class_type: 'RandomNoise', inputs: {} },
  '4': { class_type: 'SaveVideo', inputs: { filename_prefix: 'fixture' } },
}, { h3Id: '1', noiseId: '3', saveId: '4' });

try {
  globalThis.fetch = async (url) => {
    assert.equal(url, 'http://pve/object_info');
    return { ok: true, json: async () => available };
  };
  const result = await preflightH3Runtime('http://pve');
  assert.ok(result.classes.includes('MiniMaxH3ReferenceToVideo'));

  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    MiniMaxH3ImageToVideo: { input: { required: { first_frame: ['IMAGE', {}], prompt: ['STRING', {}] } }, output: ['CONDITIONING', 'LATENT'] },
    LoadImage: { input: { required: { image: ['STRING', {}] } }, output: ['IMAGE'] },
    RandomNoise: { output: ['NOISE'] }, ...outputSchema, ...samplerPathSchema,
  }) });
  const imageToVideo = await preflightH3Runtime('http://pve', withH3VideoPath({
    h: { class_type: 'MiniMaxH3ImageToVideo', inputs: { first_frame: ['image', 0], prompt: 'template' } },
    image: { class_type: 'LoadImage', inputs: { image: 'first.png' } },
    noise: { class_type: 'RandomNoise', inputs: {} }, save: { class_type: 'SaveVideo', inputs: { filename_prefix: 'fixture' } },
  }, { h3Id: 'h', noiseId: 'noise', saveId: 'save' }));
  assert.ok(imageToVideo.classes.includes('MiniMaxH3ImageToVideo'));

  globalThis.fetch = async (url) => {
    assert.equal(url, 'http://pve/object_info');
    return { ok: true, json: async () => available };
  };
  const quality = await preflightH3Runtime('http://pve', {
    ...baseGraph,
    '5': { class_type: 'LoraLoaderModelOnly', inputs: { lora_name: 'MiniMax-H3-Ref2VA-Acc-8Step.safetensors' } },
  });
  assert.equal(quality.qualityHint, 'quality-8step');
  await assert.rejects(() => preflightH3Runtime('http://pve', {
    ...baseGraph,
    '5': { class_type: 'LoraLoaderModelOnly', inputs: { lora_name: 'missing.safetensors' } },
  }), /COMFY_MISSING_LORA:missing.safetensors/);
  await assert.rejects(() => preflightH3Runtime('http://pve', {
    ...baseGraph,
    '2': { class_type: 'UNETLoader', inputs: { unet_name: 'missing-int8.safetensors' } },
  }), /COMFY_MISSING_MODEL:2:UNETLoader:unet_name:missing-int8.safetensors/);
  await assert.rejects(() => preflightH3Runtime('http://pve', {
    ...baseGraph,
    '5': { class_type: 'MiniMaxH3PDDAccApply', inputs: { pdd_file: 'missing-acc.safetensors' } },
  }), /COMFY_MISSING_MODEL:5:MiniMaxH3PDDAccApply:pdd_file:missing-acc.safetensors/);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    MiniMaxH3ReferenceToVideo: { input: { required: {} }, output: ['CONDITIONING', 'LATENT'] },
    RandomNoise: { output: ['NOISE'] }, ...outputSchema, ...samplerPathSchema,
  }) });
  await assert.rejects(() => preflightH3Runtime('http://pve', withH3VideoPath({
    '1': { class_type: 'MiniMaxH3ReferenceToVideo', inputs: {} },
    '2': { class_type: 'RandomNoise', inputs: {} }, '3': { class_type: 'SaveVideo', inputs: { filename_prefix: 'fixture' } },
  }, { h3Id: '1', noiseId: '2', saveId: '3' })), /H3_PROMPT_BINDING_REQUIRED/);
  globalThis.fetch = async (url) => {
    assert.equal(url, 'http://pve/object_info');
    return { ok: true, json: async () => available };
  };
  await assert.rejects(() => preflightH3Runtime('http://pve', {
    ...baseGraph,
    '5': { class_type: 'LoraLoaderModelOnly', inputs: { lora_name: 'minimax_h3_fl2v_turbo_8step.safetensors' } },
  }), /COMFY_INCOMPATIBLE_LORA:FL2V_FOR_REF2V/);

  globalThis.fetch = async () => ({ ok: true, json: async () => ({ RandomNoise: {}, SaveVideo: {} }) });
  await assert.rejects(() => preflightH3Runtime('http://pve'), /COMFY_MISSING_NODE:MiniMaxH3ReferenceToVideo/);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ MiniMaxH3ReferenceToVideo: { input: { required: { prompt: ['STRING', {}] } } }, RandomNoise: {}, SaveVideo: {} }) });
  await assert.rejects(() => preflightH3Runtime('http://pve', { '1': { class_type: 'MiniMaxH3ReferenceToVideo', inputs: { prompt: 'x', bogus: 'x' } } }), /COMFY_WORKFLOW_SCHEMA_MISMATCH:1:MiniMaxH3ReferenceToVideo:INPUT_MISSING:bogus/);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ MiniMaxH3ReferenceToVideo: { output: ['CONDITIONING', 'LATENT'], input: { required: { prompt: ['STRING', {}] } } }, RandomNoise: { output: ['NOISE'], input: { required: {} } }, SaveVideo: { output: ['VIDEO'], input: { required: { video: ['VIDEO', {}], filename_prefix: ['STRING', {}] } } } }) });
  await assert.rejects(() => preflightH3Runtime('http://pve', {
    '1': { class_type: 'MiniMaxH3ReferenceToVideo', inputs: { prompt: 'template' } },
    '2': { class_type: 'SaveVideo', inputs: { video: ['1', 1], filename_prefix: 'bad' } },
  }), /LINK_TYPE_MISMATCH:video/);
  console.log('OK: H3 preflight checks runtime nodes, model files, LoRA modes, graph schema, and output links');
} finally {
  globalThis.fetch = original;
}
