import * as ws from "ws"
import * as strings from "./strings.js"

const WS_PORT = 8088;

const serverOptions = {};
const wssOptions = {
	port: WS_PORT
}

let sessions = [];

main();

function sumArray(array){
	return array.reduce((p, c) => p + c, 0);
}

function vecCmp(v0, v1){
	return v0.x == v1.x && v0.y == v1.y;
}

function shipAura(cells){
	function vec(x, y) {
		return {x: x, y: y};
	}
	function add(v0, v1) {
		return {x: v0.x + v1.x, y: v0.y + v1.y};
	}
	const NBHD = [
		vec(1, 0),
		vec(1, 1),
		vec(0, 1),
		vec(-1, 1),
		vec(-1, 0),
		vec(-1, -1),
		vec(0, -1),
		vec(1, -1)
	];
	let aura = cells
		.map(c => NBHD.map(n => add(c, n)))
		.reduce((p, c) => p.concat(c), []);
	return aura
		.filter(
			(v, i) => !aura
				.slice(i + 1)
				.some(c => vecCmp(c, v))
		)
		.filter(v => !cells.some(c => vecCmp(c, v)))
		.filter(v => v.x >= 0 && v.x < 10 && v.y >= 0 && v.y < 10);
}

function newPlayerState(id, layout, ws){
	let slug = {
		id: id,
		layout: layout,
		ws: ws,
		hits: []
	}

	slug.getShipAt = 
		v => slug.layout.find(
			ship => ship.find(
				cell => vecCmp(v, cell)
			)
		);

	slug.damage = () => slug.hits.filter(h => !!slug.getShipAt(h)).length;

	const totalShipCells = sumArray(slug.layout.map(s => s.length));

	slug.hp = () => totalShipCells - slug.damage();

	slug.hit = v => {
		const existing = slug.hits.find(h => vecCmp(h, v));
		if (existing){
			console.error("double tap occured");
			return existing;
		}

		const damagedShip = slug.getShipAt(v);
		const newHit = {
			x: v.x,
			y: v.y,
			isHit: !!damagedShip,
			wholeShip: false
		};
		slug.hits.push(newHit);

		if (damagedShip){
			const length = damagedShip.length;
			const hits = slug.hits.filter(h => damagedShip.find(s => vecCmp(s, h)));
			if (hits.length == length){
				let auraHits = shipAura(damagedShip).filter(c => !slug.hits.some(h => vecCmp(h, c)));
				auraHits.forEach(a => slug.hit(a));
				hits.forEach(h => h.wholeShip = true);
			}
		}

		return newHit;
	}

	return slug;
}

function newSession(firstPlayer = null, room = null){
	let slug = {
		players: [
			null,
			null
		],
		room: room,
		activePlayer: 0
	};
	
	slug.addPlayer = playerState => {
		if (slug.players[0] == null) slug.players[0] = playerState;
		else if (slug.players[1] == null) slug.players[1] = playerState;
		else return false;
		return true;
	}
	slug.freeSlots = () => slug.players.filter(p => p == null).length;
	slug.flip = () => slug.activePlayer ^= 1; // slug.activePlayer = slug.activePlayer == 0 ? 1 : 0;

	if (firstPlayer) slug.addPlayer(firstPlayer);

	return slug;
}

function findSessionByPlayer(id){
	return sessions.find(s => s.players.some(p => p?.id == id));
}
function findSessionToJoin(room = null){
	return sessions.filter(s => s.freeSlots() > 0).find(s => s.room == room);
}

function sendToClient(data, ws){
	ws.send(JSON.stringify(data));
}

function sendGreenlight(ws){
	let payload = {
		type: "greenlight"
	};
	sendToClient(payload, ws);
}

function sendStatus(status, ws){
	let payload = {
		type: "status",
		message: status
	};
	sendToClient(payload, ws);
}

function sendHitFeedback(hitData, allHits = null, ws){
	let payload = {
		type: "feedback",
		hitData: hitData,
		allHits: allHits || null
	};
	sendToClient(payload, ws);
}

function sendAttackNotification(v, nma, ws){
	let payload = {
		type: "attack",
		x: v.x,
		y: v.y,
		nextMoveAllowed: nma
	};
	sendToClient(payload, ws);
}

function sendState(session, player){
	const playerIndex = session.players[0] == player ? 0 : 1;
	let payload = {
		type: "update",
		layout: player.layout,
		hits: player.hits,
		enemyHits: session.players[playerIndex ^ 1]?.hits || [],
		active: session.activePlayer == playerIndex,
		started: !session.players.some(p => p == null)
	};
	sendToClient(payload, player.ws);
}

function sendFinal(isWin, ws, layout){
	let payload = {
		type: "over",
		win: isWin,
		reveal: layout || null
	};
	sendToClient(payload, ws);
}

function logSessionCount(){
	console.log("session count: " + sessions.length);;
}

function killSession(session){
	sessions = sessions.filter(s => s != session);
	//logSessionCount();
}

function protocol(message, ws){
	switch (message.type){
		case ("vibecheck"): {
			let startedSession = findSessionByPlayer(message.me);
			if (startedSession) {
				//player has unfinished session, update socket connection
				let player = startedSession.players.find(p => p?.id == message.me);
				player.ws = ws;
				sendState(startedSession, player);
				sendStatus(strings.STATUS.JOINED, ws);
				break;
			} else {
				sendGreenlight(ws);
			}
			break;
		}
		case ("handshake"): {
			message.room ||= null;

			let startedSession = findSessionByPlayer(message.me);
			if (startedSession) {
				//player has unfinished session, update socket connection
				let player = startedSession.players.find(p => p.id == message.me);
				player.ws = ws;
				sendState(startedSession, player);
				sendStatus(strings.STATUS.RESTORED, ws);
				if (startedSession.freeSlots > 0)
					sendStatus(strings.STATUS.WAITING, ws);
				break;
			}

			let availableSession = findSessionToJoin(message.room);
			if (availableSession){
				//connect to existing session
				availableSession.addPlayer(newPlayerState(message.me, message.layout, ws));
				sendStatus(strings.STATUS.JOINED, ws);
				
				sendState(availableSession, availableSession.players[0]);
				sendState(availableSession, availableSession.players[1]);
				
				sendStatus(strings.STATUS.STARTED, availableSession.players[0].ws);
				sendStatus(strings.STATUS.STARTED, availableSession.players[1].ws);
				break;
			}

			//create new session of none were found
			let session = newSession(newPlayerState(message.me, message.layout, ws), message.room);
			sessions.push(session);
			sendStatus(strings.STATUS.CREATED, ws);
			sendStatus(strings.STATUS.WAITING, ws);
			break;
		}
		case ("fire"): {
			let s = findSessionByPlayer(message.me);
			if (!s || message.me != s.players[s.activePlayer]?.id) {
				//ignore inactive player
				break;
			}

			const opponent = s.players[s.activePlayer ^ 1];
			const trg = {x: message.x, y: message.y};
			const hit = opponent.hit(trg);
			const allStar = hit.wholeShip ? opponent.hits : null;
			sendHitFeedback(hit, allStar, ws);
			sendAttackNotification(trg, !hit.isHit, opponent.ws);
			if (!hit.isHit){
				s.flip();
			} else if (opponent.hp() == 0){
				sendFinal(true, ws);
				sendFinal(false, opponent.ws, s.players[s.activePlayer].layout);
				killSession(s);
			}
			break;
		}
		case ("resign"): {
			let startedSession = findSessionByPlayer(message.me);
			if (startedSession){
				let resignee = startedSession.players.find(p => p.ws == ws);
				let opponent = startedSession.players.find(p => p.ws != ws);
				sendStatus("Opponent resigned", opponent.ws);
				sendFinal(true, opponent.ws, resignee.layout);
				sendFinal(false, ws, opponent.layout);
				killSession(startedSession);
			}
			break;
		}
	}
}

function main(){
	const wss = new ws.WebSocketServer(wssOptions);

	// let sockets = [];
	wss.on("connection", socket => {
		// sockets.push(socket);

		socket.on("message", payload => {
			try {
				protocol(JSON.parse(payload), socket);
			} catch (e) {
				console.error(e);
			};
		});

		socket.on("close", function() {
			//sockets = sockets.filter(s => s !== socket);
		});
	});

	console.log("started");
}
