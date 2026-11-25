// Alle geometrie staat in world space, dus lighting ook (de oude versie mengde view- en world space).
export const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aCol;
layout(location=2) in vec3 aNorm;
layout(location=3) in vec2 aTex;
uniform mat4 uViewProj;
uniform float uAmp;
out vec3 vCol; out vec3 vNorm; out vec3 vPos; out vec2 vTex;
void main(){
  gl_Position = uViewProj * vec4(aPos, 1.);
  gl_PointSize = 3. + uAmp * 10.;
  vCol = aCol; vNorm = aNorm; vPos = aPos; vTex = aTex;
}`;

export const FRAG = `#version 300 es
precision highp float;
in vec3 vCol; in vec3 vNorm; in vec3 vPos; in vec2 vTex;
uniform float uTime, uAmp, uLightInt, uSpec;
uniform bool uLight, uGlow;
uniform vec3 uLightPos, uViewPos;
out vec4 fragColor;

// Procedurele textuur: value noise (geen Perlin/gradient noise)
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
vec3 procTex(vec2 uv){
  float n = noise(uv * 8. + uTime * .5) * .6 + noise(uv * 16. - uTime * .3) * .4;
  return mix(vec3(.2, .4, .8), vec3(.8, .2, .6), n);
}

void main(){
  vec3 col = mix(vCol, procTex(vTex), .4);
  if(uLight){
    vec3 n = normalize(vNorm);
    vec3 l = normalize(uLightPos - vPos);
    vec3 v = normalize(uViewPos - vPos);
    vec3 h = normalize(l + v);
    float diff = max(dot(n, l), 0.);
    float spec = diff > 0. ? pow(max(dot(n, h), 0.), 64.) : 0.;   // Blinn-Phong
    col = col * uLightInt * (.25 + diff) + uSpec * spec * uLightInt * 2.;
  }
  col *= .6 + uAmp;
  col += vec3(sin(uTime * 2.), cos(uTime * 1.5), sin(uTime * 2.5)) * .15 * uAmp;
  if(uGlow && dot(col, vec3(.2126, .7152, .0722)) > .7) col *= 1.3;
  fragColor = vec4(col, 1.);
}`;
