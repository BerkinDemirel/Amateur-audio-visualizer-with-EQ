import { VERT, FRAG } from './shaders.js';

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
  return s;
}

function link(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(p));
  return p;
}

export class Renderer {
  constructor(canvas) {
    const gl = this.gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) throw new Error('WebGL2 wordt niet ondersteund door deze browser');
    this.canvas = canvas;
    this.prog = link(gl, VERT, FRAG);
    gl.useProgram(this.prog);
    this.u = {};
    for (let i = 0; i < gl.getProgramParameter(this.prog, gl.ACTIVE_UNIFORMS); i++) {
      const { name } = gl.getActiveUniform(this.prog, i);
      this.u[name] = gl.getUniformLocation(this.prog, name);
    }
    this.vao = gl.createVertexArray();
    this.buf = Object.fromEntries(['pos', 'col', 'norm', 'tex', 'idx'].map(k => [k, gl.createBuffer()]));
    this.prim = { strip: gl.LINE_STRIP, loop: gl.LINE_LOOP, points: gl.POINTS };
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  get aspect() { return this.canvas.width / Math.max(1, this.canvas.height); }

  resize() { // houdt rekening met devicePixelRatio (scherp op retina)
    const dpr = Math.min(window.devicePixelRatio || 1, 2), c = this.canvas;
    c.width = Math.max(1, Math.round(c.clientWidth * dpr));
    c.height = Math.max(1, Math.round(c.clientHeight * dpr));
    this.gl.viewport(0, 0, c.width, c.height);
  }

  setGeometry(g) {
    const { gl } = this;
    gl.bindVertexArray(this.vao);
    const up = (name, loc, size, data, usage) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf[name]);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    up('pos', 0, 3, g.pos, gl.DYNAMIC_DRAW);
    up('col', 1, 3, g.col, gl.STATIC_DRAW);
    up('norm', 2, 3, g.norm, gl.STATIC_DRAW);
    up('tex', 3, 2, g.tex, gl.STATIC_DRAW);
    if (g.idx) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buf.idx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);
    }
  }

  render(g, f) {
    const { gl, u } = this;
    gl.clearColor(0.04, 0.04, 0.09, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.uniformMatrix4fv(u.uViewProj, false, f.viewProj);
    gl.uniform3fv(u.uViewPos, f.eye);
    gl.uniform3f(u.uLightPos, 3, 4, 3);
    gl.uniform1f(u.uTime, f.time);
    gl.uniform1f(u.uAmp, f.amp);
    gl.uniform1i(u.uLight, f.light ? 1 : 0);
    gl.uniform1f(u.uLightInt, f.lightInt);
    gl.uniform1f(u.uSpec, f.spec);
    gl.uniform1i(u.uGlow, f.glow ? 1 : 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.pos);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, g.pos); // geen nieuwe allocatie per frame

    if (g.primitive === 'triangles') { // solide meshes: geen blending
      gl.disable(gl.BLEND); gl.depthMask(true);
      gl.drawElements(gl.TRIANGLES, g.idx.length, gl.UNSIGNED_SHORT, 0);
    } else { // lijnen/punten: additief voor een gloed-look
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
      gl.drawArrays(this.prim[g.primitive], 0, g.count);
      if (g.primitive !== 'points') gl.drawArrays(gl.POINTS, 0, g.count);
    }
  }
}
