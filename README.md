# PoolJS

## Objectives

-   Create a pool game using Phaser 3 and TypeScript

## Local Development

### Available Commands

| Command       | Description                                       |
| ------------- | ------------------------------------------------- |
| `bun install` | Install project dependencies                      |
| `bun start`   | Build project and open web server running project |
| `bun build`   | Builds code bundle for production                 |
| `bun serve`   | Starts a local web server for previewing the game |

### Deploying Code

After you run the `bun build` command, your code will be built into a single bundle located at
`dist/*` along with any other assets you project depended.

If you put the contents of the `dist` folder in a publicly-accessible location (say something like `http://myserver.com`),
you should be able to open `http://myserver.com/index.html` and play your game.

### Static Assets

Any static assets like images or audio files should be placed in the `public` folder. It'll then be served at `http://localhost:8080/path-to-file-your-file/file-name.file-type`.
