/* =========================================================
   Майстерня у Євгенія — interactions & motion
   Stack: GSAP 3 + ScrollTrigger + Lenis. Без збірки — легко
   перенести у WordPress (wp_enqueue_script, deps: gsap, lenis).
   ========================================================= */
(() => {
  'use strict';

  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Fallback: CDN не завантажився → показуємо все статично
     --------------------------------------------------------- */
  if (!hasGsap) {
    root.classList.remove('js');
    d.body.classList.remove('is-loading');
    $('.preloader')?.remove();
    initConfigurator(null);
    initForm();
    initMenu(null);
    initMarquee();
    initViewer(null);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'expo.out', duration: 1.2 });

  /* ---------------------------------------------------------
     Smooth scroll
     --------------------------------------------------------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  const scrollToTarget = (target, offset = 0) => {
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = $(id);
      if (!t) return;
      e.preventDefault();
      scrollToTarget(t, id === '#top' ? 0 : -20);
    });
  });

  /* ---------------------------------------------------------
     Text splitting (без платних плагінів)
     --------------------------------------------------------- */
  function splitWords(el, cls = 'w') {
    const words = el.textContent.trim().split(/[ \n\t]+/);
    el.innerHTML = words.map((w) => `<span class="${cls}">${w}</span>`).join(' ');
    return $$('.' + cls, el);
  }

  // Розбиває на рядки за фактичною версткою; підтримує <br> та &nbsp;
  function splitLines(el) {
    const tokens = [];
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) n.textContent.split(/ +/).forEach((t) => t.trim() && tokens.push({ html: t.replace(/\n/g, '') }));
      else if (n.nodeName === 'BR') tokens.push({ br: true });
      else tokens.push({ html: n.outerHTML });
    });
    el.innerHTML = tokens.map((t) => (t.br ? '<br>' : `<span class="tw">${t.html}</span>`)).join(' ');
    const lines = [];
    let top = null;
    $$('.tw', el).forEach((w) => {
      const prev = w.previousSibling;
      const forced = prev && prev.previousSibling && prev.previousSibling.nodeName === 'BR';
      if (top === null || Math.abs(w.offsetTop - top) > 4 || forced) { lines.push([]); top = w.offsetTop; }
      lines[lines.length - 1].push(w.innerHTML);
    });
    el.innerHTML = lines.map((l) => `<span class="line"><span class="line__in">${l.join(' ')}</span></span>`).join('');
    return $$('.line__in', el);
  }

  /* ---------------------------------------------------------
     Preloader → hero intro
     --------------------------------------------------------- */
  function preloader() {
    const pre = $('.preloader');
    const num = $('[data-count]');
    const tl = gsap.timeline();
    if (!pre) return Promise.resolve();

    const counter = { v: 0 };
    // лічильник + CSS-змінна --p (проявлення гравюри й лінія прогресу)
    const paint = () => { const v = Math.round(counter.v); num.textContent = v; pre.style.setProperty('--p', `${counter.v}%`); pre.style.setProperty('--pn', counter.v / 100); };
    const minTime = reduce ? 0.2 : 1.6;
    const loaded = new Promise((r) => (d.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
    const fonts = d.fonts ? d.fonts.ready : Promise.resolve();

    return new Promise((resolve) => {
      // без зупинки на 86: до 80 — розгін, далі повільне «підповзання» до 96, поки сторінка довантажується
      tl.to(counter, { v: 80, duration: minTime, ease: 'power1.inOut', onUpdate: paint })
        .to(counter, { v: 96, duration: 6, ease: 'power2.out', onUpdate: paint });
      Promise.all([loaded, fonts, new Promise((r) => setTimeout(r, minTime * 1000))]).then(() => {
        tl.kill();
        gsap.timeline({ onComplete: () => pre.remove() })
          // м'яке доведення до 100 + коротка пауза «на вдих» перед виходом
          .to(counter, { v: 100, duration: 0.9, ease: 'sine.inOut', onUpdate: paint })
          .to('.preloader__ember', { scale: 2.4, opacity: 1, duration: 1.4, ease: 'power2.inOut' }, '<0.2')
          .to('.preloader__inner', { yPercent: -30, opacity: 0, duration: 0.9, ease: 'power2.inOut' }, '>-0.7')
          // інтро Hero стартує, щойно шторка починає підніматися, — сцена збирається під нею
          .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut', onStart: resolve }, '-=0.25');
      });
    });
  }

  function heroIntro() {
    d.body.classList.remove('is-loading');
    lenis?.start();
    const tl = gsap.timeline();
    tl.fromTo('[data-hero-img]', { scale: 1.2, filter: 'brightness(.35)' }, { scale: 1, filter: 'brightness(1)', duration: 2.4, ease: 'expo.out' })
      .to('.hero .line__in', { y: 0, yPercent: 0, duration: 1.6, stagger: 0.12 }, 0.2)
      // контурні слова: «наведення фокуса» — прозорість + розфокус + легке зменшення, по черзі
      .fromTo('.hero__ghost', { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 2.4, stagger: 0.3, ease: 'power2.out', clearProps: 'filter' }, 0.7)
      .fromTo('.hero__ghost svg', { scale: 1.1, transformOrigin: '50% 50%' }, { scale: 1, duration: 3, stagger: 0.3, ease: 'expo.out' }, 0.7)
      .to('[data-hero-fade]', { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 1.0)
      // хедер — останнім, коли сцена вже зібрана (до цього прихований CSS-ом, без блимання)
      .fromTo('.header__row > *', { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.08, ease: 'power3.out' }, 1.3)
      .add(() => window.dispatchEvent(new Event('hero:ready')), 0.9);
    return tl;
  }

  /* ---------------------------------------------------------
     Hero — «живі» контурні слова: глибина від курсора
     --------------------------------------------------------- */
  function initGhosts() {
    if (touch || reduce) return;
    const hero = $('[data-hero]');
    const ghosts = $$('[data-ghost]').map((el) => ({
      k: parseFloat(el.dataset.ghost),
      x: gsap.quickTo(el, 'xPercent', { duration: 1.4, ease: 'power3' }),
      y: gsap.quickTo(el, 'yPercent', { duration: 1.4, ease: 'power3' }),
    }));
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      ghosts.forEach((g) => { g.x(nx * 8 * g.k); g.y(ny * 18 * g.k); });
    });
  }

  /* ---------------------------------------------------------
     Hero — реалістичний дим (WebGL-шейдер: domain-warped fbm +
     ridged-noise для тонких волокон). Fallback — 2D-частинки.
     --------------------------------------------------------- */
  const SMOKE_FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uSrc; uniform vec2 uMouse; uniform float uWind; uniform float uAlpha;

/* 2D simplex noise (Ashima / Stefan Gustavson) — без «сітки» value-noise */
vec3 permute(vec3 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * snoise(p); p = r * p * 2.02; a *= 0.5; }
  return v * 0.5 + 0.5;               /* 0..1 */
}

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (frag - uSrc) / uRes.y;     /* одиниці = висота кадру, 0 — чаша */
  float h = -p.y;
  float hh = max(h, 0.0);
  float t = uTime;

  /* курсор м'яко розсуває дим */
  vec2 m = (frag - uMouse) / uRes.y;
  float push = exp(-dot(m, m) / 0.006);

  /* повільне гойдання стовпчика; знос праворуч — як у диму на фото */
  float sway = (fbm(vec2(hh * 1.6 - t * 0.05, 3.1 + t * 0.03)) - 0.5) * hh * 0.9;
  float center = hh * 0.10 + hh * hh * 0.45 + sway + uWind * hh * hh * 0.8;
  float x = p.x - center - push * m.x * 0.9;
  float width = 0.004 + hh * 0.10 + hh * hh * 0.22;

  /* дим повільно піднімається: domain warp дає м'які завитки */
  vec2 q = vec2(x * 7.0, hh * 4.0 - t * 0.16);
  vec2 w = vec2(fbm(q * 0.9 + vec2(0.0, t * 0.03)), fbm(q * 0.9 + vec2(4.3, 1.7) - t * 0.02));
  float n = fbm(q * 1.15 + (w - 0.5) * 2.6);

  float body = exp(-(x * x) / (width * width));
  float wisps = smoothstep(0.42, 0.78, n);           /* м'які пасма, без різких меж */
  float base = smoothstep(-0.004, 0.02, h);
  float fade = 1.0 - smoothstep(0.12, 0.55, hh);      /* розсіюється, не доходячи до обличчя */
  float plume = body * mix(0.35, 1.0, wisps) * base * fade;
  /* тонка цівка відразу над чашею */
  float thread = exp(-(x * x) / (0.00002 + hh * 0.0006)) * (1.0 - smoothstep(0.0, 0.07, hh)) * base;
  plume = max(plume, thread * 0.6);

  /* ледь помітний серпанок, що дрейфує в правій частині */
  vec2 a = frag / uRes.y;
  float hz = fbm(a * 1.6 + vec2(t * 0.012, t * 0.02) + (vec2(fbm(a * 1.1 - t * 0.01), fbm(a * 1.1 + 5.0)) - 0.5) * 1.5);
  float haze = smoothstep(0.55, 0.9, hz) * 0.10 * smoothstep(0.35, 0.9, frag.x / uRes.x);

  float alpha = clamp(plume * 0.55 + haze, 0.0, 0.85) * uAlpha;
  vec3 col = vec3(0.90, 0.88, 0.85);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

  /* ---------------------------------------------------------
     Hero — дим як рідина: GPU-симуляція Нав'є–Стокса
     (підхід WebGL-Fluid-Simulation P. Dobryakov, MIT) +
     плавучість (теплий дим піднімається) + vorticity confinement
     (природні завитки). Джерело — чаша люльки на фото.
     --------------------------------------------------------- */
  function initFluidSmoke(canvas, hero, getSrc, state) {
    // перевірка підтримки на тимчасовому canvas — щоб не «зайняти» основний, якщо треба fallback
    const probe = d.createElement('canvas').getContext('webgl2');
    if (!probe || !probe.getExtension('EXT_color_buffer_float')) return false;
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) return false;
    gl.getExtension('OES_texture_float_linear');

    const P = {
      SIM: 128, DYE: 640,
      SPEED: 0.5,            // темп симуляції: 0.5 = удвічі повільніше реального часу
      CURL: 22,              // сила завитків
      VEL_DISS: 0.35,        // згасання швидкості
      DYE_DISS: 0.32,        // як швидко дим розсіюється
      PRESSURE: 0.8, ITER: 20,
      BUOY: 22,              // плавучість
      EMIT_DYE: 0.6, EMIT_VEL: 24, EMIT_R: 0.00018,
    };

    const VS = `precision highp float;
attribute vec2 aPos; uniform vec2 texelSize;
varying vec2 vUv, vL, vR, vT, vB;
void main(){ vUv = aPos * .5 + .5; vL = vUv - vec2(texelSize.x, 0.); vR = vUv + vec2(texelSize.x, 0.);
vT = vUv + vec2(0., texelSize.y); vB = vUv - vec2(0., texelSize.y); gl_Position = vec4(aPos, 0., 1.); }`;
    const H = 'precision highp float; precision highp sampler2D; varying vec2 vUv, vL, vR, vT, vB;\n';
    const FS = {
      splat: H + `uniform sampler2D uTarget; uniform float aspect; uniform vec3 color; uniform vec2 point; uniform float radius;
void main(){ vec2 p = vUv - point; p.x *= aspect; vec3 s = exp(-dot(p, p) / radius) * color; gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.); }`,
      advect: H + `uniform sampler2D uVelocity, uSource; uniform vec2 texelSize; uniform float dt, dissipation;
void main(){ vec2 c = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize; gl_FragColor = texture2D(uSource, c) / (1. + dissipation * dt); }`,
      divergence: H + `uniform sampler2D uVelocity;
void main(){ float L = texture2D(uVelocity, vL).x, R = texture2D(uVelocity, vR).x, T = texture2D(uVelocity, vT).y, B = texture2D(uVelocity, vB).y;
vec2 C = texture2D(uVelocity, vUv).xy; if (vL.x < 0.) L = -C.x; if (vR.x > 1.) R = -C.x; if (vT.y > 1.) T = -C.y; if (vB.y < 0.) B = -C.y;
gl_FragColor = vec4(.5 * (R - L + T - B), 0., 0., 1.); }`,
      curl: H + `uniform sampler2D uVelocity;
void main(){ float L = texture2D(uVelocity, vL).y, R = texture2D(uVelocity, vR).y, T = texture2D(uVelocity, vT).x, B = texture2D(uVelocity, vB).x;
gl_FragColor = vec4(.5 * (R - L - T + B), 0., 0., 1.); }`,
      vorticity: H + `uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
void main(){ float L = texture2D(uCurl, vL).x, R = texture2D(uCurl, vR).x, T = texture2D(uCurl, vT).x, B = texture2D(uCurl, vB).x, C = texture2D(uCurl, vUv).x;
vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + .0001; f *= curl * C; f.y *= -1.;
vec2 v = texture2D(uVelocity, vUv).xy + f * dt; gl_FragColor = vec4(clamp(v, -1000., 1000.), 0., 1.); }`,
      pressure: H + `uniform sampler2D uPressure, uDivergence;
void main(){ float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x, T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
gl_FragColor = vec4((L + R + B + T - texture2D(uDivergence, vUv).x) * .25, 0., 0., 1.); }`,
      gradient: H + `uniform sampler2D uPressure, uVelocity;
void main(){ float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x, T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
gl_FragColor = vec4(texture2D(uVelocity, vUv).xy - vec2(R - L, T - B), 0., 1.); }`,
      clear: H + `uniform sampler2D uTexture; uniform float value; void main(){ gl_FragColor = value * texture2D(uTexture, vUv); }`,
      buoyancy: H + `uniform sampler2D uVelocity, uDye; uniform float strength, dt;
void main(){ vec2 v = texture2D(uVelocity, vUv).xy; float d = texture2D(uDye, vUv).r; v.y += strength * d * dt; v.x += strength * .12 * d * dt; gl_FragColor = vec4(v, 0., 1.); }`,
      display: H + `uniform sampler2D uTexture; uniform float uAlpha; uniform vec2 dyeTexel;
void main(){
  /* легке розмиття 5 tap — м'які краї, як у справжнього диму */
  float d = texture2D(uTexture, vUv).r * .4
          + (texture2D(uTexture, vUv + vec2(dyeTexel.x, 0.)).r + texture2D(uTexture, vUv - vec2(dyeTexel.x, 0.)).r
          +  texture2D(uTexture, vUv + vec2(0., dyeTexel.y)).r + texture2D(uTexture, vUv - vec2(0., dyeTexel.y)).r) * .15;
  float a = (1. - exp(-d * 1.6)) * .82 * uAlpha;
  gl_FragColor = vec4(vec3(.91, .89, .86) * a, a); }`,
    };

    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    let vs;
    const progs = {};
    try {
      vs = compile(gl.VERTEX_SHADER, VS);
      for (const [k, src] of Object.entries(FS)) {
        const p = gl.createProgram();
        gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src));
        gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        const u = {};
        for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
        progs[k] = { p, u };
      }
    } catch (err) { return false; }

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const fbo = (w, h) => {
      gl.activeTexture(gl.TEXTURE0);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex, fb, w, h, tx: 1 / w, ty: 1 / h, bind(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
    };
    const dbl = (w, h) => { let a = fbo(w, h), b = fbo(w, h); return { get read() { return a; }, get write() { return b; }, swap() { [a, b] = [b, a]; } }; };
    const res = (r) => { const ar = canvas.width / canvas.height; const big = Math.round(r * Math.max(ar, 1 / ar)); return ar > 1 ? [big, r] : [r, big]; };

    let vel, dye, div, curlT, pres, aspect = 1;
    function init() {
      const r = hero.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      aspect = canvas.width / canvas.height;
      const [sw, sh] = res(P.SIM), [dw, dh] = res(P.DYE);
      vel = dbl(sw, sh); dye = dbl(dw, dh); div = fbo(sw, sh); curlT = fbo(sw, sh); pres = dbl(sw, sh);
    }

    const blit = (target) => {
      if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); }
      else { gl.viewport(0, 0, canvas.width, canvas.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
    const use = (k) => { gl.useProgram(progs[k].p); return progs[k].u; };

    function splat(x, y, dx, dy, amount, r) {
      let u = use('splat');
      gl.uniform2f(u.texelSize, vel.read.tx, vel.read.ty);
      gl.uniform1i(u.uTarget, vel.read.bind(0));
      gl.uniform1f(u.aspect, aspect); gl.uniform2f(u.point, x, y);
      gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.radius, r);
      blit(vel.write); vel.swap();
      if (amount > 0) {
        gl.uniform1i(u.uTarget, dye.read.bind(0));
        gl.uniform3f(u.color, amount, 0, 0);
        blit(dye.write); dye.swap();
      }
    }

    let tt = 0;
    function step(dt) {
      tt += dt;
      // джерело: тонка цівка з чаші, що трохи «дихає» і хитається
      const s = getSrc();
      const breath = 0.75 + 0.25 * Math.sin(tt * 1.3) * Math.sin(tt * 0.37 + 1.1);
      const jx = (Math.random() - 0.5) * 0.0025;
      splat(s.x + jx, s.y, (Math.random() - 0.5) * 6 + Math.sin(tt * 0.8) * 3, P.EMIT_VEL * breath, P.EMIT_DYE * dt * 60 * 0.12 * breath, P.EMIT_R);

      let u = use('buoyancy');
      gl.uniform2f(u.texelSize, vel.read.tx, vel.read.ty);
      gl.uniform1i(u.uVelocity, vel.read.bind(0)); gl.uniform1i(u.uDye, dye.read.bind(1));
      gl.uniform1f(u.strength, P.BUOY); gl.uniform1f(u.dt, dt);
      blit(vel.write); vel.swap();

      u = use('curl'); gl.uniform2f(u.texelSize, vel.read.tx, vel.read.ty); gl.uniform1i(u.uVelocity, vel.read.bind(0)); blit(curlT);
      u = use('vorticity'); gl.uniform2f(u.texelSize, vel.read.tx, vel.read.ty);
      gl.uniform1i(u.uVelocity, vel.read.bind(0)); gl.uniform1i(u.uCurl, curlT.bind(1)); gl.uniform1f(u.curl, P.CURL); gl.uniform1f(u.dt, dt);
      blit(vel.write); vel.swap();
      u = use('divergence'); gl.uniform2f(u.texelSize, vel.read.tx, vel.read.ty); gl.uniform1i(u.uVelocity, vel.read.bind(0)); blit(div);
      u = use('clear'); gl.uniform2f(u.texelSize, vel.read.tx, vel.read.ty); gl.uniform1i(u.uTexture, pres.read.bind(0)); gl.uniform1f(u.value, P.PRESSURE); blit(pres.write); pres.swap();
      u = use('pressure'); gl.uniform2f(u.texelSize, vel.read.tx, vel.read.ty); gl.uniform1i(u.uDivergence, div.bind(0));
      for (let i = 0; i < P.ITER; i++) { gl.uniform1i(u.uPressure, pres.read.bind(1)); blit(pres.write); pres.swap(); }
      u = use('gradient'); gl.uniform2f(u.texelSize, vel.read.tx, vel.read.ty);
      gl.uniform1i(u.uPressure, pres.read.bind(0)); gl.uniform1i(u.uVelocity, vel.read.bind(1)); blit(vel.write); vel.swap();

      u = use('advect'); gl.uniform2f(u.texelSize, vel.read.tx, vel.read.ty);
      gl.uniform1i(u.uVelocity, vel.read.bind(0)); gl.uniform1i(u.uSource, vel.read.bind(0));
      gl.uniform1f(u.dt, dt); gl.uniform1f(u.dissipation, P.VEL_DISS); blit(vel.write); vel.swap();
      gl.uniform1i(u.uVelocity, vel.read.bind(0)); gl.uniform1i(u.uSource, dye.read.bind(1));
      gl.uniform1f(u.dissipation, P.DYE_DISS); blit(dye.write); dye.swap();
    }

    function render() {
      gl.disable(gl.BLEND);
      const u = use('display');
      gl.uniform2f(u.texelSize, 1 / canvas.width, 1 / canvas.height);
      gl.uniform2f(u.dyeTexel, dye.read.tx, dye.read.ty);
      gl.uniform1i(u.uTexture, dye.read.bind(0));
      gl.uniform1f(u.uAlpha, state.alpha);
      blit(null);
    }

    // курсор: рух повітря без додавання диму
    const mouse = { x: 0, y: 0, px: null, py: null };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
      if (mouse.px !== null) {
        const dx = (x - mouse.px) * 900, dy = (y - mouse.py) * 900;
        if (Math.abs(dx) + Math.abs(dy) > 0.5) splat(x, y, dx, dy, 0, 0.0025);
      }
      mouse.px = x; mouse.py = y;
    });
    hero.addEventListener('pointerleave', () => { mouse.px = mouse.py = null; });

    init();
    let warm = 240;   // «прогрів» розподілений по кадрах (не блокує сторінку) — до кінця прелоадера струмінь уже сформований

    let running = false, raf = 0, last = 0;
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000 || 1 / 60, 1 / 30) * P.SPEED; last = now;
      if (warm > 0) { for (let i = 0; i < 4; i++) step(P.SPEED / 60); warm -= 4; } else step(dt);
      render();
      raf = requestAnimationFrame(loop);
    };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }).observe(hero);
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { init(); warm = 120; }, 200); });
    return true;
  }

  function initSmoke() {
    const canvas = $('[data-smoke]');
    if (!canvas || reduce) return;
    const hero = $('[data-hero]');
    const img = $('[data-hero-img]');
    const IW = 2400, IH = 1167;                // hero.jpg
    const BOWL = { x: 0.617, y: 0.785 };       // верх чаші на фото (частки від розміру)

    // точка чаші в UV-координатах hero (0..1, y — вгору)
    const bowlUV = () => {
      const r = hero.getBoundingClientRect();
      const cs = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
      const ih = r.height * 1.12;
      const s = Math.max(r.width / IW, ih / IH);
      const ox = (r.width - IW * s) * (cs[0] ?? 0.5);
      const oy = (ih - IH * s) * (cs[1] ?? 0.5);
      return { x: (ox + BOWL.x * IW * s) / r.width, y: 1 - (oy + BOWL.y * IH * s) / r.height };
    };
    let srcUV = bowlUV();
    window.addEventListener('resize', () => (srcUV = bowlUV()));

    // 1) Справжня симуляція рідини (WebGL2)
    const fstate = { alpha: 0 };
    const fadeIn = () => gsap.to(fstate, { alpha: 1, duration: 2.5, ease: 'power2.out' });
    if (initFluidSmoke(canvas, hero, () => srcUV, fstate)) {
      window.addEventListener('hero:ready', fadeIn, { once: true });
      setTimeout(() => { if (fstate.alpha === 0) fadeIn(); }, 6000);
      return;
    }

    // 2) Fallback: процедурний шейдер (WebGL1)
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return initSmoke2D(canvas);
    const SCALE = Math.min(window.devicePixelRatio || 1, 2) * 0.75; // 75% роздільності — м'яко й без «сходинок»

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, SMOKE_FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return initSmoke2D(canvas);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['uRes', 'uTime', 'uSrc', 'uMouse', 'uWind', 'uAlpha'].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

    let W = 0, H = 0, src = [0, 0], running = false, raf = 0, t0 = performance.now();
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, vx: 0, wind: 0 };
    const state = { alpha: 0 };

    function resize() {
      const r = hero.getBoundingClientRect();
      W = Math.round(r.width * SCALE); H = Math.round(r.height * SCALE);
      canvas.width = W; canvas.height = H;
      gl.viewport(0, 0, W, H);
      // object-fit: cover + object-position → де на екрані чаша
      const cs = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
      const ih = r.height * 1.12;
      const s = Math.max(r.width / IW, ih / IH);
      const ox = (r.width - IW * s) * (cs[0] ?? 0.5);
      const oy = (ih - IH * s) * (cs[1] ?? 0.5);
      src = [(ox + BOWL.x * IW * s) * SCALE, (oy + BOWL.y * IH * s) * SCALE];
    }

    function frame(now) {
      const t = (now - t0) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      mouse.wind += (gsap.utils.clamp(-1.2, 1.2, mouse.vx * 0.04) - mouse.wind) * 0.03;
      mouse.vx *= 0.92;
      gl.uniform2f(U.uRes, W, H);
      gl.uniform1f(U.uTime, t);
      gl.uniform2f(U.uSrc, src[0], src[1]);
      gl.uniform2f(U.uMouse, mouse.x * SCALE, mouse.y * SCALE);
      gl.uniform1f(U.uWind, mouse.wind);
      gl.uniform1f(U.uAlpha, state.alpha);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }).observe(hero);

    let lastX = null;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
      if (mouse.x < -999) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
      if (lastX !== null) mouse.vx += e.clientX - lastX;
      lastX = e.clientX;
    });
    hero.addEventListener('pointerleave', () => { mouse.tx = mouse.ty = -9999; mouse.x = mouse.y = -9999; lastX = null; });

    resize();
    window.addEventListener('resize', resize);
    // дим «розгоряється» після інтро
    window.addEventListener('hero:ready', () => gsap.to(state, { alpha: 1, duration: 3, ease: 'power2.out' }), { once: true });
    setTimeout(() => { if (state.alpha === 0) gsap.to(state, { alpha: 1, duration: 3 }); }, 6000);
  }

  // Fallback без WebGL — м'які частинки
  function initSmoke2D(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const hero = $('[data-hero]');
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, src = { x: 0, y: 0 }, raf = 0, t = 0;
    const parts = [];
    const sprite = d.createElement('canvas');
    sprite.width = sprite.height = 128;
    const sg = sprite.getContext('2d');
    const g = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(235,228,220,.6)'); g.addColorStop(0.5, 'rgba(220,212,204,.18)'); g.addColorStop(1, 'rgba(220,212,204,0)');
    sg.fillStyle = g; sg.fillRect(0, 0, 128, 128);
    function resize() {
      const r = hero.getBoundingClientRect(); w = r.width; h = r.height;
      canvas.width = w * DPR; canvas.height = h * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      src = { x: w * 0.617, y: h * 0.78 };
    }
    function tick() {
      t++;
      if (t % 2 === 0 && parts.length < 160) parts.push({ x: src.x, y: src.y, vx: Math.random() * 0.3, vy: -(0.5 + Math.random() * 0.5), r: 10, life: 0, max: 300 + Math.random() * 150, s: Math.random() * 1000 });
      ctx.clearRect(0, 0, w, h);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life++;
        p.vx += Math.sin((p.y + p.s) * 0.015 + t * 0.012) * 0.015 + 0.004;
        p.x += p.vx; p.y += p.vy; p.r += 0.4;
        const k = p.life / p.max;
        if (k >= 1) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.sin(Math.PI * k) * 0.3;
        ctx.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      raf = requestAnimationFrame(tick);
    }
    resize(); window.addEventListener('resize', resize); tick();
  }

  function heroScroll() {
    if (reduce) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } });
    tl.to(['[data-hero-img]', '[data-smoke]'], { y: () => innerHeight * 0.12, ease: 'none' }, 0)
      .to('.hero__title', { y: -60, ease: 'none' }, 0)
      .to('.hero__ghost--1', { y: -140, ease: 'none' }, 0)
      .to('.hero__ghost--2', { y: -90, x: 40, ease: 'none' }, 0)
      .to('.hero__ghost--3', { y: -200, ease: 'none' }, 0)
      .to('.hero__content', { opacity: 0.15, ease: 'none' }, 0);
  }

  /* ---------------------------------------------------------
     Cursor + magnetic
     --------------------------------------------------------- */
  function initCursor() {
    if (touch) return;
    const c = $('.cursor');
    const label = $('.cursor__label');
    const xTo = gsap.quickTo(c, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(c, 'y', { duration: 0.5, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); });

    d.addEventListener('pointerover', (e) => {
      const lbl = e.target.closest('[data-cursor]');
      if (lbl) { c.classList.add('is-label'); label.textContent = lbl.dataset.cursor; return; }
      if (e.target.closest('a, button, label, [data-hover]')) c.classList.add('is-hover');
    });
    d.addEventListener('pointerout', (e) => {
      if (e.target.closest('[data-cursor]')) c.classList.remove('is-label');
      if (e.target.closest('a, button, label, [data-hover]')) c.classList.remove('is-hover');
    });
  }

  function initMagnetic() {
    if (touch || reduce) return;
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------------------------------------------------------
     Header behaviour
     --------------------------------------------------------- */
  function initHeader() {
    const header = $('[data-header]');
    let last = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        header.classList.toggle('is-scrolled', y > 40);
        const menuOpen = $('[data-menu]')?.classList.contains('is-open');
        header.classList.toggle('is-hidden', !menuOpen && y > 400 && y > last);
        last = y;
      },
    });
  }

  /* ---------------------------------------------------------
     Generic reveals
     --------------------------------------------------------- */
  function initReveals() {
    if (reduce) {
      gsap.set('[data-fade]', { opacity: 1, y: 0 });
      return;
    }

    // поява стартує, щойно елемент заходить в екран (раніше — на 12% вище), щоб не було «порожніх» екранів
    ScrollTrigger.batch('[data-fade]', {
      start: 'top 100%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, stagger: 0.08, duration: 1.2 }),
    });

    $$('[data-lines]').forEach((el) => {
      const lines = splitLines(el);
      gsap.set(lines, { yPercent: 110 });
      ScrollTrigger.create({
        trigger: el, start: 'top 98%', once: true,
        onEnter: () => gsap.to(lines, { yPercent: 0, duration: 1.2, stagger: 0.08 }),
      });
    });

    // manifesto — слова «проявляються» за скролом
    const man = $('[data-words]');
    if (man) {
      const words = splitWords(man);
      gsap.to(words, {
        opacity: 1, stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: man, start: 'top 75%', end: 'bottom 45%', scrub: true },
      });
    }

    // parallax всередині рамок
    $$('[data-parallax]').forEach((img) => {
      const k = parseFloat(img.dataset.parallax) || 0.1;
      gsap.fromTo(img, { y: 0, yPercent: -k * 100 }, {
        yPercent: k * 50, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // фото майстра — шторка
    const frame = $('.about__frame');
    if (frame) {
      gsap.fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut',
        scrollTrigger: { trigger: frame, start: 'top 80%', once: true },
      });
    }

    // роботи — шторки + легкий зсув
    $$('[data-work]').forEach((w, i) => {
      const box = $('.work__img', w);
      gsap.set(box, { '--cover': 1 });
      gsap.to(box, {
        '--cover': 0, duration: 1.4, ease: 'expo.inOut', delay: (i % 2) * 0.12,
        scrollTrigger: { trigger: w, start: 'top 85%', once: true },
      });
    });

    // лічильники
    $$('[data-counter]').forEach((el) => {
      const to = +el.dataset.counter;
      const from = to === 0 ? 100 : 0;
      const o = { v: from };
      el.textContent = from;
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: to, duration: to === 0 ? 2.2 : 1.8, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)) }),
      });
    });

    // футер — гравюра калабаша «випливає» за скролом
    const pipe = $('[data-footer-pipe]');
    if (pipe && !reduce) {
      gsap.fromTo(pipe, { y: 90, rotation: -16 }, {
        y: -10, rotation: -6, ease: 'none',
        scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.8 },
      });
    }

    // футер — бігучий рядок: базовий темп + прискорення від швидкості скролу, потім плавно назад
    const ftrack = $('.footer__track');
    if (ftrack && !reduce) {
      ftrack.classList.add('is-gsap');
      const loop = gsap.to(ftrack, { xPercent: -50, duration: 22, ease: 'none', repeat: -1 });   // ≈130 px/с на 1440 — фраза читається, не чекаєш
      let boost = 0;
      ScrollTrigger.create({
        trigger: '.footer', start: 'top bottom', end: 'bottom top',
        onUpdate: (self) => { boost = Math.min(Math.abs(self.getVelocity()) / 500, 5); },
      });
      gsap.ticker.add(() => {
        boost *= 0.92;                                   // згасання прискорення
        loop.timeScale(1 + boost);
      });
    }
  }

  /* ---------------------------------------------------------
     Ornament — вишивка «хрестиком», що прошивається за скролом
     --------------------------------------------------------- */
  function initOrnament() {
    const host = $('[data-ornament]');
    if (!host) return;
    // Раппорт вишивки з add-materials/вишивка.svg (30×35 клітинок): r — червона нитка, k — темна (на сайті — світла)
    const TILE = [
      'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
      'r.r.r.r.r.r.r.r.r.r.r.r.r.r.r.',
      '..............................',
      'r.r.k.rrrr....k....rrrr.k.r.rr',
      'r.rr....kr...k.k...rk....rr.rk',
      '..rrr.rr.r..k...k..r.rr.rrr..r',
      'rr....kr.r.k.r.r.k.r.rk....rrr',
      '.kk.rr....k.krkrk.k....rr.kk.r',
      '.kkk.r...k...r.r...k...r.kkk.r',
      '..k.rr..k..r.....r..k..rr.k..r',
      '.r.rr..k.r.rr...rr.r.k..rr.r..',
      '.rrr..k.rk.rrr.rrr.kr.k..rrr.k',
      'k....k.rkk.rrr.rrr.kkr.k....kk',
      'k...k......rrr.rrr......k...kr',
      'kk.k..rrrrr.rr.rr.rrrrr..k.kk.',
      '..k....rrrrr.r.r.rrrrr....k..r',
      'r.kkk...rrrrr.k.rrrrr...kkk.rr',
      'rr.rkk.......krk.......kkr.rr.',
      'r.kkk...rrrrr.k.rrrrr...kkk.rr',
      '..k....rrrrr.r.r.rrrrr....k..r',
      'kk.k..rrrrr.rr.rr.rrrrr..k.kk.',
      'k...k......rrr.rrr......k...kr',
      'k....k.rkk.rrr.rrr.kkr.k....kk',
      '.rrr..k.rk.rrr.rrr.kr.k..rrr.k',
      '.r.rr..k.r.rr...rr.r.k..rr.r..',
      '..k.rr..k..r.....r..k..rr.k..r',
      '.kkk.r...k...r.r...k...r.kkk.r',
      '.kk.rr....k.krrrk.k....rr.kk.r',
      'rr....kr.r.k.r.r.k.r.rk....rr.',
      '..rrr.rr.r..k...k..r.rr.rrr...',
      'r.rr....kr...k.k...rk....rr.r.',
      'r.r.k.rrrr....k....rrrr.k.r.r.',
      '..............................',
      'r.r.r.r.r.r.r.r.r.r.r.r.r.r.r.',
      'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrr'
    ];
    const C = 10, P = 2, REPEAT = 8, BAND = 3;   // клітинка, відступ хрестика, кількість раппортів, ширина «смуги» анімації
    const W = TILE[0].length;
    const groups = new Map();

    const stitch = (cx, cy) => {
      const x = cx * C, y = cy * C;
      return `M${x + P} ${y + P}L${x + C - P} ${y + C - P}M${x + C - P} ${y + P}L${x + P} ${y + C - P}`;
    };

    for (let t = 0; t < REPEAT; t++) {
      TILE.forEach((row, y) => {
        [...row].forEach((ch, x) => {
          if (ch === '.') return;
          const gx = t * W + x;
          const key = `${Math.floor(gx / BAND)}-${ch}`;
          groups.set(key, (groups.get(key) || '') + stitch(gx, y));
        });
      });
    }

    const VW = REPEAT * W * C, VH = TILE.length * C;
    const paths = [...groups.entries()]
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([k, dd]) => `<path class="st${k.endsWith('r') ? ' st--accent' : ''}" d="${dd}"/>`)
      .join('');
    host.innerHTML = `<svg viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMinYMid meet">${paths}</svg>`;

    const svg = $('svg', host);
    const items = $$('path', svg);
    if (reduce) return;

    gsap.set(items, { opacity: 0 });
    gsap.to(items, {
      opacity: (i, el) => (el.classList.contains('st--accent') ? 0.95 : 0.5),
      stagger: { each: 0.03 },
      ease: 'none',
      scrollTrigger: { trigger: host, start: 'top 85%', end: 'bottom 25%', scrub: 0.6 },
    });
    gsap.fromTo(svg, { x: 0 }, {
      x: () => -(svg.getBoundingClientRect().width - innerWidth) * 0.4, ease: 'none',
      scrollTrigger: { trigger: '.heritage', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  /* ---------------------------------------------------------
     Ritual — кадр розкривається, цитата проявляється
     --------------------------------------------------------- */
  function initRitual() {
    const sec = $('[data-ritual]');
    if (!sec) return;
    const words = splitWords($('[data-ritual-words]', sec));
    if (reduce) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px)', () => {
      const media = $('[data-ritual-media]', sec);
      const content = $('.ritual__content', sec);
      // М'яка фіксація: без різкої зупинки на старті sticky і різкого старту на виході.
      // Вхід: кадр відстає від секції (зміщений угору на 20svh → 0, power4.in) — гальмує до ~0 саме в момент фіксації.
      // 20svh — максимум, при якому картка (inset 22%) не виходить за верх секції.
      gsap.fromTo(media, { yPercent: -20 }, {
        yPercent: 0, ease: 'power4.in',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: 0.8 },
      });
      // Вихід: дзеркально — кадр і цитата спершу майже стоять, потім плавно набирають швидкість (power4.out)
      gsap.to([media, content], {
        y: () => window.innerHeight * 0.22, ease: 'power4.out',
        scrollTrigger: { trigger: sec, start: 'bottom bottom', end: 'bottom top', scrub: 0.8, invalidateOnRefresh: true },
      });
      const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.8 } });
      tl.to('[data-ritual-media]', { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 1 }, 0)
        .to('[data-ritual-img]', { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
        .to('[data-ritual-media]', { '--shade': 1, ease: 'none', duration: 0.5 }, 0.5)
        .from(content, { opacity: 0, ease: 'none', duration: 0.3 }, 0.3)   // до фіксації блідий текст не висить під карткою
        .from('.ritual__content .eyebrow', { opacity: 0, y: 20, duration: 0.2 }, 0.55)
        .to(words, { opacity: 1, stagger: 0.04, ease: 'none', duration: 0.1 }, 0.6);
    });
  }

  /* ---------------------------------------------------------
     Process — горизонтальний pin (desktop)
     --------------------------------------------------------- */
  function initProcess() {
    if (reduce) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1025px)', () => {
      const section = $('[data-process]');
      const track = $('[data-process-track]');
      const bar = $('[data-process-bar]');
      const dist = () => track.scrollWidth - innerWidth;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section, start: 'top top', end: () => '+=' + dist(),
          pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        },
      });
      tl.to(track, { x: () => -dist(), ease: 'none' }, 0)
        .to(bar, { scaleX: 1, ease: 'none' }, 0);
      $$('.step', track).forEach((s) => {
        gsap.from(s, {
          opacity: 0.25, y: 40, ease: 'power2.out',
          scrollTrigger: { trigger: s, containerAnimation: tl, start: 'left 95%', end: 'left 60%', scrub: true },
        });
      });
    });
  }

  /* ---------------------------------------------------------
     Gift — розкриття кадру
     --------------------------------------------------------- */
  function initGift() {
    if (reduce) return;
    // кадр завжди на всю ширину; глибина — лише вертикальним паралаксом (у межах запасу висоти img)
    const mm = gsap.matchMedia();
    mm.add({ desk: '(min-width: 1201px)', mob: '(max-width: 1200px)' }, (ctx) => {
      // десктоп: ±44px у межах запасу кадру (CSS: висота = секція + 96px); мобільний: ±8.5% висоти img
      const from = ctx.conditions.desk ? { y: -44 } : { yPercent: -8.5 };
      const to = ctx.conditions.desk ? { y: 44 } : { yPercent: 8.5 };
      gsap.fromTo('[data-gift-img]', from, {
        ...to, ease: 'none',
        scrollTrigger: { trigger: '[data-gift]', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  initMenu(lenis);
  initCursor();
  initMagnetic();
  initHeader();
  initSmoke();
  initGhosts();
  initMarquee();
  initConfigurator(lenis);
  initForm();
  initViewer(lenis);

  preloader().then(() => {
    heroIntro();
    // pin «Процесу» створюємо ПЕРШИМ: його pin-spacer зсуває все, що нижче (Ритуал, Конфігуратор…).
    // Інакше тригери, створені раніше, рахуються без цього зсуву й спрацьовують на ~1.7 екрана зарано.
    initProcess();
    initReveals();
    initOrnament();
    initRitual();
    initGift();
    heroScroll();
    ScrollTrigger.sort();     // порядок перерахунку = порядок на сторінці
    ScrollTrigger.refresh();
  });

  /* =========================================================
     Shared (працюють і без GSAP)
     ========================================================= */
  function initMenu(lenisRef) {
    const btn = $('[data-burger]');
    const menu = $('[data-menu]');
    if (!btn || !menu) return;
    const set = (open) => {
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', !open);
      open ? lenisRef?.stop() : lenisRef?.start();
      if (open && window.gsap && !reduce) gsap.fromTo($$('a', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, delay: 0.25, duration: 1 });
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
  }

  function initMarquee() {
    $$('[data-marquee] [data-marquee-track]').forEach((track) => {
      if (track.dataset.cloned) return;
      track.dataset.cloned = '1';
      [...track.children].forEach((c) => { const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); track.appendChild(k); });
    });
  }

  /* ---------------------------------------------------------
     Viewer — один слайдер для всіх робіт.
     Дані: <script type="application/json" id="works-data"> (title, material, description, photos[]).
     Картка [data-work="i"] відкриває роботу works[i].
     --------------------------------------------------------- */
  function initViewer(lenisRef) {
    const box = $('[data-viewer]');
    const dataEl = $('#works-data');
    if (!box || !dataEl) return;
    let works;
    try { works = JSON.parse(dataEl.textContent); } catch (err) { console.error('works-data: невалідний JSON', err); return; }

    const stage = $('[data-viewer-stage]', box);
    const ui = {
      num: $('[data-viewer-num]', box), material: $('[data-viewer-material]', box), title: $('[data-viewer-title]', box),
      desc: $('[data-viewer-desc]', box), cur: $('[data-viewer-current]', box), total: $('[data-viewer-total]', box),
      bar: $('[data-viewer-bar]', box), prev: $('[data-viewer-prev]', box), next: $('[data-viewer-next]', box), close: $('[data-viewer-close]', box),
    };
    const pad = (n) => String(n).padStart(2, '0');
    let slides = [], index = 0, lastFocus = null, hideTimer = 0;

    // картки: кількість фото й aria — з даних
    $$('[data-work]').forEach((card) => {
      const i = +card.dataset.work;
      const w = works[i];
      const btn = $('.work__open', card);
      if (!w || !btn) return;
      const n = w.photos.length;
      const cnt = $('[data-work-count]', card);
      if (cnt) cnt.textContent = `${n} фото`;
      btn.setAttribute('aria-label', `Відкрити роботу ${pad(i + 1)} «${w.title}» — ${n} фото`);
      btn.addEventListener('click', () => open(i, btn));
    });

    const load = (i) => { const img = $('img', slides[(i + slides.length) % slides.length]); if (img && !img.src) img.src = img.dataset.src; };

    function build(w) {
      stage.innerHTML = '';
      slides = w.photos.map((ph, k) => {
        const fig = d.createElement('figure');
        fig.className = 'viewer__slide';
        fig.setAttribute('aria-hidden', 'true');
        const img = d.createElement('img');
        img.alt = ph.alt || `${w.title} — фото ${k + 1}`;
        img.decoding = 'async';
        img.draggable = false;
        img.dataset.src = ph.src;
        fig.appendChild(img);
        stage.appendChild(fig);
        return fig;
      });
    }

    function show(i, dir = 0) {
      const n = slides.length;
      const next = (i + n) % n;
      const out = slides[index];
      const inc = slides[next];
      load(next); load(next + 1); load(next - 1);
      if (out && out !== inc) {
        out.style.setProperty('--x', `${-dir * 6}%`);
        out.classList.remove('is-active');
        out.setAttribute('aria-hidden', 'true');
      }
      // вхідний слайд ставимо з боку руху без анімації, далі — плавно в центр
      inc.classList.add('is-instant');
      inc.style.setProperty('--x', `${dir * 6}%`);
      void inc.offsetWidth;
      inc.classList.remove('is-instant');
      inc.style.removeProperty('--x');
      inc.classList.add('is-active');
      inc.removeAttribute('aria-hidden');
      index = next;
      ui.cur.textContent = pad(index + 1);
      ui.bar.style.setProperty('--p', (index + 1) / n);
    }

    function open(i, trigger) {
      const w = works[i];
      if (!w || !w.photos?.length) return;
      clearTimeout(hideTimer);
      lastFocus = trigger || d.activeElement;
      ui.num.textContent = pad(i + 1);
      ui.material.textContent = w.material || '';
      ui.title.textContent = w.title || '';
      ui.desc.textContent = w.description || '';
      ui.total.textContent = pad(w.photos.length);
      const single = w.photos.length < 2;
      ui.prev.hidden = ui.next.hidden = single;
      build(w);
      index = 0;
      show(0);
      // блокування скролу сторінки під модалкою
      root.style.setProperty('--sbw', `${innerWidth - root.clientWidth}px`);
      root.classList.add('is-locked');
      lenisRef?.stop();
      box.hidden = false;
      // фокус — коли модалка вже видима (visibility: hidden не приймає фокус)
      requestAnimationFrame(() => { box.classList.add('is-open'); ui.close.focus({ preventScroll: true }); });
    }

    function close() {
      if (box.hidden) return;
      box.classList.remove('is-open');
      root.classList.remove('is-locked');
      lenisRef?.start();
      hideTimer = setTimeout(() => { box.hidden = true; stage.innerHTML = ''; slides = []; }, reduce ? 0 : 500);
      lastFocus?.focus({ preventScroll: true });
    }

    const go = (dir) => { if (slides.length > 1) show(index + dir, dir); };
    ui.prev.addEventListener('click', () => go(-1));
    ui.next.addEventListener('click', () => go(1));
    ui.close.addEventListener('click', close);

    // клавіатура: Esc, стрілки, фокус не виходить за межі модалки
    d.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Tab') {
        const f = $$('button:not([hidden])', box);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!box.contains(d.activeElement)) { e.preventDefault(); first.focus(); }
      }
    });

    // свайп / drag + клік поза фото — закриття
    let x0 = null, dx = 0, pid = null;
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      x0 = e.clientX; dx = 0; pid = e.pointerId;
    });
    stage.addEventListener('pointermove', (e) => {
      if (x0 === null || e.pointerId !== pid) return;
      dx = e.clientX - x0;
      if (Math.abs(dx) > 6 && slides.length > 1) {
        if (!stage.classList.contains('is-dragging')) { stage.classList.add('is-dragging'); stage.setPointerCapture(pid); }
        slides[index].style.setProperty('--x', `${dx}px`);
      }
    });
    const end = (e) => {
      if (x0 === null) return;
      const moved = Math.abs(dx);
      const onImg = e.target.closest('img');
      stage.classList.remove('is-dragging');
      if (stage.hasPointerCapture?.(pid)) stage.releasePointerCapture(pid);
      x0 = null;
      if (moved > 60 && slides.length > 1) { go(dx < 0 ? 1 : -1); return; }
      slides[index]?.style.removeProperty('--x');
      if (moved < 6 && !onImg && e.type === 'pointerup') close();
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
  }

  function initConfigurator(lenisRef) {
    const wrap = $('[data-config]');
    if (!wrap) return;
    const BASE = 1500, BASE_DAYS = 7;
    const tabs = $$('[data-tab]', wrap);
    const panels = $$('[data-panel]', wrap);
    const prev = $('[data-config-prev]', wrap);
    const next = $('[data-config-next]', wrap);
    const img = $('[data-summary-img]', wrap);
    const wood = $('[data-summary-wood]', wrap);
    const priceEl = $('[data-sum-price]', wrap);
    const daysEl = $('[data-sum-days]', wrap);
    const order = ['form', 'material', 'size', 'extras'];
    const MULTI = { extras: 'Без доповнень' };   // кроки з множинним вибором (checkbox) → текст, коли нічого не обрано
    let current = 0;
    let shownPrice = BASE;

    const state = () => {
      const s = {};
      order.forEach((k) => (s[k] = k in MULTI ? $$(`input[name="${k}"]:checked`, wrap) : $(`input[name="${k}"]:checked`, wrap)));
      return s;
    };

    function go(i) {
      current = Math.max(0, Math.min(order.length - 1, i));
      tabs.forEach((t, k) => { t.classList.toggle('is-active', k === current); t.setAttribute('aria-selected', k === current); });
      panels.forEach((p) => {
        const on = p.dataset.panel === order[current];
        p.hidden = false;
        p.classList.toggle('is-active', on);
        p.toggleAttribute('inert', !on);
        p.setAttribute('aria-hidden', String(!on));
        if (on && window.gsap && !reduce) gsap.fromTo($$('.opt', p), { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.9 });
      });
      prev.disabled = current === 0;
      // кнопка називає наступний крок — видно, що вибір ще не завершено
      const last = current === order.length - 1;
      const label = (t) => [...t.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      $('.config__next-label', next).textContent = last ? 'До замовлення' : `Далі: ${label(tabs[current + 1])}`;
      // на останньому кроці дія одна — «Замовити цю люльку» у підсумку; кнопку «Далі» ховаємо
      next.hidden = last;
      const stepEl = $('[data-config-step]', wrap);
      if (stepEl) stepEl.textContent = String(current + 1).padStart(2, '0');
    }

    function update(changed) {
      const s = state();
      let price = BASE, days = BASE_DAYS;
      order.forEach((k) => {
        const list = k in MULTI ? s[k] : (s[k] ? [s[k]] : []);
        if (!(k in MULTI) && !list.length) return;
        list.forEach((inp) => { price += +inp.dataset.price || 0; days += +inp.dataset.days || 0; });
        const text = list.length ? list.map((inp) => inp.value).join(', ') : MULTI[k];
        const dd = $(`[data-sum="${k}"]`, wrap);
        if (dd.textContent !== text) {
          dd.textContent = text;
          if (window.gsap && !reduce) gsap.fromTo(dd, { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.6 });
        }
      });
      if (window.gsap && !reduce) {
        const o = { v: shownPrice };
        gsap.to(o, { v: price, duration: 0.8, ease: 'power3.out', onUpdate: () => (priceEl.textContent = Math.round(o.v)) });
      } else priceEl.textContent = price;
      shownPrice = price;
      daysEl.textContent = days;

      if (changed === 'material' && s.material && wood) {
        if (window.gsap && !reduce) {
          gsap.timeline()
            .to(wood, { opacity: 0, duration: 0.3, onComplete: () => (wood.src = s.material.dataset.wood) })
            .to(wood, { opacity: 0.32, duration: 0.8 });
        } else wood.src = s.material.dataset.wood;
      }
      if (changed === 'form' && s.form) {
        if (window.gsap && !reduce) {
          gsap.timeline()
            .to(img, { x: -40, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => (img.src = s.form.dataset.img) })
            .fromTo(img, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8 });
        } else img.src = s.form.dataset.img;
      }
      tabs[order.indexOf(changed)]?.classList.add('is-done');
      // після вибору — м'який «поштовх» кнопки «Далі», щоб не пропустили наступні кроки
      // на останньому кроці «поштовх» отримує кнопка замовлення в підсумку
      if (changed && !reduce) { const t = next.hidden ? $('[data-order]', wrap) : next; t.classList.remove('is-nudge'); void t.offsetWidth; t.classList.add('is-nudge'); }
    }

    tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
    prev.addEventListener('click', () => go(current - 1));
    next.addEventListener('click', () => {
      if (current === order.length - 1) $('[data-order]', wrap).click();
      else go(current + 1);
    });
    wrap.addEventListener('change', (e) => {
      if (!e.target.matches('input[type="radio"], input[type="checkbox"]')) return;
      update(e.target.name);
    });

    const msg = $('[data-form-msg]');
    const fill = (text) => {
      if (!msg) return;
      msg.value = text;
      msg.dispatchEvent(new Event('input'));
    };
    $('[data-order]', wrap).addEventListener('click', () => {
      const s = state();
      fill(`Хочу замовити люльку:\n— форма: ${s.form.value}\n— матеріал: ${s.material.value}\n— розмір: ${s.size.value}\n— додатково: ${s.extras.length ? s.extras.map((i) => i.value).join(', ') : 'без доповнень'}\nОрієнтовна ціна: ${priceEl.textContent} грн.`);
      setTimeout(() => $('#f-name')?.focus({ preventScroll: true }), 1400);
    });
    $('[data-gift-order]')?.addEventListener('click', () => fill('Хочу люльку на подарунок. Підкажи, будь ласка, з вибором і пакуванням.'));

    update();
    go(0);
  }

  function initForm() {
    const form = $('[data-form]');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      $$('input[required]', form).forEach((i) => {
        const bad = !i.value.trim();
        i.closest('.field').classList.toggle('is-error', bad);
        if (bad) ok = false;
      });
      if (!ok) return;
      // TODO WordPress: замінити на Contact Form 7 / admin-ajax / REST endpoint
      const done = $('.form__success', form);
      done.hidden = false;
      if (window.gsap && !reduce) gsap.from(done.children, { y: 24, opacity: 0, stagger: 0.1, duration: 1 });
      form.reset();
      grow();
      limit();
    });
    $$('input', form).forEach((i) => i.addEventListener('input', () => i.closest('.field').classList.remove('is-error')));
    // повідомлення: висота під текст (фолбек для браузерів без field-sizing), без скролу
    const ta = $('textarea', form);
    const hint = $('#f-msg-limit', form);
    const grow = () => { if (!ta) return; ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight + 2}px`; };
    // ліміт: повідомлення, коли текст досяг 1000 символів або вставили довший фрагмент (maxlength його обрізав)
    let cut = false;
    const limit = () => { if (!ta || !hint) return; const max = ta.maxLength; hint.hidden = !(cut || (max > 0 && ta.value.length >= max)); cut = false; };
    ta?.addEventListener('paste', (e) => {
      const add = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      const sel = ta.selectionEnd - ta.selectionStart;
      if (ta.value.length - sel + add.length > ta.maxLength) cut = true;
    });
    ta?.addEventListener('input', () => { grow(); limit(); });
    grow();
  }
})();
