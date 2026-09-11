# Gameplay Polish v1 — roteiro de QA

Branch: `qa/gameplay-polish-v1`

Objetivo: melhorar decisões, clareza e balanceamento sem adicionar sistemas novos.

## Correções já aplicadas

- Biomas agora usam tempo de batalha, então Campo Verde e Terreno Corrompido respeitam `0x / 0.5x / 1x / 2x`.
- Shava e Jedegar agora possuem categoria no sistema de sugestão de equipe.

## Ordem do playtest

### 1. Early game — ondas 1–20

Observar:
- quantidade de decisões relevantes antes da onda 5;
- se as ondas 1–4 são automáticas demais;
- moedas após ondas 1, 5, 10, 15 e 20;
- se comprar campeão/item exige escolha ou sobra ouro;
- primeiro boss que realmente ameaça a equipe.

### 2. Mid game — ondas 20–80

Observar:
- personagens que deixam de contribuir;
- personagens que dominam qualquer composição;
- itens que parecem escolha obrigatória;
- combinação de boss + clima + bioma + corrompidos criando derrotas pouco legíveis;
- tempo gasto preparando versus tempo realmente tomando decisões.

### 3. Endgame — 80+

Observar:
- se a Forja resolve o excesso de ouro;
- se Rupturas mudam a estratégia ou apenas aumentam números;
- bênçãos caóticas que possuem custo sem benefício suficiente (ou o contrário);
- se 0.5x/pausa continuam confiáveis com muitos efeitos simultâneos.

## Cinco pontos sob investigação

1. **Economia inicial** — a curva atual parece generosa e as primeiras ondas são deliberadamente muito fáceis. Validar antes de alterar números.
2. **Identidade/power budget dos campeões** — campeões recentes têm passivas muito mais densas do que parte do elenco original. Comparar contribuição real, não somente descrição.
3. **Legibilidade do midgame** — muitas fontes independentes de aleatoriedade podem acumular ao mesmo tempo. Verificar se o jogador entende por que venceu/perdeu.
4. **Criaturas corrompidas e fim de onda** — confirmar em jogo se a onda encerrar com corrompidos vivos é desejado ou produz vitórias prematuras/confusas.
5. **Itens dominantes** — observar se alguns combinados, principalmente de longa distância, eliminam escolhas alternativas em vez de criar builds diferentes.

## Regra para esta passada

Não adicionar personagem, item, bioma ou sistema novo até concluir esta lista.

Corrigir primeiro bugs objetivos. Alterar números de balanceamento somente depois de evidência de playtest.