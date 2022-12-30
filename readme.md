# Seventh Battleships
Open-sorce implementation of multisession battleships game written in JS. Node.js for server, vanilla JS for client. Features private sessions with invite links, runs on mobile browsers. "**ws**" for Node.js is the only dependency.

## Client controls
- **WASD** / **Arrows** to move cursor when shooting or placing ships
- **E** / **Enter** to place ships and shoot at selected cells
- **R** / **Right Shift** rotate current ship when during placement
All controls are also available via buttons to the right of game fields. Once the game is finished, page will be reloaded once any input received.

## Deployment
### Client
Just serve contents of **client/** with HTTP server. Webpage will start trying to create websocket connection to server at the same domain name. You can change server's address in **client/constants.js**, **WS_HOST** constant. It is recommended to serve webpage over HTTPS in order to make Clipboard API available, but it's not mandatory.

### Server
Install dependencies and run **server/main.js** with Node.js. It will start running websocket server at port 8088 (can be changed in **server/main.js**, **WS_PORT** constant).

## License
Shared under WTFPL license.