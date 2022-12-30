function framebuffer(el, size, tapCB, fill = " "){
	el.style.fontSize = `${100 / size.x - .1}vw`;

	const emptyPixel = {
		value: fill,
		color: "black"
	}
	const emptyBuffer = () => repeat(repeat(emptyPixel, size.x), size.y).reduce((p, c) => p.concat(c));
	let frame = emptyBuffer();

	function clear(){
		el.textContent = emptyBuffer();
	}

	function renderFrame(){
		if (el.children.length < 1){
			let feed = frame
				.map((px, i) => {
					let x = i % size.x;
					let y = Math.floor(i / size.x);

					let pixel = document.createElement("span");
					pixel.addEventListener("pointerdown", () => tapCB(vector(x, y)));
					pixel.addEventListener("touchstart", () => tapCB(vector(x, y)));
					return pixel;
				});
			chonks(feed, size.x).forEach(line => {
				line.forEach(p => el.appendChild(p));
				el.appendChild(document.createElement("br"));
			});
		}
		el.querySelectorAll("span").forEach((e, i) => {
			e.style.color = frame[i].color;
			e.textContent = frame[i].value;
		});
	}

	function drawAt(v, value, color = "black"){
		let index = v.x + v.y * size.x;
		frame[index].value = value;
		frame[index].color = color;
	}

	function get(v){
		let index = v.x + v.y * size.x;
		return frame[index];
	}

	function drawBatch(batch, value, color = "black"){
		batch.forEach(v => drawAt(v, value, color));
	}

	function drawRectangle(position, size, color = "black"){
		for (let y = position.y; y < position.y + size.y; ++y)
		for (let x = position.x; x < position.x + size.x; ++x){
			const v = vector(x, y);
			if (y == position.y){
				if (x == position.x) drawAt(v, ICONS.corners[1], color);
				else if (x == position.x + size.x - 1) drawAt(v, ICONS.corners[0], color);
				else drawAt(v, ICONS.lines.h, color);
			} else if (y == position.y + size.y - 1) {
				if (x == position.x) drawAt(v, ICONS.corners[2], color);
				else if (x == position.x + size.x - 1) drawAt(v, ICONS.corners[3], color);
				else drawAt(v, ICONS.lines.h, color);
			} else {
				if (x == position.x || x == position.x + size.x - 1) drawAt(v, ICONS.lines.v, color);
				else drawAt(v, ICONS.empty,color);
			}
		}
	}

	function drawButton(button, color = "black"){
		drawRectangle(button.position, button.size, color);
		if (button.caption) drawAt(button.position.add(vector(1, 1)), button.caption, color);
	}

	return {
		clear,
		drawAt,
		get,
		drawBatch,
		drawRectangle,
		drawButton,
		renderFrame
	}
}