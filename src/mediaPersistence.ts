import type { MediaAsset } from './types'

/**
 * 素材库的持久化层。
 *
 * 素材的元数据（id / kind / name / 时长 / 宽高 / 缩略图）存在工程里，随工程一起进
 * localStorage 与「保存当前版本」；真正的像素文件（视频 / 图片二进制）太大，不能塞
 * localStorage，所以单独存进 IndexedDB，用素材 id 当 key。
 *
 * objectURL（MediaAsset.url）是运行时值：它是浏览器给当前页面 Blob 发的临时地址，
 * 刷新页面就失效。所以落盘时把它清掉，等下次打开工程再从 IndexedDB 里取出原始文件、
 * 重新生成 objectURL —— 这就是"刷新后素材库不丢"的关键。
 */

const DB_NAME = 'animation-editor-media'
const DB_VERSION = 1
const STORE = 'blobs'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** 把素材的原始文件（Blob）存进 IndexedDB，key = 素材 id */
export async function putAssetBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  } catch {
    /* 存储失败不阻塞编辑：大不了刷新后这条素材要重新导入 */
  }
}

/** 按素材 id 取出原始文件 */
export async function getAssetBlob(id: string): Promise<Blob | undefined> {
  try {
    const db = await openDb()
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(id)
      req.onsuccess = () => resolve(req.result as Blob | undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return blob
  } catch {
    return undefined
  }
}

/** 删除某条素材的原始文件 */
export async function deleteAssetBlob(id: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  } catch {
    /* ignore */
  }
}

/** 清空全部素材文件（重置工作台时用） */
export async function clearAssetBlobs(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  } catch {
    /* ignore */
  }
}

/**
 * 从 IndexedDB 里把每个素材的原始文件取出来，重新生成 objectURL。
 * 已经带 objectURL 的（本会话刚导入的）直接跳过 —— 刷新后 url 是空串，才会走这里。
 */
export async function hydrateAssetUrls(assets: MediaAsset[]): Promise<MediaAsset[]> {
  const out: MediaAsset[] = []
  for (const a of assets) {
    if (a.url) {
      out.push(a)
      continue
    }
    const blob = await getAssetBlob(a.id)
    out.push(blob ? { ...a, url: URL.createObjectURL(blob) } : a)
  }
  return out
}

/**
 * 落盘前把工程里的素材 objectURL 清掉：blob: 地址只在当前页面有效，
 * 写进 localStorage 只会占地方、刷新后还失效，不如留空等重新生成。
 */
export function serializeProject<P extends { mediaAssets?: MediaAsset[] }>(p: P): P {
  if (!p.mediaAssets) return p
  return { ...p, mediaAssets: p.mediaAssets.map((a) => ({ ...a, url: '' })) }
}
