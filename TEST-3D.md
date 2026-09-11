Teste A/B baseado em `origin/main` no commit `b0b6912`.

Execute `python -m http.server 8800 --bind 127.0.0.1` nesta pasta.
Abra `http://127.0.0.1:8800/?visual=2d` e `http://127.0.0.1:8800/?visual=3d`.
Os dois modos carregam o mesmo jogo. Somente B carrega os GLBs/Three.js.

Use o controle existente de 0 / 0.5 / 1 / 2x. Roda/pinça controla zoom;
Shift + arrastar ou botão do meio move a câmera; duplo clique restaura.
Os módulos Three.js 0.180.0 são carregados por CDN e precisam de internet.

Validação: `node tests/ferrha-visual-state.test.cjs`; testes de navegador em
`tests/ferrha-browser.cjs` e `tests/battle-parity.cjs` usam Playwright/Three
instalados fora do projeto, apontados por `FERRO_TEST_TOOLS` e `FERRO_BROWSER`.
`FERRO_CDN=1` habilita teste com CDN real. O teste de paridade cobre uma
batalha controlada de 240 passos; não substitui uma campanha completa.

A arena acompanha a projeção/câmera do SVG e Ferrha usa um overlay WebGL.
Os outros campeões, efeitos e indicadores continuam no renderer atual.
Preparação usa o timer/alvo já existentes; ataques inesperados começam no
contato, sem atrasar o dano. A câmera com órbita completa fica no laboratório separado.
