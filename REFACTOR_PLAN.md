# Ferro & Lança — Refactor e Visual Overhaul

Branch de trabalho: `refactor/split-files`

## Objetivo
Separar o projeto atual, hoje concentrado em um único `index.html`, sem alterar o comportamento do jogo publicado. Depois da separação estrutural, iniciar um overhaul visual incremental.

## Fase 1 — Separação conservadora
- Manter `index.html` como ponto de entrada do GitHub Pages.
- Extrair CSS para `css/style.css`.
- Extrair Firebase/leaderboard para `js/firebase.js` quando a ordem de inicialização estiver confirmada.
- Extrair a lógica restante para `js/game.js` sem renomear funções, objetos ou variáveis globais.
- Preservar Google Analytics e carregamento do Firebase.
- Não alterar balanceamento, Stacks, personagens, IA, combate ou saves.

## Fase 2 — Organização interna
Depois de validar a versão separada:
- `js/data/` para personagens, itens, Stacks e banter.
- `js/battle/` para combate, IA e efeitos.
- `js/ui/` para HUD, roster, loja e tooltips.
- `js/systems/` para leaderboard, save e áudio.

A Fase 2 só começa depois da Fase 1 funcionar sem regressões.

## Fase 3 — Visual Overhaul
Ordem de trabalho:
1. Identidade visual e tela inicial.
2. HUD geral.
3. Cards de personagens.
4. Seleção de equipe.
5. Arena hexagonal.
6. Loja e inventário.
7. Tooltips.
8. Animações e feedback de combate.
9. Menus, placar e tutorial.
10. Responsividade/mobile.

## Direção visual
Preservar a identidade já existente de ferro escuro, aço, brasas e dourado e reforçá-la para criar uma linguagem visual própria de Ferro & Lança.

Elementos desejados:
- metal envelhecido;
- carvão/fuligem;
- brasas e calor de forja;
- entalhes e marcas militares discretas;
- contraste forte para leitura de combate;
- efeitos da Rachadura/Luz reservados para momentos especiais e personagens relacionados.

Evitar:
- medieval genérico de pergaminho/madeira;
- excesso de ornamentos;
- efeitos que prejudiquem leitura ou performance.

## Regra de segurança
`main` permanece a versão jogável pública até a branch de trabalho ser validada e revisada.
