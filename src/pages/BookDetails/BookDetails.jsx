
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Bookmark,
  Check,
  ChevronLeft,
  Compass,
  Heart,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Sparkles,
  Truck,
  ShieldCheck,
  RotateCcw,
  Package,
} from "lucide-react";

import {
  formatPrice,
} from "../../data/books.js";

import {
  useLiveCatalog,
} from "../../hooks/useLiveCatalog.js";

import {
  useShop,
} from "../../context/ShopContext.jsx";

import BookCard, {
  BookCover,
} from "../../components/BookCard/BookCard.jsx";

import NotFound from "../NotFound/NotFound.jsx";

import "./BookDetails.css";

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
    },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

export default function BookDetails() {
  const { id } = useParams();

  const {
    books,
    categories,
    revision,
  } = useLiveCatalog();

  const reduced = useReducedMotion();

  const {
    cart,
    favorites,
    addToCart,
    toggleFavorite,
  } = useShop();

  const [quantity, setQuantity] =
    useState(1);

  const [tab, setTab] =
    useState("description");

  const [feedback, setFeedback] =
    useState("");

  /* FIRESTORE IDS ARE STRINGS */

  const book = books.find(
    (item) =>
      String(item.id) === String(id)
  );

  const category = categories.find(
    (item) =>
      item.id === book?.categoryId
  );

  const isFavorite = Boolean(
    book && favorites.includes(book.id)
  );

  const inCart =
    cart.find(
      (item) =>
        String(item.id) ===
        String(book?.id)
    )?.quantity || 0;

  const stock = Math.max(
    0,
    Number(book?.stock) || 0
  );

  const available = Math.max(
    0,
    Math.min(99, stock) - inCart
  );

  /* RELATED BOOKS */

  const related = useMemo(() => {
    if (!book) return [];

    return books
      .filter(
        (item) =>
          item.id !== book.id
      )
      .sort(
        (a, b) =>
          Number(
            b.categoryId === book.categoryId
          ) -
          Number(
            a.categoryId === book.categoryId
          )
      )
      .slice(0, 4);
  }, [book, books, revision]);

  const discount =
    book?.oldPrice > book?.price
      ? Math.round(
          (
            (book.oldPrice - book.price) /
            book.oldPrice
          ) * 100
        )
      : 0;

  /* RESET ON BOOK CHANGE */

  useEffect(() => {
    setQuantity(1);
    setTab("description");
    setFeedback("");
  }, [id]);

  /* STOCK CONTROL */

  useEffect(() => {
    setQuantity(
      (old) =>
        Math.min(
          old,
          Math.max(1, available)
        )
    );
  }, [available]);

  /* PAGE TITLE */

  useEffect(() => {
    if (!book) return undefined;

    const previous =
      document.title;

    document.title =
      `${book.title} | بوصلة`;

    return () => {
      document.title = previous;
    };
  }, [book]);

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }

    const timer = setTimeout(
      () => setFeedback(""),
      3500
    );

    return () =>
      clearTimeout(timer);
  }, [feedback]);

  /* ADD TO CART */

  function handleAdd() {
    if (!book || available <= 0) {
      return;
    }

    const amount = Math.min(
      Math.max(1, quantity),
      available
    );

    addToCart(
      book.id,
      amount
    );

    setFeedback(
      `تمت إضافة ${amount} من «${book.title}» إلى السلة`
    );

    setQuantity(1);
  }

  /* SHARE BOOK */

  async function handleShare() {
    if (!book) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: book.title,
          url: location.href,
        });
      } else {
        await navigator.clipboard.writeText(
          location.href
        );

        setFeedback(
          "تم نسخ رابط الكتاب"
        );
      }
    } catch (error) {
      if (
        error?.name !== "AbortError"
      ) {
        setFeedback(
          "تعذّرت مشاركة الرابط"
        );
      }
    }
  }

  /* NOT FOUND */

  if (!book) {
    return <NotFound />;
  }

  return (
    <main
      id="main-content"
      className="book-details-page"
      dir="rtl"
    >
      {/* BREADCRUMB */}

      <div className="book-details-breadcrumb-wrap">
        <div className="container">
          <nav
            className="book-details-breadcrumb"
            aria-label="مسار الصفحة"
          >
            <Link to="/">
              الرئيسية
            </Link>

            <ChevronLeft size={14} />

            <Link to="/books">
              جميع الكتب
            </Link>

            <ChevronLeft size={14} />

            <Link
              to={`/books?category=${encodeURIComponent(
                book.categoryId
              )}`}
            >
              {category?.label ||
                book.category}
            </Link>

            <ChevronLeft size={14} />

            <span aria-current="page">
              {book.title}
            </span>
          </nav>
        </div>
      </div>

      {/* MAIN DETAILS */}

      <section className="book-details-section">
        <div className="container book-details-layout">
          {/* BOOK IMAGE */}

          <motion.div
            className="book-details-visual"
            key={book.id}
            initial={
              reduced
                ? false
                : {
                    opacity: 0,
                    x: 30,
                    scale: 0.96,
                  }
            }
            animate={{
              opacity: 1,
              x: 0,
              scale: 1,
            }}
            transition={{
              duration: 0.55,
            }}
          >
            <div className="book-details-stage">
              <span className="book-details-stage-label">
                BAWSALA BOOK COLLECTION
              </span>

              <div className="book-details-orbit orbit-one" />
              <div className="book-details-orbit orbit-two" />

              <span className="book-details-spark spark-one">
                ✦
              </span>

              <span className="book-details-spark spark-two">
                ✧
              </span>

              <motion.div
                className="book-details-cover"
                whileHover={
                  reduced
                    ? undefined
                    : {
                        y: -10,
                        scale: 1.02,
                      }
                }
              >
                <BookCover book={book} />
              </motion.div>

              <div className="book-details-floating">
                <Compass size={22} />

                <div>
                  <span>
                    مختارات بوصلة
                  </span>
                  <strong>
                    رحلتك تبدأ هنا
                  </strong>
                </div>
              </div>

              <span className="book-details-stage-index">
                REF — {book.id}
              </span>
            </div>

            <div className="book-details-visual-note">
              <Sparkles size={18} />

              <p>
                {book.cover
                  ? "غلاف الكتاب المسجّل في متجر بوصلة."
                  : "لم تُضف صورة غلاف لهذا الكتاب بعد."}
              </p>
            </div>
          </motion.div>

          {/* BOOK INFO */}

          <motion.div
            className="book-details-information"
            key={`info-${book.id}`}
            variants={stagger}
            initial={
              reduced
                ? false
                : "hidden"
            }
            animate="visible"
          >
            <motion.div
              variants={fadeUp}
              className="book-details-top"
            >
              <Link
                className="book-details-category"
                to={`/books?category=${encodeURIComponent(
                  book.categoryId
                )}`}
              >
                <BookOpen size={16} />

                {category?.label ||
                  book.category}
              </Link>

              <span className="book-details-reference">
                REF. {book.id}
              </span>
            </motion.div>

            <motion.div variants={fadeUp}>
              <h1>
                {book.title}
              </h1>

              <p className="book-details-author">
                تأليف
                <strong>
                  {book.author}
                </strong>
              </p>
            </motion.div>

            {book.tag && (
              <motion.div variants={fadeUp}>
                <span className="book-details-tag">
                  <Sparkles size={14} />

                  {book.tag}
                </span>
              </motion.div>
            )}

            <motion.p
              variants={fadeUp}
              className="book-details-intro"
            >
              {book.description ||
                "لا يوجد وصف لهذا الكتاب بعد."}
            </motion.p>

            {/* QUICK SPECS */}

            <motion.div
              variants={fadeUp}
              className="book-details-quick-specs"
            >
              <div>
                <BookOpen size={20} />

                <span>
                  الصفحات

                  <strong>
                    {book.pages ||
                      "غير محدد"}
                  </strong>
                </span>
              </div>

              <div>
                <Bookmark size={20} />

                <span>
                  التصنيف

                  <strong>
                    {category?.label ||
                      book.category}
                  </strong>
                </span>
              </div>
            </motion.div>

            {/* PRICE */}

            <motion.div
              variants={fadeUp}
              className="book-details-price-box"
            >
              <span className="book-details-price-label">
                سعر الكتاب
              </span>

              <div className="book-details-price-row">
                <strong>
                  <bdi>
                    {formatPrice(
                      book.price
                    )}
                  </bdi>
                </strong>

                {book.oldPrice >
                  book.price && (
                  <del>
                    <bdi>
                      {formatPrice(
                        book.oldPrice
                      )}
                    </bdi>
                  </del>
                )}

                {discount > 0 && (
                  <span className="book-details-discount">
                    خصم {discount}%
                  </span>
                )}
              </div>

              <p>
                السعر الحالي المسجّل في المتجر.
                يتم تأكيد المبلغ قبل تجهيز الطلب.
              </p>
            </motion.div>

            {/* QUANTITY AND CART */}

            <motion.div
              variants={fadeUp}
              className="book-details-purchase"
            >
              <div className="book-details-quantity-wrapper">
                <label>
                  الكمية
                </label>

                <div className="book-details-quantity">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(
                        (n) =>
                          Math.max(
                            1,
                            n - 1
                          )
                      )
                    }
                    disabled={
                      quantity <= 1
                    }
                    aria-label="تقليل الكمية"
                  >
                    <Minus size={17} />
                  </button>

                  <span aria-live="polite">
                    {available
                      ? quantity
                      : 0}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(
                        (n) =>
                          Math.min(
                            available,
                            n + 1
                          )
                      )
                    }
                    disabled={
                      available <=
                      quantity
                    }
                    aria-label="زيادة الكمية"
                  >
                    <Plus size={17} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="book-details-add-cart"
                disabled={
                  available <= 0
                }
                onClick={handleAdd}
              >
                <ShoppingBag size={20} />

                {stock <= 0
                  ? "نفد المخزون"
                  : available === 0
                    ? "الكمية المتاحة في السلة"
                    : "أضف إلى السلة"}

                <ArrowUpLeft size={19} />
              </button>
            </motion.div>

            {/* ACTIONS */}

            <motion.div
              variants={fadeUp}
              className="book-details-secondary-actions"
            >
              <button
                type="button"
                className={
                  isFavorite
                    ? "is-favorite"
                    : ""
                }
                onClick={() =>
                  toggleFavorite(
                    book.id
                  )
                }
                aria-pressed={
                  isFavorite
                }
              >
                <Heart
                  size={18}
                  fill={
                    isFavorite
                      ? "currentColor"
                      : "none"
                  }
                />

                {isFavorite
                  ? "إزالة من المفضلة"
                  : "إضافة إلى المفضلة"}
              </button>

              <button
                type="button"
                onClick={handleShare}
              >
                <Share2 size={18} />
                مشاركة الكتاب
              </button>
            </motion.div>

            {/* FEEDBACK */}

            <div
              className="book-details-feedback-area"
              aria-live="polite"
            >
              <AnimatePresence>
                {feedback && (
                  <motion.p
                    className="book-details-feedback"
                    initial={{
                      opacity: 0,
                    }}
                    animate={{
                      opacity: 1,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                  >
                    <Check size={18} />
                    {feedback}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.div
              variants={fadeUp}
              className="book-details-benefits"
            >
              <div>
                <Truck size={20} />
                <span>
                  تُحدَّد رسوم التوصيل عند الطلب
                </span>
              </div>

              <div>
                <ShieldCheck size={20} />
                <span>
                  الدفع عند الاستلام بعد التأكيد
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* TABS */}

      <section className="book-details-extra-section">
        <div className="container">
          <div className="book-details-extra-heading">
            <p>
              <span />
              تعرّف أكثر
            </p>

            <h2>
              تفاصيل تستحق{" "}
              <span>
                القراءة.
              </span>
            </h2>
          </div>

          <div
            className="book-details-tabs"
            role="tablist"
            aria-label="معلومات الكتاب"
          >
            {[
              [
                "description",
                "عن الكتاب",
              ],
              [
                "specifications",
                "معلومات الكتاب",
              ],
              [
                "shipping",
                "الطلب والتوصيل",
              ],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  id={`book-tab-${value}`}
                  type="button"
                  role="tab"
                  aria-selected={
                    tab === value
                  }
                  aria-controls="book-details-tab-panel"
                  className={
                    tab === value
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setTab(value)
                  }
                >
                  {label}

                  {tab === value && (
                    <motion.span
                      layoutId="book-tabs-indicator"
                      className="book-details-tab-indicator"
                    />
                  )}
                </button>
              )
            )}
          </div>

          <div
            id="book-details-tab-panel"
            role="tabpanel"
            aria-labelledby={`book-tab-${tab}`}
            className="book-details-tab-content"
          >
            <AnimatePresence mode="wait">
              {tab === "description" && (
                <motion.div
                  key="description"
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                >
                  <h3>
                    عن كتاب {book.title}
                  </h3>

                  <p>
                    {book.description ||
                      "لم يُضف وصف بعد."}
                  </p>

                  <div className="book-details-quote">
                    <Compass size={27} />

                    <span>
                      لأن كل كتاب يمكن أن يكون
                      بداية لوجهة جديدة.
                    </span>
                  </div>
                </motion.div>
              )}

              {tab === "specifications" && (
                <motion.div
                  key="specifications"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                >
                  <h3>
                    البيانات الأساسية
                  </h3>

                  <div className="book-details-spec-table">
                    {[
                      [
                        "عنوان الكتاب",
                        book.title,
                      ],
                      [
                        "المؤلف",
                        book.author,
                      ],
                      [
                        "التصنيف",
                        category?.label ||
                          book.category,
                      ],
                      [
                        "عدد الصفحات",
                        book.pages ||
                          "غير محدد",
                      ],
                      [
                        "الناشر",
                        book.publisher ||
                          "غير محدد",
                      ],
                      [
                        "ISBN",
                        book.isbn ||
                          "غير محدد",
                      ],
                      [
                        "اللغة",
                        book.language ||
                          "غير محددة",
                      ],
                      [
                        "السعر",
                        formatPrice(
                          book.price
                        ),
                      ],
                    ].map(
                      ([label, value]) => (
                        <div key={label}>
                          <span>
                            {label}
                          </span>
                          <strong>
                            {value}
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                </motion.div>
              )}

              {tab === "shipping" && (
                <motion.div
                  key="shipping"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                >
                  <h3>
                    الطلب والتوصيل
                  </h3>

                  <p>
                    أضف الكتاب إلى السلة واختر
                    عنوان التوصيل في صفحة
                    Checkout. يتم تسجيل الطلب
                    في Firestore لمراجعته
                    من الإدارة.
                  </p>

                  <p>
                    الأسعار ورسوم التوصيل تقديرية
                    إلى أن تؤكد إدارة المتجر
                    توافر الكتب وتفاصيل الطلب.
                  </p>

                  <div className="book-details-shipping-cards">
                    <div>
                      <Package size={24} />
                      <strong>
                        التجهيز
                      </strong>
                      <span>
                        بعد تأكيد الطلب
                      </span>
                    </div>

                    <div>
                      <Truck size={24} />
                      <strong>
                        التوصيل
                      </strong>
                      <span>
                        بحسب الولاية
                      </span>
                    </div>

                    <div>
                      <RotateCcw size={24} />
                      <strong>
                        الإرجاع
                      </strong>
                      <span>
                        وفق سياسة المتجر
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* RELATED BOOKS */}

      <section className="book-details-related-section">
        <div className="container">
          <div className="book-details-related-heading">
            <div>
              <p>
                <Sparkles size={17} />
                أكمل رحلتك
              </p>

              <h2>
                كتب قد{" "}
                <span>
                  تعجبك أيضًا.
                </span>
              </h2>
            </div>

            <Link to="/books">
              جميع الكتب
              <ArrowLeft size={18} />
            </Link>
          </div>

          <motion.div
            className="book-details-related-grid"
            variants={stagger}
            initial={
              reduced
                ? false
                : "hidden"
            }
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.1,
            }}
          >
            {related.map(
              (item) => (
                <BookCard
                  key={item.id}
                  book={item}
                />
              )
            )}
          </motion.div>
        </div>
      </section>

      {/* BOTTOM CTA */}

      <section className="book-details-bottom">
        <div className="container book-details-bottom-content">
          <Compass size={35} />

          <div>
            <p>
              ما زال هناك الكثير لتكتشفه
            </p>

            <h2>
              لكل قارئ وجهته، ولكل وجهة كتاب.
            </h2>
          </div>

          <Link to="/books">
            العودة إلى المكتبة
            <ArrowLeft size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
