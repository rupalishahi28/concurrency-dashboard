# Concurrency Dashboard

A full-stack TypeScript project built to deeply understand **JavaScript concurrency patterns** — not just use them, but know *why* they exist and *when* to reach for each one.

---

## What it does

A React dashboard that fetches data from multiple APIs concurrently, with:
- Silent background auto-refresh every 10 seconds
- Per-card error handling (one API failing doesn't break the whole dashboard)
- Exponential backoff retry
- Race condition protection via `AbortController`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Async patterns | Promise.allSettled, AbortController, setInterval |

---

## Key Concurrency Concepts Demonstrated

### 1. Sequential vs Parallel Fetching

The most common performance mistake in frontend development — awaiting independent API calls one by one.

```ts
// ❌ Sequential — waits 4.5s (1s + 2s + 1.5s)
const user = await fetch('/user').then(r => r.json());
const metrics = await fetch('/metrics').then(r => r.json());
const notifications = await fetch('/notifications').then(r => r.json());

// ✅ Parallel — waits 2s (slowest one)
const [user, metrics, notifications] = await Promise.all([
  fetch('/user').then(r => r.json()),
  fetch('/metrics').then(r => r.json()),
  fetch('/notifications').then(r => r.json())
]);
```

**Result: 4.554s → 2.035s** just by changing how fetches are fired.

---

### 2. `Promise.all` vs `Promise.allSettled`

`Promise.all` fails fast — if one request fails, everything fails.

`Promise.allSettled` waits for all — each result has a `status` of `fulfilled` or `rejected`. Perfect for dashboards where partial data is better than no data.

```ts
const [userResult, metricsResult, notificationsResult] = await Promise.allSettled([
  fetch('/user').then(r => r.json()),
  fetch('/metrics').then(r => r.json()),
  fetch('/notifications').then(r => r.json())
]);

const user = userResult.status === 'fulfilled' ? userResult.value : null;
```

Each card renders independently — metrics can fail while user and notifications load fine.

---

### 3. AbortController — Cancelling Stale Fetches

Without cancellation, two problems arise:

**Memory leak** — component unmounts mid-fetch, fetch completes and tries to call `setState` on a component that no longer exists.

**Race condition** — user triggers retry while a fetch is in progress. Whichever fetch finishes *last* wins — even if it's the older one.

```ts
useEffect(() => {
  let controller = new AbortController();

  const fetchData = async () => {
    const response = await fetch('/dashboard', {
      signal: controller.signal // attach to fetch
    });
  };

  fetchData();

  return () => {
    controller.abort(); // cancel on unmount ✅
  };
}, []);
```

On abort, fetch throws an `AbortError` — caught and ignored since it's not a real error:

```ts
} catch(error) {
  if(error instanceof Error && error.name === 'AbortError') return;
  // handle real errors below
}
```

---

### 4. Silent Auto Refresh

Background refresh every 10 seconds without blocking the UI — old data stays visible until new data arrives.

```ts
const interval = setInterval(() => {
  controller.abort();              // cancel any in-flight fetch
  controller = new AbortController(); // fresh controller
  fetchData(false);                // silent — no loading spinner
}, 10000);

return () => {
  controller.abort();
  clearInterval(interval); // cleanup on unmount ✅
};
```

---

### 5. Exponential Backoff Retry

Each retry waits longer than the last — gives the server time to recover instead of hammering it repeatedly.

```
Retry 1 → wait 1s  (1000 * 2^0)
Retry 2 → wait 2s  (1000 * 2^1)
Retry 3 → wait 4s  (1000 * 2^2)
Retry 4 → wait 8s  (1000 * 2^3)
```

```ts
const handleRetry = async () => {
  const waitTime = 1000 * 2 ** retryCount;
  setRetryMessage(`Retrying in ${waitTime / 1000}s...`);
  await delay(waitTime);
  setRetryCount(prev => prev + 1);
  fetchDataRef.current?.();
};
```

---

### 6. Concurrency vs Parallelism

> JavaScript is **single-threaded and concurrent**, not parallel.

`Promise.all` and `Promise.allSettled` are concurrency patterns — they don't run code simultaneously. They avoid blocking by managing multiple async operations efficiently on a single thread.

True parallelism in JS requires Web Workers — separate threads running simultaneously. For most UI data fetching, concurrency is all you need.

---

## Project Structure

```
concurrency-dashboard/
├── backend/
│   ├── src/
│   │   └── index.ts      # Express server with mock APIs + delays
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── App.tsx       # React dashboard with all concurrency patterns
│   └── package.json
└── README.md
```

---

## Running Locally

**Backend**
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:3001
```

**Frontend**
```bash
cd frontend
npm install
npm start
# App runs on http://localhost:3000
```

---

## API Endpoints

| Endpoint | Response | Simulated Delay |
|---|---|---|
| `GET /health` | `{ status: 'ok' }` | none |
| `GET /user` | `{ id, name }` | 1s |
| `GET /metrics` | `{ risk, score }` | 2s |
| `GET /notifications` | `{ id, msg }` | 1.5s |
| `GET /dashboard` | all three combined | 2s (parallel) |
