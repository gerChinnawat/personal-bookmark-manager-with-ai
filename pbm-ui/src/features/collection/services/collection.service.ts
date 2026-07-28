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
