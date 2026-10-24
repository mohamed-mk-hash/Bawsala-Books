
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
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
  Check,
  ChevronLeft,
  Compass,
  Heart,
  LibraryBig,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import { useLiveCatalog } from "../../hooks/useLiveCatalog.js";

import {
  useShop,
} from "../../context/ShopContext.jsx";

import BookCard from "../../components/BookCard/BookCard.jsx";

import "./Books.css";

/* ==========================================
   CONFIGURATION
========================================== */

const PRICE_LIMIT = 1500;

const filterTabs = [
  {
    id: "all",
    label: "كل المختارات",
  },
  {
    id: "budget",
    label: "أقل من 1500 دج",
  },
  {
    id: "favorites",
    label: "على قائمتي",
  },
];

const sortOptions = [
  {
    id: "featured",
    label: "ترتيب بوصلة",
  },
  {
    id: "price-asc",
    label: "السعر: من الأقل",
  },
  {
    id: "price-desc",
    label: "السعر: من الأعلى",
  },
  {
    id: "title",
    label: "حسب العنوان",
  },
];

/* ==========================================
   TEXT NORMALIZATION
========================================== */

function normalizeArabic(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670ـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

/* ==========================================
   ANIMATIONS
========================================== */

const gridVariants = {
  hidden: {
    opacity: 0,
  },

  visible: {
    opacity: 1,

    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.035,
    },
  },

  exit: {
    opacity: 0,

    transition: {
      duration: 0.13,
    },
  },
};

const reducedGridVariants = {
  hidden: {
    opacity: 1,
  },

  visible: {
    opacity: 1,
  },

  exit: {
    opacity: 1,
  },
};

/* ==========================================
   BOOKS PAGE
========================================== */

export default function Books() {
  const { books, categories, revision } = useLiveCatalog();
  const [searchParams, setSearchParams] =
    useSearchParams();

  const reducedMotion = useReducedMotion();

  const { favorites } = useShop();

  /* =====================================
     URL FILTERS
  ===================================== */

  const urlQuery = searchParams.get("q") || "";

  const requestedCategory =
    searchParams.get("category") || "all";

  const selectedCategory = categories.some(
    (category) => category.id === requestedCategory
  )
    ? requestedCategory
    : "all";

  /* =====================================
     LOCAL STATES
  ===================================== */

  const [searchInput, setSearchInput] =
    useState(urlQuery);

  const [activeTab, setActiveTab] =
    useState("all");

  const [sort, setSort] =
    useState("featured");

  /* =====================================
     SYNC SEARCH INPUT
  ===================================== */

  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  /* =====================================
     PAGE TITLE
  ===================================== */

  useEffect(() => {
    const previousTitle = document.title;

    document.title =
      "اكتشف الكتب | مكتبة بوصلة";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  /* =====================================
     HELPER: UPDATE URL
  ===================================== */

  function updateUrl(changes) {
    const next = new URLSearchParams(searchParams);

    Object.entries(changes).forEach(([key, value]) => {
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "all"
      ) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    setSearchParams(next, {
      replace: true,
      preventScrollReset: true,
    });
  }

  /* =====================================
     SEARCH
  ===================================== */

  function handleSearch(event) {
    event.preventDefault();

    updateUrl({
      q: searchInput.trim(),
    });

    document
      .getElementById("catalog-results")
      ?.scrollIntoView({
        behavior: reducedMotion
          ? "instant"
          : "smooth",
        block: "start",
      });
  }

  function clearSearch() {
    setSearchInput("");

    updateUrl({
      q: "",
    });
  }

  /* =====================================
     FILTER CATEGORY
  ===================================== */

  function changeCategory(categoryId) {
    updateUrl({
      category: categoryId,
    });

    setActiveTab("all");
  }

  /* =====================================
     RESET ALL FILTERS
  ===================================== */

  function resetFilters() {
    setSearchInput("");
    setActiveTab("all");
    setSort("featured");

    setSearchParams(
      new URLSearchParams(),
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  }

  /* =====================================
     FILTERED BOOKS
  ===================================== */

  const visibleBooks = useMemo(() => {
    const searchWords = normalizeArabic(urlQuery)
      .split(" ")
      .filter(Boolean);

    let result = books.filter((book) => {
      /* CATEGORY */

      const matchesCategory =
        selectedCategory === "all" ||
        book.categoryId === selectedCategory;

      /* SEARCH */

      const searchableText = normalizeArabic(
        [
          book.title,
          book.author,
          book.description,
          book.label,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const matchesSearch = searchWords.every(
        (word) => searchableText.includes(word)
      );

      /* TABS */

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "budget" &&
          Number(book.price) < PRICE_LIMIT) ||
        (activeTab === "favorites" &&
          favorites.includes(book.id));

      return (
        matchesCategory &&
        matchesSearch &&
        matchesTab
      );
    });

    /* SORT */

    result = [...result];

    switch (sort) {
      case "price-asc":
        result.sort(
          (a, b) => Number(a.price) - Number(b.price)
        );
        break;

      case "price-desc":
        result.sort(
          (a, b) => Number(b.price) - Number(a.price)
        );
        break;

      case "title":
        result.sort((a, b) =>
          a.title.localeCompare(b.title, "ar")
        );
        break;

      default:
        // Original order from books.js
        break;
    }

    return result;
  }, [
    urlQuery,
    selectedCategory,
    activeTab,
    sort,
    favorites,
    revision,
  ]);

  /* =====================================
     CATEGORY LABEL
  ===================================== */

  const categoryLabel =
    categories.find(
      (category) => category.id === selectedCategory
    )?.label || "كل الكتب";

  /* =====================================
     FILTER CHANGE ANIMATION KEY
  ===================================== */

  const animationKey = [
    selectedCategory,
    activeTab,
    sort,
    normalizeArabic(urlQuery),
  ].join("|");

  const variants = reducedMotion
    ? reducedGridVariants
    : gridVariants;

  /* =====================================
     JSX
  ===================================== */

  return (
    <main
      id="main-content"
      className="books-page"
      dir="rtl"
    >
      {/* =====================================
          NEW HERO — EDITORIAL LIBRARY
      ===================================== */}

      <section className="books-hero">

        <div
          className="books-hero-noise"
          aria-hidden="true"
        />

        <div className="container">

          {/* BREADCRUMB */}

          <nav
            className="books-breadcrumb"
            aria-label="مسار الصفحة"
          >
            <Link to="/">
              الرئيسية
            </Link>

            <ChevronLeft
              size={14}
              aria-hidden="true"
            />

            <span aria-current="page">
              اكتشف الكتب
            </span>
          </nav>

          {/* HERO CONTENT */}

          <div className="books-hero-grid">

            <motion.div
              className="books-hero-content"
              initial={
                reducedMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 27,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.75,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="books-hero-eyebrow">
                <span className="books-hero-eyebrow-icon">
                  <LibraryBig size={17} />
                </span>

                <span>
                  مكتبة بوصلة
                </span>

                <span className="books-hero-eyebrow-divider" />

                <span dir="ltr">
                  THE LIBRARY
                </span>
              </div>

              <h1>
                بين آلاف الأفكار،
                <br />
                <span>كتابٌ يشبهك.</span>
              </h1>

              <p className="books-hero-description">
                تصفّح الكتب حسب اهتماماتك،
                ابحث عن عنوان أو كاتب،
                واعثر على القراءة التي تستحق وقتك.
                هنا تبدأ رحلتك التالية.
              </p>

              {/* SEARCH FORM */}

              <form
                className="books-hero-search"
                onSubmit={handleSearch}
                role="search"
              >
                <Search
                  size={21}
                  className="books-hero-search-icon"
                  aria-hidden="true"
                />

                <label
                  htmlFor="books-main-search"
                  className="sr-only"
                >
                  البحث عن كتاب
                </label>

                <input
                  id="books-main-search"
                  type="search"
                  placeholder="ابحث عن كتاب، مؤلف، أو فكرة..."
                  autoComplete="off"
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                />

                {searchInput && (
                  <button
                    type="button"
                    className="books-search-clear"
                    onClick={clearSearch}
                    aria-label="مسح البحث"
                  >
                    <X size={16} />
                  </button>
                )}

                <button
                  type="submit"
                  className="books-hero-search-submit"
                >
                  ابحث
                  <ArrowUpLeft size={17} />
                </button>
              </form>

              <a
                href="#catalog-results"
                className="books-hero-explore"
              >
                <span>
                  أو تصفح المكتبة مباشرة
                </span>

                <ArrowLeft size={18} />
              </a>
            </motion.div>

            {/* =====================================
                EDITORIAL INFO GRAPHIC

                No overlapping book covers.
            ===================================== */}

            <motion.div
              className="books-hero-visual"
              aria-hidden="true"
              initial={
                reducedMotion
                  ? false
                  : {
                      opacity: 0,
                      scale: 0.9,
                      rotate: -7,
                    }
              }
              animate={{
                opacity: 1,
                scale: 1,
                rotate: 0,
              }}
              transition={{
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.1,
              }}
            >
              <div className="books-visual-orbit books-visual-orbit-outer" />

              <div className="books-visual-orbit books-visual-orbit-inner" />

              <div className="books-visual-cross cross-one">
                +
              </div>

              <div className="books-visual-cross cross-two">
                +
              </div>

              {/* CENTRAL INDEX */}

              <div className="books-visual-core">
                <span className="books-visual-core-label">
                  BOOKS / INDEX
                </span>

                <strong>
                  {String(books.length).padStart(2, "0")}
                </strong>

                <span className="books-visual-core-bottom">
                  عنوانًا في مكتبتنا
                </span>
              </div>

              {/* FLOATING DATA CARDS */}

              <div className="books-visual-card books-visual-card-top">
                <span>
                  <Compass size={18} />
                </span>

                <div>
                  <small>وجهتك القادمة</small>
                  <strong>تبدأ بكتاب</strong>
                </div>
              </div>

              <div className="books-visual-card books-visual-card-bottom">
                <span>
                  <BookOpen size={18} />
                </span>

                <div>
                  <small>مجالات القراءة</small>
                  <strong>
                    {Math.max(
                      0,
                      categories.filter(
                        (item) => item.id !== "all"
                      ).length
                    )} تصنيفات
                  </strong>
                </div>
              </div>

              <span className="books-visual-index-note">
                BAWSALA — 01 / DISCOVER
              </span>
            </motion.div>
          </div>
        </div>

        {/* HERO BOTTOM */}

        <div className="books-hero-bottom">
          <div className="container books-hero-bottom-inner">
            <span>
              <Sparkles size={15} />
              لكل قارئ بوصلة
            </span>

            <span>
              اكتشف. اختر. اقرأ.
            </span>
          </div>
        </div>
      </section>

      {/* =====================================
          LIBRARY SECTION
      ===================================== */}

      <section
        id="catalog-results"
        className="books-catalog-section"
      >
        <div className="container">

          {/* SECTION HEADING */}

          <div className="books-catalog-heading">
            <div>
              <p className="books-section-eyebrow">
                <span />
                رفوفنا
              </p>

              <h2>
                اختر ما <span>تقرأه الآن.</span>
              </h2>

              <p>
                استعرض مجموعتنا، وخصص النتائج
                حتى تجد الكتاب المناسب.
              </p>
            </div>

            <div className="books-catalog-counter">
              <strong>
                {String(visibleBooks.length).padStart(
                  2,
                  "0"
                )}
              </strong>

              <span>
                كتب متاحة للعرض
              </span>
            </div>
          </div>

          {/* =====================================
              FILTER BAR
          ===================================== */}

          <div className="books-toolbar">

            {/* QUICK FILTER TABS */}

            <div
              className="books-filter-tabs"
              aria-label="تصفية الكتب"
            >
              {filterTabs.map((tab) => {
                const active =
                  activeTab === tab.id;

                return (
                  <button
                    type="button"
                    key={tab.id}
                    className={`books-filter-tab ${
                      active ? "is-active" : ""
                    }`}
                    aria-pressed={active}
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                  >
                    {tab.id === "favorites" && (
                      <Heart size={15} />
                    )}

                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* SELECT CONTROLS */}

            <div className="books-select-controls">

              {/* CATEGORY */}

              <div className="books-select-wrapper">
                <label
                  className="sr-only"
                  htmlFor="books-category"
                >
                  تصنيف الكتب
                </label>

                <select
                  id="books-category"
                  value={selectedCategory}
                  onChange={(event) =>
                    changeCategory(event.target.value)
                  }
                >
                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* SORT */}

              <div className="books-select-wrapper">
                <label
                  className="sr-only"
                  htmlFor="books-sort"
                >
                  ترتيب الكتب
                </label>

                <select
                  id="books-sort"
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value)
                  }
                >
                  {sortOptions.map((option) => (
                    <option
                      key={option.id}
                      value={option.id}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* =====================================
              ACTIVE FILTERS AND COUNT
          ===================================== */}

          <div className="books-results-info">
            <div className="books-results-title">
              <span>
                {categoryLabel}
              </span>

              <small>
                ({visibleBooks.length})
              </small>
            </div>

            <div className="books-results-actions">

              {urlQuery && (
                <span className="books-active-filter">
                  البحث: {urlQuery}
                </span>
              )}

              {selectedCategory !== "all" && (
                <span className="books-active-filter">
                  {categoryLabel}
                </span>
              )}

              {activeTab !== "all" && (
                <span className="books-active-filter">
                  {
                    filterTabs.find(
                      (tab) => tab.id === activeTab
                    )?.label
                  }
                </span>
              )}

              {(urlQuery ||
                selectedCategory !== "all" ||
                activeTab !== "all" ||
                sort !== "featured") && (
                <button
                  type="button"
                  className="books-reset-button"
                  onClick={resetFilters}
                >
                  <RotateCcw size={14} />
                  إعادة ضبط
                </button>
              )}
            </div>
          </div>

          {/* =====================================
              BOOKS GRID

              Every filter transition animates.
          ===================================== */}

          <AnimatePresence
            mode="wait"
            initial={false}
          >
            {visibleBooks.length > 0 ? (
              <motion.div
                key={animationKey}
                className="books-products-grid"
                variants={variants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {visibleBooks.map((book, index) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    index={index}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={`empty-${animationKey}`}
                className="books-empty-state"
                initial={
                  reducedMotion
                    ? false
                    : {
                        opacity: 0,
                        y: 18,
                      }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -12,
                }}
                transition={{
                  duration: reducedMotion ? 0 : 0.3,
                }}
              >
                <div className="books-empty-icon">
                  <Search
                    size={40}
                    strokeWidth={1.3}
                  />
                </div>

                <h3>
                  لم نعثر على كتب مطابقة.
                </h3>

                <p>
                  جرّب عبارة بحث أخرى،
                  أو اختر تصنيفًا مختلفًا.
                  قد يكون كتابك القادم على رفّ آخر!
                </p>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="books-empty-reset"
                >
                  <RotateCcw size={17} />
                  عرض جميع الكتب
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* =====================================
              CATALOG FOOTNOTE
          ===================================== */}

          <div className="books-catalog-footnote">
            <div>
              <Compass size={20} />

              <span>
                كتب بوصلة المتاحة حاليًا
              </span>
            </div>

            <p>
              الأسعار والمخزون تُحدّث مباشرة من بيانات المتجر
            </p>
          </div>
        </div>
      </section>

      {/* =====================================
          BOTTOM CTA
      ===================================== */}

      <section className="books-bottom-cta">
        <div className="container books-bottom-cta-inner">
          <div>
            <p>
              <Sparkles size={16} />
              لم تجد ما تبحث عنه؟
            </p>

            <h2>
              أخبرنا عن الكتاب الذي تود قراءته.
            </h2>

            <span>
              قد نساعدك في العثور على عنوانه
              أو التعرف على مؤلفه.
            </span>
          </div>

          <Link
            to="/contact?topic=books"
            className="books-bottom-link"
          >
            تواصل مع بوصلة

            <ArrowUpLeft size={19} />
          </Link>
        </div>
      </section>
    </main>
  );
}
