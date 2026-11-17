/** Add a minimal connected sampler → decode → video-save branch to static H3 fixtures. */
export function withH3VideoPath(source, { h3Id, noiseId, saveId }) {
  const graph = structuredClone(source);
  const samplerId = Object.entries(graph).find(([, node]) => node.class_type === 'SamplerCustomAdvanced')?.[0] ?? '__fixture_sampler';
  graph.__fixture_model = { class_type: 'ModelSource', inputs: {} };
  graph.__fixture_sigmas = { class_type: 'SigmasSource', inputs: {} };
  graph.__fixture_sampler_type = { class_type: 'SamplerSource', inputs: {} };
  graph.__fixture_vae = { class_type: 'VAESource', inputs: {} };
  const existingInputs = graph[samplerId]?.inputs ?? {};
  graph[samplerId] = {
    class_type: 'SamplerCustomAdvanced',
    inputs: {
      ...existingInputs,
      noise: existingInputs.noise ?? [noiseId, 0],
      guider: existingInputs.guider ?? ['__fixture_guider', 0],
      sigmas: existingInputs.sigmas ?? ['__fixture_sigmas', 0],
      sampler: existingInputs.sampler ?? ['__fixture_sampler_type', 0],
      latent_image: existingInputs.latent_image ?? [h3Id, 1],
    },
  };
  graph.__fixture_guider = { class_type: 'BasicGuider', inputs: { model: ['__fixture_model', 0], conditioning: [h3Id, 0] } };
  graph.__fixture_decode = { class_type: 'VAEDecode', inputs: { samples: [samplerId, 0], vae: ['__fixture_vae', 0] } };
  graph.__fixture_video = { class_type: 'VHS_VideoCombine', inputs: { images: ['__fixture_decode', 0] } };
  graph[saveId].inputs = { ...graph[saveId].inputs, video: ['__fixture_video', 0] };
  return graph;
}
