
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  books,
  getBook,
} from "../data/books.js";

import {
  useStorefront,
} from "./StorefrontContext.jsx";

const ShopContext =
  createContext(null);

const CART_KEY = "bawsala-cart";

const FAVORITES_KEY =
  "bawsala-favorites";

/* =====================================
   LOCAL CUSTOMER PREFERENCES

   Only cart and favorites are local.
   Catalog and prices come from Firestore.
===================================== */

function readSaved(key) {
  try {
    const result =
      JSON.parse(
        localStorage.getItem(key)
      );

    return Array.isArray(result)
      ? result
      : [];
  } catch {
    return [];
  }
}

/* =====================================
   SHOP PROVIDER
===================================== */

export function ShopProvider({
  children,
}) {
  const navigate = useNavigate();

  const {
    revision,
    settings,
  } = useStorefront();

  /* =====================================
     CART
  ===================================== */

  const [cart, setCart] =
    useState(() => {
      const unique = new Set();

      return readSaved(CART_KEY)
        .filter((item) => {
          const id = String(
            item?.id || ""
          );

          const valid =
            Boolean(getBook(id)) &&
            !unique.has(id) &&
            Number.isInteger(
              item?.quantity
            ) &&
            item.quantity > 0 &&
            item.quantity <= 99;

          if (valid) {
            unique.add(id);
          }

          return valid;
        })
        .map((item) => ({
          id: String(item.id),
          quantity: item.quantity,
        }));
    });

  /* =====================================
     FAVORITES
  ===================================== */

  const [
    favorites,
    setFavorites,
  ] = useState(
    () => [
      ...new Set(
        readSaved(FAVORITES_KEY)
          .map(String)
          .filter(
            (id) =>
              getBook(id)
          )
      ),
    ]
  );

  /* =====================================
     DIALOG AND TOAST
  ===================================== */

  const [dialog, setDialog] =
    useState(null);

  const [toast, setToast] =
    useState(null);

  const toastId = useRef(0);

  /* =====================================
     REMOVE UNPUBLISHED / DELETED BOOKS
  ===================================== */

  useEffect(() => {
    setCart(
      (items) =>
        items.filter(
          (item) =>
            Boolean(
              getBook(item.id)
            )
        )
    );

    setFavorites(
      (items) =>
        items.filter(
          (id) =>
            Boolean(
              getBook(id)
            )
        )
    );
  }, [revision]);

  /* =====================================
     PERSIST CUSTOMER CART / FAVORITES
  ===================================== */

  useEffect(() => {
    try {
      localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
      );

      localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(favorites)
      );
    } catch {
      // Keep operating in memory.
    }
  }, [
    cart,
    favorites,
  ]);

  /* =====================================
     TOAST TIMEOUT
  ===================================== */

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(
      () => setToast(null),
      2800
    );

    return () =>
      clearTimeout(timer);
  }, [toast]);

  function showToast(message) {
    setToast({
      id: ++toastId.current,
      message,
    });
  }

  /* =====================================
     ADD TO CART
  ===================================== */

  function addToCart(
    id,
    quantity = 1
  ) {
    const book = getBook(id);

    if (!book) {
      showToast(
        "هذا الكتاب غير متوفر حاليًا."
      );

      return;
    }

    if (
      settings?.system
        ?.acceptOrders === false ||
      settings?.system
        ?.maintenanceMode
    ) {
      showToast(
        "الطلبات متوقفة مؤقتًا."
      );

      return;
    }

    if (book.stock <= 0) {
      showToast(
        "نفد هذا الكتاب من المخزون."
      );

      return;
    }

    const amount = Math.floor(
      Number(quantity)
    );

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return;
    }

    const current =
      cart.find(
        (item) =>
          item.id === book.id
      )?.quantity || 0;

    const canAdd = Math.min(
      amount,

      Math.max(
        0,
        Math.min(
          99,
          book.stock
        ) - current
      )
    );

    if (canAdd === 0) {
      showToast(
        "لا يمكن تجاوز المخزون المتاح لهذا الكتاب."
      );

      return;
    }

    setCart((items) =>
      items.some(
        (item) =>
          item.id === book.id
      )
        ? items.map(
            (item) =>
              item.id === book.id
                ? {
                    ...item,
                    quantity:
                      item.quantity +
                      canAdd,
                  }
                : item
          )
        : [
            ...items,
            {
              id: book.id,
              quantity: canAdd,
            },
          ]
    );

    showToast(
      `أُضيف ${canAdd} من «${book.title}» إلى سلّتك`
    );
  }

  /* =====================================
     CHANGE QUANTITY
  ===================================== */

  function setQuantity(
    id,
    quantity
  ) {
    const book = getBook(id);

    if (!book) return;

    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    const next = Math.min(
      99,

      Math.max(
        1,
        Math.floor(quantity)
      ),

      book.stock
    );

    if (next < 1) {
      showToast(
        "نفد الكتاب من المخزون."
      );

      return;
    }

    setCart((items) =>
      items.map(
        (item) =>
          item.id === String(id)
            ? {
                ...item,
                quantity: next,
              }
            : item
      )
    );
  }

  /* =====================================
     REMOVE ITEM
  ===================================== */

  function removeFromCart(id) {
    setCart((items) =>
      items.filter(
        (item) =>
          item.id !== String(id)
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  /* =====================================
     FAVORITES
  ===================================== */

  function toggleFavorite(id) {
    const book = getBook(id);

    if (!book) return;

    setFavorites(
      (items) =>
        items.includes(book.id)
          ? items.filter(
              (item) =>
                item !== book.id
            )
          : [
              ...items,
              book.id,
            ]
    );
  }

  /* =====================================
     TOTALS FROM CURRENT CATALOG
  ===================================== */

  const cartCount =
    cart.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

  const cartTotal =
    cart.reduce(
      (sum, item) => {
        const book =
          books.find(
            (entry) =>
              entry.id === item.id
          );

        return (
          sum +
          (
            book?.price || 0
          ) * item.quantity
        );
      },
      0
    );

  /* =====================================
     NAVIGATION
  ===================================== */

  function openCart() {
    setDialog(null);
    navigate("/cart");
  }

  function openFavorites() {
    setDialog(null);
    navigate("/favorites");
  }

  function openBook(id) {
    if (!getBook(id)) return;

    setDialog({
      type: "book",
      id: String(id),
    });
  }

  function closeDialog() {
    setDialog(null);
  }

  /* =====================================
     CONTEXT
  ===================================== */

  return (
    <ShopContext.Provider
      value={{
        cart,
        favorites,
        dialog,
        toast,

        cartCount,
        cartTotal,

        catalogRevision: revision,

        addToCart,
        setQuantity,
        removeFromCart,
        clearCart,
        toggleFavorite,

        openCart,
        openFavorites,
        openBook,
        closeDialog,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context =
    useContext(ShopContext);

  if (!context) {
    throw new Error(
      "useShop must be used within ShopProvider"
    );
  }

  return context;
}
