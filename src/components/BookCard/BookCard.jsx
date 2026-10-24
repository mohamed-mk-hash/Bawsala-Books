
import {
  Compass,
  Heart,
  Plus,
} from "lucide-react";

import {
  motion,
  useReducedMotion,
} from "motion/react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useShop,
} from "../../context/ShopContext.jsx";

import {
  formatPrice,
} from "../../data/books.js";

import "./BookCard.css";

/* =====================================
   ANIMATIONS
===================================== */

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.97,
  },

  visible: {
    opacity: 1,
    y: 0,
    scale: 1,

    transition: {
      duration: 0.48,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const priceVariants = {
  hidden: {
    opacity: 0,
    y: 12,
    filter: "blur(4px)",
  },

  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",

    transition: {
      duration: 0.38,
      delay: 0.16,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const reducedVariants = {
  hidden: {
    opacity: 1,
  },

  visible: {
    opacity: 1,

    transition: {
      duration: 0,
    },
  },
};

/* =====================================
   BOOK COVER
===================================== */

export function BookCover({
  book,
  className = "",
}) {
  return (
    <div
      className={`book-cover book-cover--${book.motif} ${className}`}
      style={{
        "--cover-color": book.color,
        "--cover-accent": book.accent,
      }}
    >
      {/* DESIGN FALLBACK */}

      <div className="book-cover__top">
        <Compass aria-hidden="true" />

        <span>
          مختارات للقراءة
        </span>
      </div>

      <div className="book-cover__copy">
        <span className="book-cover__title">
          {book.title}
        </span>

        <span className="book-cover__label">
          {book.label}
        </span>
      </div>

      <span
        className="book-cover__art"
        aria-hidden="true"
      >
        <i />
        <i />
        <i />
        <b />
      </span>

      <span className="book-cover__author">
        {book.author}
      </span>

      <span
        className="book-cover__edition"
        aria-hidden="true"
      >
        بـوصـلـة
      </span>

      {/* REAL CLOUDINARY COVER */}

      {book.cover && (
        <img
          src={book.cover}
          alt={`غلاف ${book.title}`}
          loading="lazy"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
    </div>
  );
}

/* =====================================
   BOOK CARD
===================================== */

export default function BookCard({
  book,
  index = 0,
}) {
  const navigate = useNavigate();

  const {
    favorites,
    toggleFavorite,
    addToCart,
  } = useShop();

  const reducedMotion =
    useReducedMotion();

  const isFavorite =
    favorites.includes(book.id);

  const outOfStock =
    book.stock <= 0;

  function goToBookDetails() {
    navigate(
      `/books/${book.id}`
    );
  }

  return (
    <motion.article
      className="book-card"
      variants={
        reducedMotion
          ? reducedVariants
          : cardVariants
      }
    >
      {/* BOOK VISUAL */}

      <div className="book-card__visual">
        {/* TAG */}

        {book.tag && (
          <span className="book-card__tag">
            {book.tag}
          </span>
        )}

        {/* FAVORITE BUTTON */}

        <button
          type="button"
          className={`book-card__favorite ${
            isFavorite
              ? "is-active"
              : ""
          }`}
          onClick={() =>
            toggleFavorite(
              book.id
            )
          }
          aria-pressed={isFavorite}
          aria-label={`${
            isFavorite
              ? "إزالة"
              : "إضافة"
          } ${book.title} ${
            isFavorite
              ? "من"
              : "إلى"
          } المفضلة`}
        >
          <Heart
            size={18}
            aria-hidden="true"
          />
        </button>

        {/* BOOK COVER */}

        <button
          type="button"
          className="book-card__preview"
          onClick={
            goToBookDetails
          }
          aria-label={`عرض تفاصيل كتاب ${book.title}`}
        >
          <BookCover
            book={book}
          />
        </button>

        {outOfStock && (
          <span
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              zIndex: 6,
              padding: "7px 12px",
              background: "#fff1f2",
              color: "#c33745",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            نفد المخزون
          </span>
        )}
      </div>

      {/* BOOK INFORMATION */}

      <div className="book-card__info">
        <h3>
          <button
            type="button"
            onClick={
              goToBookDetails
            }
          >
            {book.title}
          </button>
        </h3>

        <p className="book-card__author">
          {book.author}
        </p>

        {/* PRICE */}

        <div className="book-card__bottom">
          <div className="book-card__prices">
            <motion.bdi
              className="book-card__price"
              variants={
                reducedMotion
                  ? reducedVariants
                  : priceVariants
              }
              style={{
                display:
                  "inline-block",
              }}
            >
              {formatPrice(
                book.price
              )}
            </motion.bdi>

            {book.oldPrice && (
              <motion.del
                variants={
                  reducedMotion
                    ? reducedVariants
                    : priceVariants
                }
                style={{
                  display:
                    "inline-block",
                }}
              >
                <bdi>
                  {formatPrice(
                    book.oldPrice
                  )}
                </bdi>
              </motion.del>
            )}
          </div>

          {/* ADD TO CART */}

          <button
            type="button"
            className="book-card__add"
            onClick={() =>
              addToCart(
                book.id
              )
            }
            disabled={
              outOfStock
            }
            aria-label={
              outOfStock
                ? `${book.title} غير متوفر`
                : `أضف ${book.title} إلى السلة`
            }
            title={
              outOfStock
                ? "نفد المخزون"
                : "أضف إلى السلة"
            }
            style={
              outOfStock
                ? {
                    opacity: 0.4,
                    cursor:
                      "not-allowed",
                  }
                : undefined
            }
          >
            <Plus
              size={21}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
