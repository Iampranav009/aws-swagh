import useSWR from 'swr';
import { fetchArchivedLeaderboardUsers, fetchPrivateUsersFromSupabase, fetchUsers, processLeaderboard, type LeaderboardEntry, type SheetUser } from '../lib/sheets';

const fetcher = async () => {
  const users = await fetchUsers();
  const leaderboard = processLeaderboard(users);
  return { allUsers: users, leaderboard };
};

export function useLeaderboard() {
  const { data, error, isLoading, mutate } = useSWR('leaderboard-data', fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: true,     // also refresh when user refocuses the tab
    dedupingInterval: 1000,
  });

  return {
    leaderboard: data?.leaderboard || [] as LeaderboardEntry[],
    allUsers:    data?.allUsers    || [] as SheetUser[],
    loading:     isLoading,
    error,
    refresh:     mutate,
  };
}

export function useArchivedLeaderboard() {
  const { data, error, isLoading } = useSWR('archived-leaderboard-data', async () => {
    const users = await fetchArchivedLeaderboardUsers();
    return processLeaderboard(users);
  });

  return {
    leaderboard: data || [] as LeaderboardEntry[],
    loading: isLoading,
    error,
  };
}

export function usePrivateSignupRows() {
  const { data, error, isLoading, mutate } = useSWR('private-signup-data', fetchPrivateUsersFromSupabase, {
    refreshInterval: 3000,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  return {
    allUsers: data || [] as SheetUser[],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}
