
import { useEffect } from "react";
import { Link } from "react-router-dom";

import {
  motion,
  useReducedMotion,
} from "motion/react";

import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Compass,
  Heart,
  Sparkles,
  ShoppingBag,
  MoveDownLeft,
  Feather,
  Quote,
} from "lucide-react";

import { formatPrice } from "../../data/books.js";
import { useLiveCatalog } from "../../hooks/useLiveCatalog.js";

import {
  useShop,
} from "../../context/ShopContext.jsx";

import BookCard, {
  BookCover,
} from "../../components/BookCard/BookCard.jsx";

import "./Home.css";

/* ==========================================
   ANIMATIONS
========================================== */

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 30,
  },

  visible: {
    opacity: 1,
    y: 0,

    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const stagger = {
  hidden: {},

  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05,
    },
  },
};

/* ==========================================
   HOME PAGE
========================================== */

export default function Home() {
  const { books, categories, text } = useLiveCatalog();
  const reducedMotion = useReducedMotion();

  const { addToCart } = useShop();

  /* =====================================
     HOMEPAGE BOOKS
     ONLY 4 BOOKS
  ===================================== */

  const featuredBooks = books.slice(0, 4);

  const spotlightBook = books[0];

  const heroBooks = [
    books[2],
    books[1],
    books[0],
  ].filter(Boolean);

  /* =====================================
     CATEGORIES
  ===================================== */

  const homeCategories = categories
    .filter((category) => category.id !== "all")
    .slice(0, 6);

  function getCategoryLink(pattern) {
    const found = categories.find(
      (category) =>
        category.id !== "all" &&
        pattern.test(category.label)
    );

    return found
      ? `/books?category=${encodeURIComponent(found.id)}`
      : "/books";
  }

  const readingMoods = [
    {
      number: "01",
      title: "أريد أن أسافر...",
      description: "إلى عالم آخر، من مكاني.",
      href: getCategoryLink(/رواي|أدب/),
      symbol: "✦",
    },
    {
      number: "02",
      title: "أحتاج بداية جديدة.",
      description: "فكرة صغيرة، وخطوة إلى الأمام.",
      href: getCategoryLink(/تطوير|ذات/),
      symbol: "↗",
    },
    {
      number: "03",
      title: "لديّ أسئلة كثيرة.",
      description: "وربما كتاب يفتح سؤالًا أجمل.",
      href: getCategoryLink(/فكر|فلسف/),
      symbol: "◎",
    },
  ];

  /* =====================================
     DOCUMENT TITLE
  ===================================== */

  useEffect(() => {
    const oldTitle = document.title;

    document.title =
      "بوصلة | وجهتك التالية تبدأ بكتاب";

    return () => {
      document.title = oldTitle;
    };
  }, []);

  /* =====================================
     ANIMATION PROPERTIES
  ===================================== */

  const sectionMotion = {
    variants: fadeUp,
    initial: reducedMotion ? false : "hidden",
    whileInView: "visible",
    viewport: {
      once: true,
      amount: 0.15,
    },
  };

  /* =====================================
     RENDER
  ===================================== */

  return (
    <main id="main-content" className="b-home">

      {/* =====================================
          HERO
      ===================================== */}

      <section className="b-home-hero">
        <div className="container b-home-hero-layout">

          <motion.div
            className="b-home-hero-content"
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 30,
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
            <p className="b-home-eyebrow">
              <Compass
                size={18}
                strokeWidth={1.5}
              />

              {text("home.hero.eyebrow", "للقراءة وجهة جديدة")}
            </p>

            <h1>
              {text("home.hero.titleLine1", "دع كتابك القادم")}
              <br />
              <span>{text("home.hero.titleLine2", "يغيّر وجهتك.")}</span>
            </h1>

            <p className="b-home-hero-description">
              {text("home.hero.description", "بين حكاية تعيشها وفكرة تلهمك، هناك كتاب يشبهك. اكتشفه في بوصلة، وابدأ رحلة تستحق القراءة.")}
            </p>

            <div className="b-home-hero-actions">
              <Link
                to="/books"
                className="b-home-button-primary"
              >
                {text("home.hero.primaryButton", "اكتشف كتابك القادم")}

                <ArrowUpLeft size={19} />
              </Link>

              <a
                href="#home-categories"
                className="b-home-button-secondary"
              >
                {text("home.hero.secondaryButton", "أين يأخذك فضولك؟")}

                <MoveDownLeft size={18} />
              </a>
            </div>

            <div className="b-home-hero-signature">
              <span className="b-home-signature-line" />

              مساحة للفضول.
              للخيال.
              ولك.
            </div>
          </motion.div>

          {/* HERO BOOK SCENE */}

          <motion.div
            className="b-home-hero-scene"
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    scale: 0.93,
                  }
            }
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.9,
              delay: 0.12,
            }}
          >
            <div
              className="b-home-hero-orbit"
              aria-hidden="true"
            />

            <div
              className="b-home-hero-orbit b-home-hero-orbit-2"
              aria-hidden="true"
            />

            {heroBooks.map((book, index) => (
              <motion.div
                className={`b-home-hero-book b-home-hero-book-${index + 1}`}
                key={book.id}
                whileHover={
                  reducedMotion
                    ? undefined
                    : {
                        y: -16,
                        rotate: 0,
                        scale: 1.05,
                      }
                }
                transition={{
                  duration: 0.35,
                }}
              >
                <Link
                  to={`/books/${book.id}`}
                  aria-label={`عرض كتاب ${book.title}`}
                >
                  <BookCover book={book} />
                </Link>
              </motion.div>
            ))}

            <div className="b-home-hero-seal">
              <Compass
                size={20}
                strokeWidth={1.3}
              />

              <span>
                إحداثيات رحلتك
                <strong>تبدأ من هنا.</strong>
              </span>
            </div>

            <span
              className="b-home-hero-decoration"
              aria-hidden="true"
            >
              ✦
            </span>
          </motion.div>
        </div>

        <div className="b-home-hero-bottom">
          <span>THE BOOKSHELF — BAWSALA</span>

          <a href="#home-categories">
            اكتشف المزيد
            <MoveDownLeft size={18} />
          </a>
        </div>
      </section>

      {/* =====================================
          MARQUEE
      ===================================== */}

      <div
        className="b-home-marquee"
        aria-label="كتب تفتح آفاقًا وأفكار تترك أثرًا"
      >
        <div className="b-home-marquee-track">
          {[0, 1].map((item) => (
            <div
              className="b-home-marquee-group"
              key={item}
              aria-hidden={item === 1}
            >
              <span>✦</span>
              كتب تفتح آفاقًا

              <span>✦</span>
              وأفكار تترك أثرًا

              <span>✦</span>
              وحكايات تبقى معك

              <span>✦</span>
              اتبع فضولك
            </div>
          ))}
        </div>
      </div>

      {/* =====================================
          CATEGORIES
      ===================================== */}

      <section
        id="home-categories"
        className="b-home-categories-section"
      >
        <div className="container">

          <motion.div
            className="b-home-section-header"
            {...sectionMotion}
          >
            <div>
              <p className="b-home-section-kicker">
                <Compass size={17} />
                اتبع فضولك
              </p>

              <h2>
                إلى أين تأخذك
                <span> قراءتك؟</span>
              </h2>

              <p className="b-home-section-description">
                لكل اهتمام رفّ،
                ولكل رفّ حكايات تنتظر اكتشافها.
              </p>
            </div>

            <Link
              to="/books"
              className="b-home-header-link"
            >
              كل التصنيفات

              <ArrowUpLeft size={18} />
            </Link>
          </motion.div>

          <motion.div
            className="b-home-categories-grid"
            variants={stagger}
            initial={
              reducedMotion ? false : "hidden"
            }
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.1,
            }}
          >
            {homeCategories.map((category, index) => (
              <motion.div
                key={category.id}
                variants={fadeUp}
              >
                <Link
                  className="b-home-category-card"
                  to={`/books?category=${encodeURIComponent(
                    category.id
                  )}`}
                >
                  <div className="b-home-category-top">
                    <span>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <ArrowUpLeft size={18} />
                  </div>

                  <div className="b-home-category-symbol">
                    {index === 0
                      ? "✧"
                      : index === 1
                      ? "↗"
                      : index === 2
                      ? "◎"
                      : index === 3
                      ? "⌛"
                      : index === 4
                      ? "◇"
                      : "✦"}
                  </div>

                  <div className="b-home-category-bottom">
                    <h3>{category.label}</h3>

                    <span>
                      اكتشف الكتب
                      <ArrowLeft size={15} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =====================================
          FEATURED BOOKS
          ONLY FOUR — NO FILTERS
      ===================================== */}

      <section
        id="home-books"
        className="b-home-books-section"
      >
        <div className="container">

          <motion.div
            className="b-home-section-header"
            {...sectionMotion}
          >
            <div>
              <p className="b-home-section-kicker">
                <BookOpen size={17} />
                رفّ بوصلة
              </p>

              <h2>
                كتب تناسب
                <span> فضولك.</span>
              </h2>

              <p className="b-home-section-description">
                اخترنا لك أربعة عناوين
                لتبدأ بها رحلتك.
                وللمزيد، تنتظرك مكتبتنا كاملة.
              </p>
            </div>

            <Link
              to="/books"
              className="b-home-header-link"
            >
              استكشف كل الكتب
              <ArrowUpLeft size={18} />
            </Link>
          </motion.div>

          {/* ONLY 4 BOOKS */}

          <motion.div
            className="b-home-featured-grid"
            variants={stagger}
            initial={
              reducedMotion ? false : "hidden"
            }
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.08,
            }}
          >
            {featuredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
              />
            ))}
          </motion.div>

          {/* EXPLORE ALL BOOKS CTA */}

          <motion.div
            className="b-home-explore-all"
            {...sectionMotion}
          >
            <div className="b-home-explore-copy">
              <div className="b-home-explore-icon">
                <Compass
                  size={31}
                  strokeWidth={1.3}
                />
              </div>

              <div>
                <span>هذه مجرد البداية</span>

                <h3>
                  هناك المزيد على رفوف بوصلة.
                </h3>

                <p>
                  جميع الكتب والتصنيفات والبحث
                  والترتيب في مكتبتنا الكاملة.
                </p>
              </div>
            </div>

            <Link
              to="/books"
              className="b-home-explore-button"
            >
              استكشف جميع الكتب

              <ArrowUpLeft size={19} />
            </Link>
          </motion.div>

          <p className="b-home-books-note">
            الأسعار بالدينار الجزائري، والتوفر بحسب المخزون الحالي.
          </p>
        </div>
      </section>

      {/* =====================================
          SPOTLIGHT BOOK
      ===================================== */}

      {spotlightBook && (
        <section
          id="home-spotlight"
          className="b-home-spotlight-section"
        >
          <div className="container b-home-spotlight-layout">

            <motion.div
              className="b-home-spotlight-visual"
              {...sectionMotion}
            >
              <div
                className="b-home-spotlight-orbit"
                aria-hidden="true"
              />

              <motion.div
                className="b-home-spotlight-book"
                whileHover={
                  reducedMotion
                    ? undefined
                    : {
                        y: -12,
                        rotate: -2,
                        scale: 1.025,
                      }
                }
              >
                <Link
                  to={`/books/${spotlightBook.id}`}
                  aria-label={`تفاصيل ${spotlightBook.title}`}
                >
                  <BookCover book={spotlightBook} />
                </Link>
              </motion.div>

              <span className="b-home-spotlight-stamp">
                <Sparkles size={17} />
                تحت الضوء
              </span>
            </motion.div>

            <motion.div
              className="b-home-spotlight-content"
              {...sectionMotion}
            >
              <p className="b-home-section-kicker">
                <Sparkles size={17} />
                اختيار بوصلة
              </p>

              <h2>
                بعض الكتب تنتهي.
                <br />
                <span>وأثرها يبدأ.</span>
              </h2>

              <div className="b-home-spotlight-rule" />

              <span className="b-home-spotlight-label">
                كتاب تحت الضوء
              </span>

              <h3>{spotlightBook.title}</h3>

              <p className="b-home-spotlight-author">
                {spotlightBook.author}
              </p>

              <p className="b-home-spotlight-description">
                {spotlightBook.description ||
                  "كتاب يدعوك إلى اكتشاف أفكار جديدة، ويمنحك مساحة للتأمل وقراءة العالم من زاوية مختلفة."}
              </p>

              <strong className="b-home-spotlight-price">
                {formatPrice(spotlightBook.price)}
              </strong>

              <div className="b-home-spotlight-actions">
                <button
                  type="button"
                  className="b-home-button-primary"
                  onClick={() =>
                    addToCart(spotlightBook.id)
                  }
                >
                  <ShoppingBag size={19} />
                  أضفه إلى رحلتك
                </button>

                <Link
                  className="b-home-spotlight-details"
                  to={`/books/${spotlightBook.id}`}
                >
                  تعرّف على الكتاب
                  <ArrowUpLeft size={18} />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* =====================================
          READING MOODS
      ===================================== */}

      <section className="b-home-moods-section">
        <div className="container">
          <motion.div
            className="b-home-section-header"
            {...sectionMotion}
          >
            <div>
              <p className="b-home-section-kicker">
                <Heart size={17} />
                ليس عليك أن تعرف عنوانه
              </p>

              <h2>
                كيف تريد أن
                <span> تشعر اليوم؟</span>
              </h2>

              <p className="b-home-section-description">
                أحيانًا نختار الكتاب بحسب
                الشعور الذي نبحث عنه.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="b-home-moods-grid"
            variants={stagger}
            initial={
              reducedMotion ? false : "hidden"
            }
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.15,
            }}
          >
            {readingMoods.map((mood) => (
              <motion.div
                key={mood.number}
                variants={fadeUp}
              >
                <Link
                  to={mood.href}
                  className="b-home-mood-card"
                >
                  <div className="b-home-mood-top">
                    <span>{mood.number}</span>
                    <span>{mood.symbol}</span>
                  </div>

                  <h3>{mood.title}</h3>

                  <p>{mood.description}</p>

                  <span className="b-home-mood-action">
                    خذني إلى هناك

                    <ArrowUpLeft size={18} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =====================================
          BAWSALA PHILOSOPHY
      ===================================== */}

      <section className="b-home-philosophy">
        <div className="container b-home-philosophy-inner">
          <motion.div
            {...sectionMotion}
            className="b-home-philosophy-content"
          >
            <p>
              <Feather size={18} />
              فلسفة بوصلة
            </p>

            <h2>
              بين كل صفحتين،
              <br />
              <span>نسخة جديدة منك.</span>
            </h2>

            <p className="b-home-philosophy-description">
              نؤمن أن الكتاب الجيّد لا يعطيك
              كل الإجابات.
              أحيانًا، يكفي أن يدلّك على
              اتجاه لم تفكّر فيه.
            </p>

            <Link to="/books">
              ابحث عن اتجاهك

              <ArrowUpLeft size={18} />
            </Link>
          </motion.div>

          <div
            className="b-home-philosophy-art"
            aria-hidden="true"
          >
            <div className="b-home-philosophy-ring" />
            <Compass
              size={120}
              strokeWidth={0.65}
            />
            <Quote
              className="b-home-philosophy-quote"
              size={34}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
