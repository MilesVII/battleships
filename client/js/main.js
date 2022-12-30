const CUR_DIR = {
	H: vector(1, 0),
	V: vector(0, 1)
};

let state = {
	framebuffer: null,
	tapRegions: [],
	gameState: GAME_STATE.IDLE,
	shipLayout: [],
	hitField: {
		my: [],
		enemy: []
	},
	cursor: {
		position: vector(0, 0),
		direction: CUR_DIR.H,
		currentShip: 0,
		currentShipLength: () => SHIP_LENGTHS[state.cursor.currentShip],
		rotate: () => {
			let newDirection = state.cursor.direction.equals(CUR_DIR.H) ? CUR_DIR.V : CUR_DIR.H;
			const currentShipLength = state.cursor.currentShipLength();
			const placementValid = validateShipPlacement(null, shipCells(state.cursor.position, newDirection, currentShipLength));

			if (placementValid) state.cursor.direction = newDirection;
		},
		move: (delta) => {
			let newPosition = state.cursor.position.add(delta);
			const currentShipLength = state.gameState == GAME_STATE.SETTINGUP ? state.cursor.currentShipLength() : 1;
			const placementValid = validateShipPlacement(null, shipCells(newPosition, state.cursor.direction, currentShipLength));
			
			if (placementValid) state.cursor.position = newPosition;
		}
	},
	ws: null,
	public: true,
	inviteCode: null
}

main();

function numberToInvite(n){
	return (""+n).split("").map(c => 
		"0xxMENOWAR72".charAt("0.,123456789".indexOf(c))
	).join("");
}

function myInviteCode(){
	return numberToInvite(me());
}

function getShipAt(v){
	return state.shipLayout.find(ship => ship.find(cell => v.equals(cell)))
}

function shotValid(trg){
	return !state.hitField.enemy.some(h => h.equals(trg));
}

function shipCells(position, direction, length){
	let r = [];
	for (let i = 0; i < length; ++i){
		r.push(position.add(direction.scale(i)));
	}
	return r;
}

function shipAura(position, direction, length){
	let r = [];
	for (let i = 0; i < (length + 2); ++i){
		r.push(position.add(vector(-1, -1)).add(direction.scale(i)));
		if (direction.equals(CUR_DIR.H))
			r.push(position.add(vector(-1, 1)).add(direction.scale(i)));
		else
			r.push(position.add(vector(1, -1)).add(direction.scale(i)));
	}
	if (direction.equals(CUR_DIR.H)){
		r.push(position.add(vector(-1, 0)));
		r.push(position.add(vector(length, 0)));
	} else {
		r.push(position.add(vector(0, -1)));
		r.push(position.add(vector(0, length)));
	}
	return r;
}

function validateShipPlacement(layout, cells, aura){
	for (let target of cells){
		if (!isInside(target, vector(0, 0), FIELD_SIZE)){
			return false;
		}
	}

	if (layout){
		const flatLayout = flatShallow(layout);
		const auraFiltered = aura.filter(a => isInside(a, vector(0, 0), FIELD_SIZE));
		const auraCollision = auraFiltered.find(a => flatLayout.find(s => a.equals(s)));
		if (auraCollision) return false;
		const shipCollision = cells.find(c => flatLayout.find(s => c.equals(s)));
		if (shipCollision) return false;
	}

	return true;
}

function me(){
	let id = localStorage.getItem("me");
	if (!id){
		id = Math.random();
		localStorage.setItem("me", id);
	}
	return id;
}

function getInviteCodeFromLocation(){
	let parts = window.location.href.split("#");
	if (parts.length < 2) return null;
	return parts[parts.length - 1];
}

function changePublicity(toPublic){
	state.public = toPublic;
	document.querySelector("#invite").classList.remove("hidden");
	if (toPublic){
		document.querySelector("#privateStatus").classList.add("hidden");
		state.inviteCode = null;
		//window.location.href = window.location.href.split("#")[0];
		window.history.pushState({}, "", window.location.href.split("#")[0])
	} else {
		document.querySelector("#privateStatus").classList.remove("hidden");
		const code = myInviteCode();
		const url = `${window.location.href.split("#")[0]}#${code}`;
		copyToClipboard(url, document.querySelector("#copier"));
		if (!state.inviteCode) {
			state.inviteCode = code;
		}
	}
}

function handshake(){
	let message = {
		type: "handshake",
		me: me(),
		layout: state.shipLayout,
		room: state.inviteCode || null
	};
	state.ws.send(JSON.stringify(message));
}

function fire(trg){
	let message = {
		type: "fire",
		me: me(),
		x: trg.x,
		y: trg.y
	};
	state.ws.send(JSON.stringify(message));
}

function resign(){
	if (document.querySelector("#resign").classList.contains("hidden")) return;
	let message = {
		type: "resign",
		me: me()
	};
	state.ws.send(JSON.stringify(message));
}

function vibecheck(){
	let message = {
		type: "vibecheck",
		me: me()
	};
	state.ws.send(JSON.stringify(message));
}

function messageFromServer(raw){
	//console.log(raw)
	let payload = null;
	try {
		payload = JSON.parse(raw);
	} catch (e) {
		console.error("Invalid message: " + raw);
		return;
	}

	switch (payload.type){
		case ("status"): {
			updateStatus(payload.message);
			break;
		}
		case ("update"): {
			hideById(["invite", "privateStatus"], true);
			state.shipLayout = payload.layout.map(ship => ship.map(cell => vecCopy(cell)));
			state.hitField.my = payload.hits.map(hit => vectorize(hit));
			state.hitField.enemy = payload.enemyHits.map(hit => vectorize(hit));
			if (payload.started)
				state.gameState = payload.active ? GAME_STATE.SHOOTING : GAME_STATE.IDLE;
			else
				state.gameState = GAME_STATE.IDLE;
			renderState()
			break;
		}
		case ("greenlight"): {
			state.gameState = GAME_STATE.SETTINGUP;
			update();
			break;
		}
		case ("feedback"): {
			clearTimeout(state.serverResponseTimeout);
			const hitData = Object.assign(vecCopy(payload.hitData), payload.hitData);
			state.hitField.enemy.push(hitData);
			if (payload.allHits){
				state.hitField.enemy = payload.allHits.map(hit => vectorize(hit));
				drawNotMe(true, true);
			} else
				drawHitNotOnMe(hitData, hitData.isHit, hitData.wholeShip, true, true);
			if (hitData.isHit) {
				updateStatus("Hit!");
				update();
				state.gameState = GAME_STATE.SHOOTING;
			} else {
				updateStatus("Miss! Waiting for opponent's move");
				state.gameState = GAME_STATE.IDLE;
			}
			break;
		}
		case ("attack"): {
			const v = vector(payload.x, payload.y);
			state.hitField.my.push(v);
			drawHitOnMe(v);
			if (payload.nextMoveAllowed){
				updateStatus("Your turn");
				update();
				state.gameState = GAME_STATE.SHOOTING;
				update();
			}
			break;
		}
		case ("over"): {
			updateStatus(payload.win ? "You won!" : "You lost!");
			if (payload.reveal) renderReveal(payload.reveal.map(ship => ship.map(c => vectorize(c))));
			state.gameState = GAME_STATE.FINAL;
			update();
			break;
		}
	}
}

function update(){
	const leftRectOffset = vector(1, 1);

	const INGAME_STATES = [
		GAME_STATE.SHOOTING,
		GAME_STATE.IDLE
	];
	const INTERACTIVE_STATE = [
		GAME_STATE.SETTINGUP,
		GAME_STATE.SHOOTING
	];

	BUTTONS.ok.caption = INGAME_STATES.includes(state.gameState) ? ICONS.crosshair : ICONS.ok;
	state.framebuffer.drawButton(BUTTONS.ok);

	if (INTERACTIVE_STATE.includes(state.gameState)) {
		if (lickButton(BUTTONS.left)) state.cursor.move(vector(-1, 0));
		if (lickButton(BUTTONS.right)) state.cursor.move(vector(1, 0));
		if (lickButton(BUTTONS.up)) state.cursor.move(vector(0, -1));
		if (lickButton(BUTTONS.down)) state.cursor.move(vector(0, 1));
		if (lickButton(BUTTONS.rotate)) state.cursor.rotate();
	} else if (state.gameState != GAME_STATE.FINAL){
		lickButton(BUTTONS.left);
		lickButton(BUTTONS.right);
		lickButton(BUTTONS.up);
		lickButton(BUTTONS.down);
		lickButton(BUTTONS.rotate);
		lickButton(BUTTONS.ok);
	}

	hideById("resign", !INGAME_STATES.includes(state.gameState));

	switch (state.gameState) {
		case (GAME_STATE.VIBECHECK): {
			vibecheck();
			updateStatus("Vibe check ongoing");
			break;
		}
		case (GAME_STATE.SETTINGUP): {
			drawBorder(true, false);
			drawMe(true);
			let currentShipLength = state.cursor.currentShipLength();
			let cells = shipCells(state.cursor.position, state.cursor.direction, currentShipLength);
			const aura = shipAura(state.cursor.position, state.cursor.direction, currentShipLength);
			let placementValid = validateShipPlacement(state.shipLayout, cells, aura);
			if (lickButton(BUTTONS.ok) && placementValid) {
				state.shipLayout.push(cells);
				state.cursor.currentShip += 1;
				drawMe(true);

				placementValid = false;
				currentShipLength = state.cursor.currentShipLength();
				cells = shipCells(state.cursor.position, state.cursor.direction, currentShipLength);
			}

			if (state.cursor.currentShip >= SHIP_LENGTHS.length){
				state.gameState = GAME_STATE.IDLE;
				hideById(["invite", "privateStatus"], true);
				updateStatus("Registering session on server");
				handshake();
				placementValid = true;
			}

			state.framebuffer.drawButton(BUTTONS.ok, placementValid ? "black" : "gray");

			let batch = cells.map(c => leftRectOffset.add(c))
			state.framebuffer.drawBatch(batch, ICONS.filled, placementValid ? "green" : "red");

			state.framebuffer.renderFrame();
			break;
		}
		case (GAME_STATE.CONNECTING): {
			state.ws = new WebSocket(WS_HOST);
			state.ws.addEventListener("message", e => {
				messageFromServer(e.data);
			});
			state.ws.onerror = e => {
				state.gameState = GAME_STATE.CONNECTING;
				setTimeout(update, CONNECTING_PERIOD);
			};
			state.ws.onclose, e => {
				state.gameState = GAME_STATE.CONNECTING;
				setTimeout(update, CONNECTING_PERIOD);
			};

			let connectingInterval = null;
			connectingInterval = setInterval(() => {
				if (state.ws.readyState == 1) {
					vibecheck();
					clearInterval(connectingInterval);
				}
				if (state.ws.readyState > 1) {
					//connection will be restarted by event listener
					clearInterval(connectingInterval);
				}
			}, CONNECTING_PERIOD);
			break;
		}
		case (GAME_STATE.SHOOTING): {
			drawBorder(false, true);
			drawNotMe(true, true);
			if (shotValid(state.cursor.position)){
				state.framebuffer.drawButton(BUTTONS.ok, "black");
				if (lickButton(BUTTONS.ok)) {
					fire(state.cursor.position);
					state.framebuffer.drawButton(BUTTONS.ok, "gray");
					state.gameState = GAME_STATE.IDLE;
					drawNotMe(false, true);
					state.serverResponseTimeout = setTimeout(() => updateStatus("Awaiting server response"), 700);
				}
			} else {
				state.framebuffer.drawButton(BUTTONS.ok, "gray");
			}
			lickButton(BUTTONS.ok);
			break;
		}
		case (GAME_STATE.FINAL): {
			if (lickButton(BUTTONS.left) ||
			    lickButton(BUTTONS.right) ||
			    lickButton(BUTTONS.up) ||
			    lickButton(BUTTONS.down) ||
			    lickButton(BUTTONS.rotate))
				window.location.reload();
			break;
		}
	}
}

function main(){
	window.onerror = (event, source, lineno, colno, error) => {
		alert(`${error}\n\n${source} ${lineno}:${colno}`)
	};
	state.framebuffer = framebuffer(document.querySelector(".framebuffer"), SIZE, tap);

	let invite = getInviteCodeFromLocation();
	if (invite){
		state.inviteCode = invite;
		changePublicity(false);
		hideById("invite", true);
	} else {
		state.inviteCode = null;
		changePublicity(true);
	}

	drawBorder(true, true);
	button(BUTTONS.up);
	button(BUTTONS.left);
	button(BUTTONS.rotate);
	button(BUTTONS.right);
	button(BUTTONS.down);
	button(BUTTONS.ok);

	const clickButton = button => { button.clicked = true; update(); };
	const mappings = [
		{
			keys: ["KeyW", "ArrowUp"],
			action: () => clickButton(BUTTONS.up)
		},
		{
			keys: ["KeyA", "ArrowLeft"],
			action: () => clickButton(BUTTONS.left)
		},
		{
			keys: ["KeyS", "ArrowDown"],
			action: () => clickButton(BUTTONS.down)
		},
		{
			keys: ["KeyD", "ArrowRight"],
			action: () => clickButton(BUTTONS.right)
		},
		{
			keys: ["KeyR", "ShiftRight", "ControlRight"],
			action: () => clickButton(BUTTONS.rotate)
		},
		{
			keys: ["KeyE", "Enter"],
			action: () => clickButton(BUTTONS.ok)
		}
	];
	listenToKeyboard(mappings);

	state.gameState = GAME_STATE.CONNECTING;
	update();
}
