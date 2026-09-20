/* Chlorophyll Field: dependency-free WebGL backdrop. */
(() => {
  const canvas = document.getElementById('chlorophyll-field');
  if (!canvas) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', {alpha: true, antialias: false, depth: false, powerPreference: 'low-power'});
  if (!gl) { document.documentElement.classList.add('no-webgl'); return; }

  const vertexSource = `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragmentSource = `
    precision highp float;
    uniform vec2 resolution,pointer;
    uniform float time,scroll;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.52;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(1.62,1.18,-1.18,1.62)*p;a*=.48;}return v;}
    void main(){
      vec2 uv=gl_FragCoord.xy/resolution.xy,p=uv-.5;p.x*=resolution.x/resolution.y;
      float slow=time*.055;vec2 drift=vec2(slow,scroll*.00008);
      float cloud=fbm(p*2.+drift),detail=fbm(p*5.2-drift*1.7+cloud*.45);
      vec2 mouse=pointer-.5;mouse.x*=resolution.x/resolution.y;
      float halo=exp(-3.1*length(p-mouse));
      float river=.5+.5*sin((p.x*1.8+p.y*1.2+cloud)*4.2-slow*2.);
      float energy=smoothstep(.26,.74,cloud*.68+detail*.44+halo*.24);
      vec3 light=mix(vec3(.015,.028,.021),vec3(.12,.30,.13),energy*.84);
      light+=vec3(.61,.92,.25)*energy*river*.30+vec3(.18,.34,.12)*halo*.12;
      float vignette=smoothstep(.98,.2,length(p*vec2(.72,.9)));
      float grain=(hash(gl_FragCoord.xy+time)-.5)*.018;
      gl_FragColor=vec4((light+grain)*vignette,.92);
    }`;

  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
  try {
    const program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexSource));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentSource));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const uniforms={resolution:gl.getUniformLocation(program,'resolution'),pointer:gl.getUniformLocation(program,'pointer'),time:gl.getUniformLocation(program,'time'),scroll:gl.getUniformLocation(program,'scroll')};
    const state={x:.72,y:.28,tx:.72,ty:.28,frame:0,visible:true};
    const resize=()=>{const dpr=Math.min(devicePixelRatio||1,1.5),width=Math.max(1,Math.round(innerWidth*dpr)),height=Math.max(1,Math.round(innerHeight*dpr));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}};
    const render=(now=0)=>{state.frame=0;if(!state.visible)return;resize();state.x+=(state.tx-state.x)*.045;state.y+=(state.ty-state.y)*.045;gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform2f(uniforms.pointer,state.x,state.y);gl.uniform1f(uniforms.time,reduceMotion?0:now*.001);gl.uniform1f(uniforms.scroll,scrollY);gl.drawArrays(gl.TRIANGLES,0,3);if(!reduceMotion)state.frame=requestAnimationFrame(render);};
    const wake=()=>{if(!state.frame&&state.visible&&!reduceMotion)state.frame=requestAnimationFrame(render);if(reduceMotion)render(0);};
    addEventListener('pointermove',event=>{state.tx=event.clientX/innerWidth;state.ty=1-event.clientY/innerHeight;document.documentElement.style.setProperty('--pointer-x',`${event.clientX/innerWidth*100}%`);document.documentElement.style.setProperty('--pointer-y',`${event.clientY/innerHeight*100}%`);},{passive:true});
    addEventListener('resize',wake,{passive:true});
    document.addEventListener('visibilitychange',()=>{state.visible=!document.hidden;if(!state.visible&&state.frame)cancelAnimationFrame(state.frame);if(state.visible)wake();});
    wake();
  } catch(error) { document.documentElement.classList.add('no-webgl'); canvas.hidden=true; }
})();
