// The pretend backend for the docs demos: an in-memory "database" with
// artificial latency. Reloading the page resets it.

const LATENCY = 700;

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Meme ideas (first query + mutation demos)

let memeIdeas = ['Cat wearing a tiny hat'];

export async function fetchMemeIdeas() {
	await sleep(LATENCY);
	return [...memeIdeas];
}

export async function addMemeIdea(idea: string) {
	await sleep(LATENCY);
	memeIdeas = [...memeIdeas, idea];
}

// Meme idea details (reactive params demo)

const details = [
	{ title: 'Cat wearing a tiny hat', author: 'Ada', upvotes: 512 },
	{
		title: 'Dog refuses to fetch, cites burnout',
		author: 'Grace',
		upvotes: 256
	},
	{ title: 'Unicorn doing its taxes', author: 'Ada', upvotes: 1024 },
	{ title: 'Sandwich achieves sentience', author: 'Grace', upvotes: 128 }
];

export async function fetchMemeIdea(id: number) {
	await sleep(LATENCY);
	return { id, ...details[(id - 1) % details.length] };
}

// Posts by author (dependent query demo)

export async function fetchPostsBy(author: string) {
	await sleep(LATENCY);
	return details.filter((d) => d.author === author).map((d) => d.title);
}

// Comments (sequential query demo)

const comments = [
	'First!',
	'This is surprisingly deep.',
	'I lol’d, then I cried.',
	'Needs more cat.',
	'Posting this from 2009.',
	'My grandma loves this one.',
	'The algorithm brought me here.',
	'Criminally underrated comment section.'
];

export async function fetchComments(offset: number) {
	await sleep(LATENCY);
	const items = comments.slice(offset, offset + 3);
	const next = offset + 3 < comments.length ? offset + 3 : undefined;
	return { items, next };
}
