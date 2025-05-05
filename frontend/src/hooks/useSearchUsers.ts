import { useQuery } from '@tanstack/react-query'
import { searchUsers, SearchResponse } from '@/api/searchApi'

export const useSearchUsers = (query: string) => {
  return useQuery<SearchResponse, Error>({
    queryKey: ['search', query],
    queryFn: () => searchUsers(query),
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
} 