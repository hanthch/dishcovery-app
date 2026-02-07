import React, { createContext, useState, useMemo, ReactNode } from 'react';
import { Post } from '../types/post'; 

// 1. Give the interface a distinct name (PostContextType)
export interface PostContextType {
  posts: Post[];
  addPost: (post: Post) => void;
}

// 2. Export the context itself
export const PostContext = createContext<PostContextType | undefined>(undefined);

// 3. Create the Provider component
export const PostProvider = ({ children }: { children: ReactNode }) => {
  const [posts, setPosts] = useState<Post[]>([]);

  const addPost = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
  };

  const value = useMemo(() => ({ posts, addPost }), [posts]);

  return (
    <PostContext.Provider value={value}>
      {children}
    </PostContext.Provider>
  );
};