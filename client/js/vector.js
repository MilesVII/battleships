function vector(x = 0, y = 0){
	function add(v){
		return vector(x + v.x, y + v.y);
	}
	function sub(v){
		return vector(x - v.x, y - v.y);
	}
	function scale(s){
		return vector(x * s, y * s);
	}
	function equals(v){
		return x == v.x && y == v.y;
	}
	return {
		x,
		y,
		add,
		sub,
		scale,
		equals
	}
}

function vecCopy(v){
	return vector(v.x, v.y);
}

function vectorize(o){
	return Object.assign(vecCopy(o), o);
}