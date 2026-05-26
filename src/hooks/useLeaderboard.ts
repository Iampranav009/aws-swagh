import useSWR from 'swr';
import { fetchUsers, processLeaderboard, type LeaderboardEntry, type SheetUser } from '../lib/sheets';

const fetcher = async () => {
  const users = await fetchUsers();
  const leaderboard = processLeaderboard(users);
  return { allUsers: users, leaderboard };
};

export function useLeaderboard() {
  const { data, error, isLoading, mutate } = useSWR('leaderboard-data', fetcher, {
    refreshInterval: 5000,       // poll every 5 seconds for near-instant leaderboard updates
    revalidateOnFocus: true,     // also refresh when user refocuses the tab
    dedupingInterval: 4000,      // debounce duplicate requests within 4s
  });

  return {
    leaderboard: data?.leaderboard || [] as LeaderboardEntry[],
    allUsers:    data?.allUsers    || [] as SheetUser[],
    loading:     isLoading,
    error,
    refresh:     mutate,
  };
}
