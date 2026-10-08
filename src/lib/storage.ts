// طبقة تجريد بسيطة فوق localStorage — get/set/subscribe
// الهدف: عزل بقية التطبيق عن localStorage مباشرة، حتى يسهل استبدالها لاحقًا بقاعدة بيانات حقيقية.

type Listener<T> = (value: T) => void

const listeners = new Map<string, Set<Listener<unknown>>>()

export function getItem<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
  listeners.get(key)?.forEach((listener) => listener(value))
}

export function subscribe<T>(key: string, listener: Listener<T>): () => void {
  const keyListeners = listeners.get(key) ?? new Set()
  keyListeners.add(listener as Listener<unknown>)
  listeners.set(key, keyListeners)
  return () => {
    keyListeners.delete(listener as Listener<unknown>)
  }
}
