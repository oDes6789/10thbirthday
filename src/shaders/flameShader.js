/**
 * Billboard emoji 🔥 — giữ sắc nét, flicker nhẹ
 */

export const flameVertexShader = /* glsl */ `
  attribute float aPhase;
  attribute float aSeed;
  attribute float aScale;
  attribute float aDepth;
  attribute float aActive;

  uniform float uTime;
  uniform float uFlameHeight;

  varying vec2 vUv;
  varying float vDepth;
  varying float vAlpha;

  void main() {
    vUv = uv;

    if (aActive < 0.01) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vAlpha = 0.0;
      return;
    }

    float flicker = 0.94 + 0.06 * sin(uTime * 3.5 + aPhase * 2.5);

    vec3 transformed = vec3(
      position.x * aScale * flicker,
      position.y * aScale * flicker * uFlameHeight,
      position.z
    );

    #ifdef USE_INSTANCING
      vec4 worldPos = instanceMatrix * vec4(transformed, 1.0);
      vec4 mvPosition = viewMatrix * worldPos;
    #else
      vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    #endif

    gl_Position = projectionMatrix * mvPosition;

    float focus = smoothstep(0.0, 0.2, aDepth) * (1.0 - smoothstep(0.82, 1.0, aDepth));
    vAlpha = mix(0.22, 0.95, focus) * flicker;
    vAlpha *= mix(0.35, 1.0, aDepth);
    vAlpha *= aActive;
  }
`;

export const flameFragmentShader = /* glsl */ `
  uniform sampler2D uFlameTex;
  uniform float uBrightness;
  uniform float uAlpha;
  uniform float uTintWarm;

  varying vec2 vUv;
  varying float vDepth;
  varying float vAlpha;

  void main() {
    vec4 tex = texture2D(uFlameTex, vUv);
    if (tex.a < 0.04) discard;

    vec3 col = tex.rgb * uBrightness;
    col = mix(col, col * vec3(1.15, 0.85, 0.55), uTintWarm);
    col *= mix(0.7, 1.0, vDepth);

    float alpha = tex.a * vAlpha * uAlpha;
    gl_FragColor = vec4(col, alpha);
  }
`;
