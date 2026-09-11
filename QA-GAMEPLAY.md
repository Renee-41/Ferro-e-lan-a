# Gameplay Polish v1 — roteiro de QA

Branch: `qa/gameplay-polish-v1`

Objetivo: melhorar decisões, clareza e balanceamento sem adicionar sistemas novos.

## Correções já aplicadas

- Biomas agora usam tempo de batalha, então Campo Verde e Terreno Corrompido respeitam `0x / 0.5x / 1x / 2x`.
- Classificação oficial adicionada às fichas e ao sistema de sugestão de equipe.
- Progressão de estrelas alterada de `2 / 2 / 2` cópias para `2 / 3 / 4` cópias para alcançar 2★ / 3★ / 4★.

## Classificação oficial

### Tanques
- Ferrha
- Terrus
- Shecry

### Lutadores
- Shava
- Kael
- Ímã
- Frosk
- Gélida
- Raio
- Nerith

### Atiradores
- Voss
- Nyx
- Pyra
- Zeph
- Voltra

### Suportes
- Jedegar
- Glacia

Regra de classe planejada: `Atirador > Tanque > Lutador > Atirador`.

## Evidência do primeiro playtest

Na onda 23, o jogador já tinha os 5 Stack Users permitidos antes da expansão da onda 40, todos em 4★ e equipados. Isso confirmou que a progressão estava encerrando cedo demais.

A primeira correção mexe somente na quantidade de cópias exigida por estrela. Os preços dos personagens, itens e recompensas das ondas permanecem inalterados neste teste para isolar o efeito da mudança.

## Próximo teste de progressão

Jogar novamente até aproximadamente a onda 23–30 e observar:
- quantos personagens já chegaram a 4★;
- quantos estão em 2★/3★;
- quantidade de itens completos;
- moedas disponíveis;
- se ainda existem compras desejáveis;
- se a expansão da onda 40 começa a parecer uma decisão futura relevante em vez de uma espera sem nada para fazer.

Se o time ainda maximizar cedo, o próximo ajuste será na renda das ondas e/ou no custo progressivo de cópias — não nos dois simultaneamente sem nova evidência.

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

1. **Economia inicial** — confirmada como rápida demais; a primeira correção está sendo testada via progressão de estrelas antes de cortar renda.
2. **Identidade/power budget dos campeões** — próximos reworks prioritários: Shava, Nerith, Raio, Ímã e Shecry.
3. **Legibilidade do midgame** — muitas fontes independentes de aleatoriedade podem acumular ao mesmo tempo. Verificar se o jogador entende por que venceu/perdeu.
4. **Criaturas corrompidas e fim de onda** — confirmar em jogo se a onda encerrar com corrompidos vivos é desejado ou produz vitórias prematuras/confusas.
5. **Itens dominantes** — observar se alguns combinados, principalmente de longa distância, eliminam escolhas alternativas em vez de criar builds diferentes.

## Backlog confirmado pelo playtest

- reorganizar Loja de Itens por caminhos de receita;
- buff e identidade de relíquias de boss;
- diferenciar Coração de Ferro e Muralha Viva;
- reworks de Shava, Nerith, Raio, Ímã e Shecry;
- reforçar identidade dos Lutadores e sua capacidade de alcançar Atiradores;
- criar mais itens de Suporte;
- placar com cura recebida, cura realizada, amplificação e participação de suporte;
- criar modo de informação simplificada ("Preguiça/CLT Mode");
- renomear `Itens` para `Loja de Itens`;
- unir Placar, Conquistas e Perfil em uma área;
- áudio iniciado pelo gesto de começar a partida e controle movido para Configurações;
- remover fluxo de arrastar item para excluir/vender;
- deixar cinematográfica de passiva muito mais lenta antes do tremor.

## Regra para esta passada

Mudanças grandes continuam em blocos pequenos e testáveis. `main` permanece intocada até aprovação explícita.