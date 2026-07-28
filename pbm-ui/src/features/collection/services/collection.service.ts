import apiService from '../../../services/api.service'
import type { Collection } from '../interfaces/collection.interface'
import type { IResponse } from '../../../interfaces/response.interface'

export async function fetchCollections(): Promise<Collection[]> {
  const envelope = await apiService.get<IResponse<Collection[]>>('/collections')
  return envelope.data
}

export async function createCollection(name: string): Promise<Collection> {
  const envelope = await apiService.post<IResponse<Collection>>('/collections', { name })
  return envelope.data
}

export async function deleteCollection(id: string): Promise<void> {
  await apiService.delete(`/collections/${id}`)
}

export async function enableShare(id: string): Promise<{ shareToken: string }> {
  const envelope = await apiService.post<IResponse<{ shareToken: string }>>(
    `/collections/${id}/share`,
  )
  return envelope.data
}

export async function disableShare(id: string): Promise<void> {
  await apiService.delete(`/collections/${id}/share`)
}

export async function fetchSharedCollection(token: string): Promise<Collection> {
  const envelope = await apiService.get<IResponse<Collection>>(`/share/collections/${token}`)
  return envelope.data
}
