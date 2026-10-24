
import { useMemo } from "react";

import {
  books,
  categories,
} from "../data/books.js";

import {
  useStorefront,
} from "../context/StorefrontContext.jsx";

/* ==========================================
   FIRESTORE CATALOG HOOK
========================================== */

export function useLiveCatalog() {
  const {
    revision,
    settings,
    text,
  } = useStorefront();

  /*
    books and categories preserve their
    array identity in data/books.js.

    React needs a new array reference
    whenever Firestore sends updates.
  */

  const currentBooks = useMemo(
    () => [...books],
    [revision]
  );

  const currentCategories = useMemo(
    () => [...categories],
    [revision]
  );

  return {
    books: currentBooks,
    categories: currentCategories,
    revision,
    settings,
    text,
  };
}
