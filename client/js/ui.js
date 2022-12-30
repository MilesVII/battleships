const BUTTONS = {
	up: {
		position: vector(3 + 27, 0 + 1),
		size: vector(3, 3),
		caption: ICONS.arrows.up,
		clicked: false
	},
	left: {
		position: vector(0 + 27, 3 + 1),
		size: vector(3, 3),
		caption: ICONS.arrows.left,
		clicked: false
	},
	rotate: {
		position: vector(0 + 27, 6 + 1),
		size: vector(3, 3),
		caption: ICONS.rotate,
		clicked: false
	},
	right: {
		position: vector(6 + 27, 3 + 1),
		size: vector(3, 3),
		caption: ICONS.arrows.right,
		clicked: false
	},
	down: {
		position: vector(3 + 27, 6 + 1),
		size: vector(3, 3),
		caption: ICONS.arrows.down,
		clicked: false
	},
	ok: {
		position: vector(3 + 27, 3 + 1),
		size: vector(3, 3),
		caption: ICONS.ok,
		clicked: false
	}
};

function lickButton(button){
	let t = button.clicked;
	button.clicked = false;
	return t;
}

function createTapRegion(position, size, cb){
	state.tapRegions.push({
		position,
		size,
		tap: cb
	});
}

function tap(v){
	state.tapRegions.filter(r => isInside(v, r.position, r.size)).forEach(r => r.tap(v));
}

function button(raw){
	state.framebuffer.drawButton(raw);
	createTapRegion(raw.position, raw.size, () => {
		raw.clicked = true;
		update();
	});
}

function updateStatus(msg){
	let message = document.createElement("div");
	message.className = "bordered";
	message.textContent = msg;

	document.querySelector("#statuslog").prepend(message);

	Array.from(document.querySelector("#statuslog").children).forEach((c, i) => c.style.opacity = (100 / (i + 1)) + "%");
}

function hideById(id, hide){
	if (Array.isArray(id))
		id.forEach(i => hideById(i, hide));
	else {
		const e = document.getElementById(id);
		if (!e) return;
		if (hide)
			e.classList.add("hidden");
		else
			e.classList.remove("hidden");
	}
}

function renderState(){
	state.framebuffer.drawRectangle(vector(0, 0), vector(12, 12));
	state.framebuffer.drawRectangle(vector(14, 0), vector(12, 12));

	drawMe(false);
	drawNotMe(state.gameState == GAME_STATE.SHOOTING, false);

	state.framebuffer.renderFrame();
}

function drawBorder(left, right){
	if (left) state.framebuffer.drawRectangle(vector(0, 0), vector(12, 12));
	if (right) state.framebuffer.drawRectangle(vector(14, 0), vector(12, 12));
}

function drawLayout(position, layout, render = true){
	let shipBatch = layout
		.reduce((p, c) => p.concat(c), [])
		.map(cell => cell.add(position));

	state.framebuffer.drawBatch(shipBatch, ICONS.filled, "black");

	if (render)
		state.framebuffer.renderFrame();
}

function drawMe(render = true){
	const leftRectOffset = vector(1, 1);

	drawLayout(leftRectOffset, state.shipLayout, false);

	state.hitField.my.forEach(hit => drawHitOnMe(hit, false));

	if (render)
		state.framebuffer.renderFrame();
}

function renderReveal(layout, render = true){
	const rightRectOffset = vector(15, 1);

	drawLayout(rightRectOffset, layout, false);
	drawNotMe(false, false);

	if (render)
		state.framebuffer.renderFrame();
}

function drawNotMe(drawCursor, render = true){
	const rightRectOffset = vector(15, 1);
	state.hitField.enemy.forEach(hit => drawHitNotOnMe(hit, hit.isHit, hit.wholeShip, false, false));
	
	if (drawCursor){
		const dontAtMe = state.cursor.position.add(rightRectOffset);
		const old = state.framebuffer.get(dontAtMe)
		let newValue = old.value.toLowerCase();
		if (newValue == ICONS.empty) newValue = ICONS.cursorOnEmpty;
		state.framebuffer.drawAt(dontAtMe, newValue, old.color);
	}

	if (render)
		state.framebuffer.renderFrame();
}

function drawHitOnMe(v, render = true){
	const leftRectOffset = vector(1, 1);
	const hasShip = !!getShipAt(v);
	state.framebuffer.drawAt(v.add(leftRectOffset), hasShip ? ICONS.filled : ICONS.point, "red");
	if (render)
		state.framebuffer.renderFrame();
}

function drawHitNotOnMe(v, isHit, wholeShip, cursor = false, render = true){
	const rightRectOffset = vector(15, 1);
	let icon = isHit ? ICONS.filled : ICONS.point;
	if (cursor) icon = icon.toLowerCase();
	state.framebuffer.drawAt(v.add(rightRectOffset), icon, wholeShip ? "red" : "black");
	if (render)
		state.framebuffer.renderFrame();
}