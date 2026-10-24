
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronLeft,
  Compass,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
} from "lucide-react";

import { formatPrice } from "../../data/books.js";
import { useLiveCatalog } from "../../hooks/useLiveCatalog.js";

import { useShop } from "../../context/ShopContext.jsx";

import BookCard, {
  BookCover,
} from "../../components/BookCard/BookCard.jsx";

import "./Cart.css";

export default function Cart() {
  const { books, revision } = useLiveCatalog();
  const {
    cart,
    cartCount,
    cartTotal,
    setQuantity,
    addToCart,
    removeFromCart,
  } = useShop();

  const reduced = useReducedMotion();

  const [lastRemoved, setLastRemoved] = useState(null);

  const items = useMemo(
    () =>
      cart
        .map((item) => {
          const book = books.find(
            (book) => book.id === item.id
          );

          return book
            ? {
                ...book,
                quantity: item.quantity,
              }
            : null;
        })
        .filter(Boolean),
    [cart, revision]
  );

  const savings = items.reduce(
    (sum, book) =>
      sum +
      Math.max(
        0,
        (book.oldPrice || book.price) - book.price
      ) * book.quantity,
    0
  );

  const recommendations = books
    .filter(
      (book) =>
        !cart.some((item) => item.id === book.id)
    )
    .slice(0, 4);

  useEffect(() => {
    const previous = document.title;
    document.title = "سلة الكتب | بوصلة";

    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    if (!lastRemoved) return;

    const timer = setTimeout(
      () => setLastRemoved(null),
      6000
    );

    return () => clearTimeout(timer);
  }, [lastRemoved]);

  function removeBook(book) {
    setLastRemoved({
      id: book.id,
      title: book.title,
      quantity: book.quantity,
    });

    removeFromCart(book.id);
  }

  function undoRemove() {
    if (!lastRemoved) return;

    addToCart(
      lastRemoved.id,
      lastRemoved.quantity
    );

    setLastRemoved(null);
  }

  return (
    <main id="main-content" className="cart-page">

      {/* HERO */}

      <section className="cart-hero">
        <div className="container">
          <nav
            className="cart-breadcrumb"
            aria-label="مسار الصفحة"
          >
            <Link to="/">الرئيسية</Link>
            <ChevronLeft size={15} />
            <span aria-current="page">سلة الكتب</span>
          </nav>

          <div className="cart-hero-layout">
            <motion.div
              initial={
                reduced
                  ? false
                  : { opacity: 0, y: 25 }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{ duration: 0.65 }}
            >
              <p className="cart-eyebrow">
                <Sparkles size={17} />
                رفّك الخاص
              </p>

              <h1>
                حكايات اخترتها،
                <br />
                <span>لترافقك.</span>
              </h1>

              <p className="cart-hero-description">
                كل كتاب في سلّتك هو بداية
                لرحلة جديدة. راجع اختياراتك
                ورتّب رفّك كما تحب.
              </p>

              <Link
                to="/books"
                className="cart-back-shopping"
              >
                <ArrowLeft size={18} />
                واصل اكتشاف الكتب
              </Link>
            </motion.div>

            <motion.div
              className="cart-hero-art"
              initial={
                reduced
                  ? false
                  : { opacity: 0, scale: 0.9 }
              }
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{ duration: 0.75 }}
              aria-hidden="true"
            >
              <div className="cart-hero-ring" />

              <div className="cart-hero-orb">
                <ShoppingBag
                  size={76}
                  strokeWidth={1.1}
                />
              </div>

              <span className="cart-hero-count">
                {cartCount}
              </span>

              <span className="cart-hero-small-star">
                ✦
              </span>

              <span className="cart-hero-caption">
                YOUR READING COLLECTION
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CART CONTENT */}

      <section className="cart-content-section">
        <div className="container">

          <div className="cart-section-heading">
            <div>
              <p className="cart-eyebrow">
                <BookOpen size={17} />
                اختياراتك
              </p>

              <h2>
                سلّة <span>كتبك.</span>
              </h2>
            </div>

            <div className="cart-items-counter">
              <strong>{cartCount}</strong>
              <span>نسخة في السلة</span>
            </div>
          </div>

          {items.length > 0 ? (
            <div className="cart-main-grid">

              {/* BOOK LIST */}

              <div className="cart-items-column">
                <div className="cart-items-heading">
                  <span>
                    الكتب المختارة ({items.length})
                  </span>
                  <span>السعر والكمية</span>
                </div>

                <AnimatePresence
                  initial={false}
                  mode="popLayout"
                >
                  {items.map((book) => (
                    <motion.article
                      key={book.id}
                      layout={!reduced}
                      className="cart-product"
                      initial={
                        reduced
                          ? false
                          : {
                              opacity: 0,
                              y: 20,
                              scale: 0.98,
                            }
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        x: -55,
                        scale: 0.95,
                      }}
                      transition={{
                        duration: reduced ? 0 : 0.35,
                      }}
                    >
                      <Link
                        to={`/books/${book.id}`}
                        className="cart-product-cover"
                      >
                        <BookCover book={book} />
                      </Link>

                      <div className="cart-product-info">
                        <span className="cart-product-label">
                          مختارات بوصلة
                        </span>

                        <h3>
                          <Link to={`/books/${book.id}`}>
                            {book.title}
                          </Link>
                        </h3>

                        <p className="cart-product-author">
                          {book.author}
                        </p>

                        <div className="cart-product-price">
                          <strong>
                            {formatPrice(book.price)}
                          </strong>

                          {book.oldPrice && (
                            <del>
                              {formatPrice(book.oldPrice)}
                            </del>
                          )}
                        </div>

                        <div className="cart-product-bottom">
                          <div className="cart-quantity">
                            <button
                              type="button"
                              aria-label={`تقليل كمية ${book.title}`}
                              onClick={() =>
                                setQuantity(
                                  book.id,
                                  book.quantity - 1
                                )
                              }
                            >
                              <Minus size={16} />
                            </button>

                            <span>
                              {book.quantity}
                            </span>

                            <button
                              type="button"
                              disabled={book.quantity >= 99}
                              aria-label={`زيادة كمية ${book.title}`}
                              onClick={() =>
                                setQuantity(
                                  book.id,
                                  book.quantity + 1
                                )
                              }
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          <button
                            type="button"
                            className="cart-remove"
                            onClick={() => removeBook(book)}
                          >
                            <Trash2 size={16} />
                            حذف
                          </button>
                        </div>
                      </div>

                      <div className="cart-product-total">
                        <span>المجموع</span>

                        <strong>
                          {formatPrice(
                            book.price * book.quantity
                          )}
                        </strong>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>

                <AnimatePresence>
                  {lastRemoved && (
                    <motion.div
                      key={lastRemoved.id}
                      className="cart-undo"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role="status"
                    >
                      <Check size={18} />

                      <span>
                        حُذف «{lastRemoved.title}»
                      </span>

                      <button
                        type="button"
                        onClick={undoRemove}
                      >
                        <RotateCcw size={15} />
                        تراجع
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Link
                  to="/books"
                  className="cart-continue"
                >
                  <ArrowLeft size={18} />
                  إضافة المزيد من الكتب
                </Link>
              </div>

              {/* SUMMARY */}

              <aside
                className="cart-summary-card"
                aria-label="ملخص السلة"
              >
                <div className="cart-summary-heading">
                  <div>
                    <p>رحلتك القادمة</p>
                    <h2>ملخص السلّة</h2>
                  </div>

                  <Compass
                    size={31}
                    strokeWidth={1.3}
                  />
                </div>

                <div className="cart-summary-lines">
                  <div>
                    <span>عدد النسخ</span>
                    <strong>{cartCount}</strong>
                  </div>

                  <div>
                    <span>المجموع الفرعي</span>
                    <strong>
                      {formatPrice(cartTotal)}
                    </strong>
                  </div>

                  {savings > 0 && (
                    <div className="cart-saving-line">
                      <span>التوفير الظاهر</span>
                      <strong>
                        {formatPrice(savings)}
                      </strong>
                    </div>
                  )}

                  <div>
                    <span>رسوم التوصيل</span>
                    <span>تُحدّد لاحقًا</span>
                  </div>
                </div>

                <div className="cart-grand-total">
                  <span>إجمالي الكتب</span>

                  <strong>
                    {formatPrice(cartTotal)}
                  </strong>
                </div>

                <p className="cart-summary-caption">
                  الإجمالي لا يشمل رسوم التوصيل،
                  وتُحسب الأسعار وفق بيانات الكتب الحالية.
                </p>

                {/* NEW: CHECKOUT PAGE LINK */}

                <Link
                  to="/checkout"
                  className="cart-checkout-button"
                >
                  المتابعة إلى إتمام الطلب
                  <ArrowUpLeft size={19} />
                </Link>

                <div className="cart-checkout-status">
                  <ShieldCheck size={16} />
                  ستتم مراجعة البيانات في الصفحة التالية
                </div>

                <div className="cart-summary-decoration">
                  <span>
                    BAWSALA / YOUR NEXT CHAPTER
                  </span>
                </div>
              </aside>
            </div>
          ) : (
            <motion.div
              className="cart-empty"
              initial={
                reduced
                  ? false
                  : { opacity: 0, y: 25 }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
            >
              <div className="cart-empty-art">
                <div className="cart-empty-ring" />

                <ShoppingBag
                  size={76}
                  strokeWidth={1}
                />
              </div>

              <span className="cart-empty-kicker">
                YOUR NEXT CHAPTER AWAITS
              </span>

              <h2>
                سلّتك فارغة،
                <br />
                <span>لكن الحكايات كثيرة.</span>
              </h2>

              <p>
                لم تضف أي كتاب بعد.
                اكتشف مختارات بوصلة واختر
                أول رفيق لرحلتك القادمة.
              </p>

              <Link
                to="/books"
                className="button button-primary"
              >
                اكتشف الكتب
                <ArrowUpLeft size={18} />
              </Link>
            </motion.div>
          )}

          {/* RELATED BOOKS */}

          {recommendations.length > 0 && (
            <section
              className="cart-recommendations"
              aria-labelledby="cart-rec-title"
            >
              <div className="cart-recommendations-heading">
                <div>
                  <p className="cart-eyebrow">
                    <Sparkles size={17} />
                    اقتراحات بوصلة
                  </p>

                  <h2 id="cart-rec-title">
                    ربما يعجبك <span>أيضًا.</span>
                  </h2>
                </div>

                <Link to="/books">
                  كل الكتب
                  <ArrowLeft size={17} />
                </Link>
              </div>

              <motion.div
                className="cart-recommendations-grid"
                initial={reduced ? false : "hidden"}
                whileInView="visible"
                viewport={{
                  once: true,
                  amount: 0.12,
                }}
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.075,
                    },
                  },
                }}
              >
                {recommendations.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                  />
                ))}
              </motion.div>
            </section>
          )}

          <div className="cart-page-footnote">
            <div>
              <BookOpen size={20} />
              اقرأ ما تحب
            </div>

            <div>
              <Heart size={20} />
              احتفظ بمفضلاتك
            </div>

            <div>
              <Truck size={20} />
              تفاصيل التوصيل عند الطلب
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
