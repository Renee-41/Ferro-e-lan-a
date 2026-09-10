# Ferrha — Ferro & Lança

Modelo 3D original construído a partir das proporções da imagem de referência: cabeça arredondada muito grande, tronco compacto, braços e pernas curtos. A imagem foi usada como referência visual; não foi fornecida uma malha de base.

## Arquivos

- `Ferrha.glb`: asset para importar em engines, com texturas embutidas, esqueleto e seis clipes iniciais.
- `Ferrha.blend`: fonte editável em Blender 4.2, pose de descanso em A e cena de iluminação para apresentação.
- `textures/`: atlas PBR de 1024 × 1024, PNG.
- `previews/`: renders frontal, traseiro, três quartos, isométrico e testes em 40, 60 e 80 pixels.
- `asset_report.json` e `validation.json`: contagens e verificações do arquivo exportado.
- `../../../scripts/build_ferrha.py`: construção reproduzível com `bpy` e `numpy`.
- `../../../scripts/validate_ferrha.py`: validação independente da estrutura GLB.
- `../../../scripts/preview_ferrha_clips.py`: reimportação e renders dos seis clipes.

## Branch e teste

Este protótipo está em `ui/ux-teste-visual-mecanicas`, organizado em `assets/characters/ferrha/`. Ainda não está conectado ao campo de batalha: HTML, JavaScript e CSS do jogo foram preservados. Os renders em `previews/` e a importação de `Ferrha.glb` em uma engine ou Blender são os testes 3D disponíveis.

O workflow desta branch foi convertido de publicador em validador somente de leitura. Ele verifica o asset e disponibiliza um artifact no GitHub Actions, sem commits, merges ou pushes para `main` ou `backup/ultima-versao-lancada`. O preview público anterior não recebe esta versão da Ferrha.

## Estrutura do asset

31.004 triângulos, 10 objetos de malha, um material PBR compartilhado, 26 ossos. As partes rígidas da armadura mantêm suas formas durante a movimentação; tronco e mangas têm transições de pesos. A malha combina superfícies separadas de pele, roupa e placas. Não é um corpo anatômico contínuo para escultura.

| Objeto | Uso |
| --- | --- |
| `Ferrha_Body` | Corpo, rosto e armadura vinculados ao esqueleto |
| `Helmet` | Capacete separado |
| `Hair` | Cabelo castanho e trança curta separados |
| `Spear` | Lança separada, origem na empunhadura |
| `MagneticPlate_01` … `MagneticPlate_06` | Seis placas independentes, com origem local e osso próprio |

O `Root` e a origem do corpo ficam no chão entre os pés. A escala é em metros: cerca de 1,58 m até o topo da cabeça, 1,67 m com a crista. No Blender, Z é vertical e a personagem olha para -Y. O GLB é convertido para Y vertical. Essa altura é uma convenção de escala para o mundo; as proporções permanecem chibi.

As placas são malhas distintas, deformadas rigidamente pelos ossos `Magnet.01` a `Magnet.06`, filhos de `Root`. Use esses ossos para animar órbitas, escudos e ataques. Para usar uma placa como projétil físico separado, extraia sua malha e aplique a transformação do osso antes de removê-la do skin. A lança usa o osso `Spear`, filho de `Hand.R`.

## Materiais e UV

Atlas UV compartilhado com ilhas empacotadas e margem de cor. Base Color e Emission em sRGB; Roughness, Metallic, Normal e ORM como dados lineares. `ORM` contém oclusão ambiente neutra no canal R, rugosidade em G e metalicidade em B. Não há AO assado. A emissão laranja aparece somente nas pequenas inserções da armadura.

O mapa Normal é **neutro em espaço tangente**, compatível com glTF/OpenGL (+Y). Os volumes, facetas e chanfros estão na geometria; não foi feito bake de um modelo high-poly. O material tem acabamento simples, sem desgaste pintado ou microdetalhes.

## Esqueleto e animações

Rig humanoide FK inicial, sem IK, dedos individuais, facial rig ou retarget automático. Inclui `Idle`, `Walk`, `Attack`, `Hit`, `Death` e `Ability` como clipes demonstrativos editáveis. Walk é no lugar. O arquivo Blender abre na pose de descanso; os clipes ficam nas Actions e em trilhas NLA desativadas para evitar sobreposição. Para editar um clipe, atribua a Action ao rig no Action Editor.

Esta é uma primeira versão funcional para importação e iteração artística. Os clipes ainda precisam de polimento, ajuste de contato da lança, colisões, eventos e validação no motor do jogo antes de produção. A leitura em 40 pixels preserva a cabeça, armadura e lança; rosto, inscrições e placas traseiras naturalmente perdem definição nessa escala. A integração com o jogo existente não foi alterada.

## Regerar

Execute `scripts/build_ferrha.py` com o Python do Blender 4.2 ou com o módulo `bpy==4.2.0` e `numpy`. O script recria apenas os arquivos desta pasta. Depois execute `scripts/validate_ferrha.py` com Python e NumPy para conferir o GLB final.

A coleção `PREVIEW ONLY` contém câmera, luzes e chão e é excluída da exportação. No Blender, o asset pode ser exportado novamente selecionando somente as dez malhas e `Ferrha_Rig`.
