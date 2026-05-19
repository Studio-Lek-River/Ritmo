import { get as idbGet, set as idbSet, createStore } from 'idb-keyval';

const store = createStore('ritmo-db', 'ritmo-store');
const QUEUE_KEY = '_sync_queue';

export async function enqueue(op) {
  const queue = (await idbGet(QUEUE_KEY, store)) || [];
  queue.push({ ...op, attempts: 0, queuedAt: Date.now() });
  await idbSet(QUEUE_KEY, queue, store);
}

export async function getQueue() {
  return (await idbGet(QUEUE_KEY, store)) || [];
}

export async function setQueue(queue) {
  await idbSet(QUEUE_KEY, queue, store);
}
