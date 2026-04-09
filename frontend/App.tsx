import React, { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PostContext } from './context/PostContext';
import { Post } from './types/post';

// RootNavigator owns the NavigationContainer, navigationRef,
// auth gating, and all screen registration (including UserProfileScreen).
import RootNavigator from './app/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function RootApp() {
  const [posts, setPosts] = useState<Post[]>([]);

  const postContextValue = useMemo(
    () => ({
      posts,
      addPost: (post: Post) => setPosts((prev) => [post, ...prev]),
    }),
    [posts]
  );

  return (
    <PostContext.Provider value={postContextValue}>
      <RootNavigator />
    </PostContext.Provider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootApp />
    </QueryClientProvider>
  );
}