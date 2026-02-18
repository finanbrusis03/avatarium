# Avatarium

Um mundo isométrico 2D minimalista onde criaturas vivem e se movem autonomamente.
Desenvolvido com React, TypeScript e Canvas API (sem engines externas).

## Como Rodar

1. Certifique-se de ter o Node.js instalado.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:5173` no seu navegador.

## Funcionalidades (MVP)

- **Mundo Isométrico**: Grid 20x20 renderizado em Canvas.
- **Criaturas Autônomas**: Bots que nascem com cores únicas baseadas no nome e exploram o mundo aleatoriamente.
- **Movimento Suave**: Interpolação de movimento entre tiles.
- **Câmera Interativa**:
  - **Pan**: Arraste com o mouse para mover o mapa.
  - **Zoom**: Use o scroll do mouse para aproximar ou afastar.
- **Persistência em Nuvem**: Integração com **Supabase** para salvar o estado do mundo.
- **HUD**: Interface para visualizar população e adicionar novas criaturas ("Nascer").

## Roadmap

### v0.1 (Atual)
- [x] Engine isométrica básica.
- [x] Renderloop estável.
- [x] Movimento autônomo.
- [x] UI básica.

### v0.2 (Próximos Passos)
- [ ] Sprites animados para as criaturas (idle, walk).
- [ ] Tiles com texturas (grama, água, pedra).
- [ ] Colisões (evitar que criaturas ocupem o mesmo tile ou atravessem paredes).
- [ ] Seleção de criaturas ao clicar.

### v0.3 (Futuro)
- [ ] Multiplayer em tempo real (WebSocket).
- [ ] Chat entre criaturas.
- [ ] Customização de avatar.
