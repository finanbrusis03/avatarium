# 🏰 Avatarium (HABOO)

**Avatarium** é uma experiência de mundo isométrico 2D minimalista e elegante, onde criaturas exploram um ambiente dinâmico com inteligência própria. Desenvolvido com foco em performance e estética premium, utilizando tecnologias modernas sem a necessidade de engines pesadas.

---

## ✨ Funcionalidades

### 🌍 Mundo Dinâmico
- **Grid Isométrico**: Um ambiente 20x20 renderizado inteiramente com a Canvas API.
- **Interatividade**: Sistema de Pan e Zoom fluido para exploração total do mapa.
- **Ambiente Rico**: Tiles detalhados com padrões de grama, água (com colisões inteligentes) e estruturas.

### 🤖 Criaturas (Avatares)
- **Vida Autônoma**: Bots que exploram o mundo aleatoriamente, buscando novos caminhos.
- **Identidade Única**: Cores e nomes gerados de forma determinística, garantindo personalidade a cada criatura.
- **Movimento Fluido**: Interpolação suave entre tiles para uma experiência visual agradável.

### 🛠️ Engenharia e Tecnologia
- **Canvas Engine**: Motor de renderização customizado para máxima eficiência.
- **Persistência**: Integração com **Supabase** para salvar e sincronizar o estado do mundo.
- **Arquitetura Escalonável**: Separada em `engine`, `world` e `ui` para fácil manutenção.

---

## 🚀 Como Rodar o Projeto

1. **Pré-requisitos**: Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.
2. **Instalação**: Instale as dependências:
   ```bash
   npm install
   ```
3. **Desenvolvimento**: Inicie o servidor local:
   ```bash
   npm run dev
   ```
4. **Navegação**: Abra `http://localhost:5173` no seu navegador.

---

## 📂 Estrutura do Projeto

```text
src/
├── engine/     # Motor de renderização e sistemas base (Partículas, Input)
├── world/      # Lógica de negócio do mundo (Spawn, Estruturas, Colisões)
├── render/     # Padrões visuais e utilitários de desenho
├── ui/         # Componentes de interface do usuário
├── services/   # Integrações externas (Supabase, Configurações)
└── utils/      # Utilitários matemáticos e de conversão isométrica
```

---

## 🗺️ Roadmap de Evolução

- [x] Engine isométrica básica e estável.
- [x] Movimento autônomo com interpolação.
- [/] Sprites animados para criaturas (idle/walking).
- [ ] Sistema de Chat em tempo real (multiplayer).
- [ ] Customização avançada de criaturas.
- [ ] Sistema de economia e construção.

---

Desenvolvido com ❤️ por Cristian Zimermann
