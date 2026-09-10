# Ferro & Lança — Arena hexagonal modular

Asset 3D estilizado inspirado na espessura, encaixe e superfície pintada das peças físicas da referência. A arena tem 61 hexágonos de topo plano, seguindo o raio 4 e as coordenadas axiais usados em `js/game.js`. O visual combina terra ocre, musgo nas bordas, pedra suave, basalto escuro, pequenos marcadores de bronze e ruínas desaturadas ao fundo.

## Entrega

| Arquivo | Conteúdo |
| --- | --- |
| `Arena_Hexagonal.blend` | Fonte editável, coleções organizadas, materiais, luzes e névoa de apresentação |
| `Arena_Hexagonal.glb` | Arena completa com tabuleiro, base, detalhes de borda e ruínas |
| `Arena_Tabuleiro.glb` | Somente tabuleiro, base e detalhes das bordas |
| `Arena_Cenario.glb` | Somente rochas e ruínas ao redor |
| `modules/Hex_Terra.glb` | Peça avulsa de terra |
| `modules/Hex_Grama.glb` | Peça avulsa com bordas mais verdes |
| `modules/Hex_Pedra.glb` | Peça avulsa com pedra discreta |
| `modules/Hex_Terra_Gasta.glb` | Variação de terra e pintura |
| `layout.json` | Coordenadas `q,r`, centros, altura da superfície e variante de cada casa |
| `textures/` | Base Color, Roughness, Metallic, Normal e ORM em 2048 × 2048 |
| `previews/` | Perspectiva, câmera tática, vista superior, detalhe, peças avulsas e referência de escala |
| `validation.json` | Verificação dos GLBs efetivamente exportados |

Os GLBs incluem as texturas utilizadas. O arquivo Blender contém as texturas ativas empacotadas e mantém caminhos relativos para os PNGs externos. A pasta `PREVIEW_ONLY` não entra nos GLBs.

## Geometria e otimização

Cada peça tem **70 triângulos**. O tabuleiro com base e detalhes tem **6.718 triângulos** e a arena completa tem **8.734 triângulos**. As 61 casas são nós independentes e compartilham somente quatro malhas de terreno. Base, detalhes estáticos e cenário são agrupados em objetos separados. O cenário completo tem 64 objetos de malha e 9 materiais, contando as casas independentes.

Essa estrutura permite seleção por casa, troca de material e ocultação das ruínas. Um renderer pode instanciar as quatro variantes para reduzir draw calls. O GLB usa referências de malha compartilhadas; não depende da extensão `EXT_mesh_gpu_instancing`. Não foram adicionados LODs, lightmaps ou colisores: para navegação, use os centros e a lógica do grid, com um colisor hexagonal simples se necessário.

## Escala e coordenadas

- Unidade: metro. Raio lógico do hexágono: `1.0`.
- Raio externo da peça: `0.948`; topo de terreno: `0.846`.
- Área central recomendada para apoio de personagem: raio `0.70`.
- Origem da arena: centro do tabuleiro, plano Z=0 no Blender.
- Origem de cada módulo: centro da peça. A superfície utilizável fica em `Z=-0.025` local; a borda superior fica em `Z=0.010`.
- Espessura total da peça: `0.29 m`.
- Altura dos pisos na arena: `0.270–0.335 m`, diferença máxima de `6,5 cm`. É decoração visual, sem novas regras de alcance ou movimento.
- Blender: Z vertical; glTF: Y vertical.

Mapeamento a partir do jogo:

```text
x = 1.5 * q
y = sqrt(3) * (r + q/2)
Blender: [x, y, alturaDoPiso]
glTF:    [x, alturaDoPiso, -y]
```

O `SIZE=30` do jogo atual é uma unidade de tela. Neste asset, o raio lógico equivale a 1 metro. Não se devem somar ao mundo 3D os deslocamentos de tela `+250` e `+230` usados no SVG. O `layout.json` já fornece os centros em ambos os sistemas. O JSON não inclui offsets arbitrários de sprite ou câmera.

Os desníveis são deliberadamente pequenos. Posicione cada personagem usando a altura da casa registrada no layout, somando apenas o offset necessário caso a origem do personagem não fique entre os pés. A prévia com Ferrha é apenas uma verificação visual de escala; os personagens não estão embutidos nos GLBs da arena.

## Aparência

O atlas é original, gerado proceduralmente com manchas amplas e formas gráficas para sugerir pintura manual. Não contém fotografias. Grama e pedras ficam principalmente nas bordas; o centro de cada casa permanece plano e visualmente tranquilo. O mapa Normal é neutro em espaço tangente: os chanfros e espessuras estão na geometria, sem bake high-poly.

Base Color usa sRGB. Roughness, Metallic, Normal e ORM são dados lineares. ORM: R=AO neutro, G=roughness, B=metallic. Não há AO assado. A névoa e as luzes são somente da apresentação Blender; no jogo, configure névoa ambiente e sombras no próprio renderer. Nenhum shader volumétrico é necessário para carregar os GLBs.

## Situação no projeto

Os arquivos foram criados isoladamente em `assets/arenas/hexagonal/`, com o checkout em `ui/ux-teste-visual-mecanicas`. O jogo atual continua usando sua arena existente; este trabalho entrega o asset, sem substituir HTML, JS, CSS ou mecânicas. Não houve publicação, merge nem alteração de `main` ou da branch de backup.

## Reproduzir

Use Blender 4.2 ou Python 3.11 com `bpy==4.2.0` e NumPy:

```text
python scripts/build_hex_arena.py
python scripts/validate_hex_arena.py
python scripts/preview_hex_arena.py
```

O último script reimporta o GLB para conferência e usa o asset existente da Ferrha, se disponível, somente no render de escala. Os scripts ficam na raiz `scripts/` do projeto; dentro do pacote ZIP, a estrutura de pastas é preservada.
