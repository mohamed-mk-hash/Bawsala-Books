
import { useMemo } from "react";

import {
  blogPosts,
  blogCategories,
} from "../data/blogs.js";

import {
  useStorefront,
} from "../context/StorefrontContext.jsx";

export function useLiveBlog() {
  const {
    revision,
    settings,
    text,
  } = useStorefront();

  const posts = useMemo(
    () => [...blogPosts],
    [revision]
  );

  const categories = useMemo(
    () => [...blogCategories],
    [revision]
  );

  return {
    posts,
    categories,
    revision,
    settings,
    text,
  };
}
