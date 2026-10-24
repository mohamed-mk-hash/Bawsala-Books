import {
  useEffect,
  useRef,
} from 'react';

import {
  AnimatePresence,
  motion,
} from 'motion/react';

import {
  ArrowLeft,
  BookOpen,
  Check,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';

import { useShop } from '../../context/ShopContext.jsx';

import {
  books,
  categories,
  formatPrice,
} from '../../data/books.js';

import {
  BookCover,
} from '../BookCard/BookCard.jsx';

import './ShopDialog.css';

export default function ShopDialog() {
  const {
    dialog,
    closeDialog,
    cart,
    cartCount,
    cartTotal,
    favorites,
    addToCart,
    setQuantity,
    removeFromCart,
    toggleFavorite,
    openBook,
    toast,
  } = useShop();

  const dialogRef = useRef(null);

  const isOpen = Boolean(dialog);

  const selected = books.find(
    (book) => book.id === dialog?.id,
  );

  const isBook = dialog?.type === 'book';
  const isCart = dialog?.type === 'cart';

  const items = isCart
    ? cart.map((item) => ({
        ...books.find(
          (book) => book.id === item.id,
        ),
        quantity: item.quantity,
      }))
    : books.filter((book) =>
        favorites.includes(book.id),
      );

  useEffect(() => {
    if (!isOpen) return;

    const element = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow =
      document.body.style.overflow;

    element.showModal();
    document.body.style.overflow = 'hidden';

    return () => {
      element.close();
      document.body.style.overflow =
        previousOverflow;

      if (previousFocus?.isConnected) {
        previousFocus.focus({
          preventScroll: true,
        });
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const element = dialogRef.current;

    if (
      isOpen &&
      (
        !element.contains(document.activeElement) ||
        document.activeElement === element
      )
    ) {
      element
        .querySelector('button')
        ?.focus({ preventScroll: true });
    }
  }, [
    isOpen,
    dialog?.type,
    dialog?.id,
    cart,
    favorites,
  ]);

  function handleBackdrop(event) {
    if (
      event.target !== event.currentTarget
    ) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      closeDialog();
    }
  }

  const title = isBook
    ? selected?.title
    : isCart
      ? `سلّة كتبك (${cartCount})`
      : `رفّ المفضلة (${favorites.length})`;

  return (
    <>
      <dialog
        ref={dialogRef}
        className={`shop-dialog ${
          isBook ? 'shop-dialog--book' : ''
        }`}
        aria-labelledby="shop-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClick={handleBackdrop}
      >
        <div className="dialog-inner">
          <header className="dialog-header">
            <h2 id="shop-dialog-title">
              {title || 'بوصلة'}
            </h2>

            <button
              className="icon-button"
              autoFocus
              onClick={closeDialog}
              aria-label="إغلاق النافذة"
            >
              <X size={20} />
            </button>
          </header>

          {isBook && selected ? (
            <div className="book-detail">
              <div className="book-detail-art">
                <BookCover book={selected} />
              </div>

              <div className="book-detail-copy">
                <p className="eyebrow">
                  {
                    categories.find(
                      (item) =>
                        item.id ===
                        selected.categoryId,
                    )?.label
                  }
                </p>

                <h3>{selected.title}</h3>

                <p className="book-detail-author">
                  {selected.author}
                </p>

                <p className="book-detail-description">
                  {selected.description}
                </p>

                <strong className="detail-price">
                  {formatPrice(selected.price)}
                </strong>

                <p className="detail-note">
                  السعر والغلاف للعرض التجريبي.
                </p>

                <button
                  className="button button-primary"
                  onClick={() =>
                    addToCart(selected.id)
                  }
                >
                  أضف إلى السلّة
                  <ShoppingBag size={18} />
                </button>

                <button
                  className="text-link"
                  aria-pressed={favorites.includes(
                    selected.id,
                  )}
                  onClick={() =>
                    toggleFavorite(selected.id)
                  }
                >
                  <Heart
                    size={17}
                    fill={
                      favorites.includes(selected.id)
                        ? 'currentColor'
                        : 'none'
                    }
                  />

                  {favorites.includes(selected.id)
                    ? 'إزالة من المفضلة'
                    : 'أحتفظ به لوقت لاحق'}
                </button>
              </div>
            </div>
          ) : items.length ? (
            <>
              <div className="drawer-list">
                {items.map((book) => (
                  <article
                    className="drawer-item"
                    key={book.id}
                  >
                    <button
                      className="mini-cover"
                      style={{
                        background: book.color,
                        color: book.accent,
                      }}
                      onClick={() =>
                        openBook(book.id)
                      }
                      aria-label={`معاينة ${book.title}`}
                    >
                      <BookOpen
                        size={26}
                        strokeWidth={1.2}
                      />
                    </button>

                    <div className="drawer-item-copy">
                      <button
                        className="drawer-book-title"
                        onClick={() =>
                          openBook(book.id)
                        }
                      >
                        {book.title}
                      </button>

                      <p>{book.author}</p>

                      <strong>
                        {formatPrice(book.price)}
                      </strong>

                      {isCart ? (
                        <div className="quantity-control">
                          <button
                            onClick={() =>
                              setQuantity(
                                book.id,
                                book.quantity - 1,
                              )
                            }
                            aria-label={`تقليل كمية ${book.title}`}
                          >
                            <Minus size={14} />
                          </button>

                          <span aria-live="polite">
                            {book.quantity}
                          </span>

                          <button
                            onClick={() =>
                              setQuantity(
                                book.id,
                                book.quantity + 1,
                              )
                            }
                            disabled={
                              book.quantity >= 99
                            }
                            aria-label={`زيادة كمية ${book.title}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="text-link"
                          onClick={() =>
                            addToCart(book.id)
                          }
                        >
                          أضف إلى السلّة
                          <Plus size={15} />
                        </button>
                      )}
                    </div>

                    <button
                      className="remove-item"
                      onClick={() =>
                        isCart
                          ? removeFromCart(book.id)
                          : toggleFavorite(book.id)
                      }
                      aria-label={`إزالة ${
                        book.title
                      } ${
                        isCart
                          ? 'من السلة'
                          : 'من المفضلة'
                      }`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))}
              </div>

              {isCart && (
                <div className="cart-summary">
                  <div>
                    <span>المجموع الفرعي</span>
                    <strong>
                      {formatPrice(cartTotal)}
                    </strong>
                  </div>

                  <p>
                    هذه سلّة تجريبية محفوظة
                    على جهازك. لم يُفعّل إرسال
                    الطلبات أو الدفع بعد.
                  </p>

                  <button
                    className="button button-primary"
                    onClick={closeDialog}
                  >
                    أكمل اكتشاف الكتب
                    <ArrowLeft size={17} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="drawer-empty">
              {isCart ? (
                <ShoppingBag
                  size={48}
                  strokeWidth={1}
                />
              ) : (
                <Heart
                  size={48}
                  strokeWidth={1}
                />
              )}

              <h3>
                {isCart
                  ? 'رحلتك تنتظر أول كتاب.'
                  : 'احتفظ بالكتب التي لفتتك.'}
              </h3>

              <p>
                {isCart
                  ? 'أضف كتابًا من الرفّ لتجده هنا.'
                  : 'اضغط على القلب بجانب أي كتاب لإضافته هنا.'}
              </p>

              <button
                className="button button-outline"
                onClick={closeDialog}
              >
                لنكتشف الكتب
                <ArrowLeft size={17} />
              </button>
            </div>
          )}

          <div
            className="dialog-status"
            role="status"
          >
            {toast?.message}
          </div>
        </div>
      </dialog>

      <div
        className="toast-region"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toast && !isOpen && (
            <motion.div
              key={toast.id}
              className="shop-toast"
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: 10,
              }}
            >
              <span>
                <Check size={16} />
              </span>
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}