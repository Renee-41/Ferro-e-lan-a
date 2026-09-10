# Ferro & Lança — patch idempotente da abertura experimental.
from pathlib import Path

path = Path("js/game.js")
js = path.read_text(encoding="utf-8")
changed = False

old_comment = """  // pula direto pro clímax (nome do jogo + Press Start) — usado pelo atalho de Espaço
  // e também por tocar/clicar na tela (bom pra quem tá no celular).
"""
new_comment = """  // Pula direto pro clímax (nome do jogo + Press Start).
  // Agora isso só é acionado pelo botão explícito \"Pular\".
"""
if old_comment in js:
    js = js.replace(old_comment, new_comment, 1)
    changed = True

old_controls = """  document.addEventListener('keydown', (e)=>{
    if(e.code !== 'Space' && e.key !== ' ') return;
    if(introEnded || titleTriggered) return;
    e.preventDefault();
    skipToClimax();
  });
  if(preshow){
    preshow.addEventListener('click', (e)=>{
      if(e.target.id === 'intro-volume-slider') return; // não pula se for só ajustando o volume
      skipToClimax();
    });
  }
"""
new_controls = """  if(preshow){
    const skipIntroBtn = document.createElement('button');
    skipIntroBtn.id = 'intro-skip-btn';
    skipIntroBtn.type = 'button';
    skipIntroBtn.textContent = 'Pular';
    skipIntroBtn.setAttribute('aria-label','Pular introdução');
    preshow.appendChild(skipIntroBtn);
    skipIntroBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      tryPlayAudio();
      skipToClimax();
    });
  }
"""
if old_controls in js:
    js = js.replace(old_controls, new_controls, 1)
    changed = True
elif "skipIntroBtn.id = 'intro-skip-btn'" not in js:
    raise SystemExit("Bloco antigo de clique/Space da intro não encontrado.")

old_decode_callback = """        audioBuffer = buffer;
        webAudioReady = true;
        if(audioUnlockRequested) startWebAudioAt(currentIntroElapsed());
"""
new_decode_callback = """        audioBuffer = buffer;
        webAudioReady = true;
        if(audioUnlockRequested) tryPlayAudio();
"""
if old_decode_callback in js:
    js = js.replace(old_decode_callback, new_decode_callback, 1)
    changed = True
elif "if(audioUnlockRequested) tryPlayAudio();" not in js:
    raise SystemExit("Callback de decodeAudioData esperado não encontrado.")

old_start = """  function startWebAudioAt(offsetSeconds){
    if(!audioCtx || !audioBuffer) return false;
    if(audioCtx.state === 'suspended'){ audioCtx.resume().catch(()=>{}); }
    try{ if(sourceNode){ sourceNode.onended = null; sourceNode.stop(); } }catch(e){}
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(gainNode);
    const safeOffset = Math.max(0, Math.min(offsetSeconds, audioBuffer.duration - 0.05));
    try{ sourceNode.start(0, safeOffset); }catch(e){ return false; }
    audioIsPlaying = true;
    if(soundHint) soundHint.style.opacity = '0';
    return true;
  }
"""
new_start = """  function startWebAudioAt(offsetSeconds){
    if(!audioCtx || !audioBuffer || audioCtx.state !== 'running') return false;
    try{ if(sourceNode){ sourceNode.onended = null; sourceNode.stop(); } }catch(e){}
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(gainNode);
    const safeOffset = Math.max(0, Math.min(offsetSeconds, audioBuffer.duration - 0.05));
    try{ sourceNode.start(0, safeOffset); }catch(e){ return false; }
    audioIsPlaying = true;
    if(soundHint) soundHint.style.opacity = '0';
    return true;
  }
"""
if old_start in js:
    js = js.replace(old_start, new_start, 1)
    changed = True
elif "if(!audioCtx || !audioBuffer || audioCtx.state !== 'running') return false;" not in js:
    raise SystemExit("startWebAudioAt esperado não encontrado.")

old_try = """  function tryPlayAudio(){
    audioUnlockRequested = true;
    if(audioIsPlaying) return;
    if(!decodingStarted){ initWebAudio(); return; } // começa a tocar sozinho assim que terminar de decodificar
    if(webAudioReady){ startWebAudioAt(currentIntroElapsed()); }
    else if(audioCtx && audioCtx.state === 'suspended'){ audioCtx.resume().catch(()=>{}); }
  }
"""
new_try = """  function tryPlayAudio(){
    audioUnlockRequested = true;
    if(audioIsPlaying) return;
    if(!decodingStarted){ initWebAudio(); }
    if(!audioCtx) return;

    const startWhenReady = ()=>{
      if(audioIsPlaying) return;
      if(webAudioReady) startWebAudioAt(currentIntroElapsed());
    };

    if(audioCtx.state === 'running'){
      startWhenReady();
      return;
    }

    // Sem gesto o navegador pode recusar; no primeiro toque/clique chamamos de novo
    // dentro da ativação do usuário e retomamos exatamente no tempo atual da intro.
    audioCtx.resume().then(startWhenReady).catch(()=>{});
  }
"""
if old_try in js:
    js = js.replace(old_try, new_try, 1)
    changed = True
elif "const startWhenReady = ()=>{" not in js:
    raise SystemExit("tryPlayAudio esperado não encontrado.")

old_unlock = """  initWebAudio(); // já começa a decodificar em segundo plano, sem precisar de gesto do usuário
  document.addEventListener('click', function unlockOnce(){
    tryPlayAudio();
    document.removeEventListener('click', unlockOnce);
  });
"""
new_unlock = """  initWebAudio(); // decodifica em segundo plano
  tryPlayAudio(); // autoplay best-effort; se o navegador bloquear, aguarda o primeiro gesto

  function unlockAudioFromGesture(){
    tryPlayAudio();
  }
  document.addEventListener('pointerdown', unlockAudioFromGesture, {once:true, capture:true});
  document.addEventListener('keydown', unlockAudioFromGesture, {once:true, capture:true});
"""
if old_unlock in js:
    js = js.replace(old_unlock, new_unlock, 1)
    changed = True
elif "unlockAudioFromGesture" not in js:
    raise SystemExit("Bloco antigo de unlock do áudio não encontrado.")

if changed:
    path.write_text(js, encoding="utf-8")
    print("Intro atualizada: autoplay best-effort, clique só libera áudio e botão Pular explícito.")
else:
    print("Intro já estava atualizada.")
