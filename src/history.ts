import type { Project } from './types'

export type EditHistoryEntry = {
  id: string
  name: string
  at: string
  instances: number
  project: Project
}

const STORAGE_KEY = 'animation-editor-versions-v1'

export function readEditHistory(): EditHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as EditHistoryEntry[]
  } catch {
    return []
  }
}

export function saveEditHistory(entries: EditHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50)))
  } catch {
    /* ignore */
  }
}
