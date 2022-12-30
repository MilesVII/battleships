export const STATUS = {
	RESTORED: "Game session restored",
	JOINED: "Joined existing session",
	CREATED: "Created new session",
	WAITING: "Waiting for player to join",
	STARTED: "Game started",
	ROOM_FULL: "Session for room # has no available slots"
}

export function fill(string){
	for (let arg of Array.from(arguments).slice(1)){
		string = string.replace("#", arg);
	}
	return string;
}