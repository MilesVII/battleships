function copyToClipboard(text, textarea){
	if (navigator.clipboard)
		navigator.clipboard.writeText(text);
	else
		alert(text);
}

function repeat(value, times){
	let r = [];
	for (let i = 0; i < times; ++i) r.push(JSON.parse(JSON.stringify(value)));
	return r;
}

function chonks(src, length){
	let r = [];
	for (let i = 0; i < src.length; i += length) r.push(src.slice(i, i + length))
	return r;
}

function flatShallow(array){
	return array.reduce((p, a) => p.concat(a), []);
}

function isInside(v, rectPosition, rectSize){
	return (
		rectPosition.x <= v.x && 
		v.x < (rectPosition.x + rectSize.x) && 
		rectPosition.y <= v.y && 
		v.y < (rectPosition.y + rectSize.y)
	);
}