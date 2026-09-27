// character.service — character profiles.
import { http } from './http'
import type { Character } from '../types/models'

export function getCharacters(categoryId?: number): Promise<Character[]> {
  return http.get<Character[]>('/community/characters', { categoryId })
}
