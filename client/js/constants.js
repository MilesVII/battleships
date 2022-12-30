const DBG_SL = `[[{"x":0,"y":0},{"x":0,"y":1},{"x":0,"y":2},{"x":0,"y":3}],[{"x":2,"y":0},{"x":3,"y":0},{"x":4,"y":0}],[{"x":2,"y":2},{"x":2,"y":3},{"x":2,"y":4}],[{"x":4,"y":2},{"x":5,"y":2}],[{"x":4,"y":4},{"x":4,"y":5}],[{"x":6,"y":4},{"x":7,"y":4}],[{"x":6,"y":6}],[{"x":8,"y":6}],[{"x":6,"y":8}],[{"x":8,"y":8}]]`;
const WS_HOST = `ws://${location.hostname}:8088`;
const CONNECTING_PERIOD = 1000;

const ICONS = {
	empty: " ",
	cursorOnEmpty: "d",
	lines: {
		h: "4",
		v: "5"
	},
	corners: ["2", "3", "0", "1"],
	point: "A",
	circle: "D",
	cross: "B",
	filled: "C",
	ok: "v",
	rotate: "w",
	crosshair: "x",
	arrows: {
		up: "6",
		left: "7",
		down: "8",
		right: "9"
	}
};

const GAME_STATE = {
	VIBECHECK: -1,
	SETTINGUP: 0,
	CONNECTING: 1,
	LOBBY: 2,
	IDLE: 3,
	SHOOTING: 4,
	FINAL: 5
};

const SHIP_LENGTHS = [
	4,
	3,
	3,
	2,
	2,
	2,
	1,
	1,
	1,
	1
];

const SIZE = vector(37, 12);
const FIELD_SIZE = vector(10, 10);

