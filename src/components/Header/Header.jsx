
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  ArrowUpLeft,
  Compass,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
  LogIn,
} from "lucide-react";

import { auth } from "../../firebase.js";

import {
  useShop,
} from "../../context/ShopContext.jsx";

import "./Header.css";

const links = [
  {
    href: "/",
    label: "الرئيسية",
  },
  {
    href: "/books",
    label: "اكتشف الكتب",
  },
  {
    href: "/blog",
    label: "المدونة",
  },
  {
    href: "/contact",
    label: "تواصل معنا",
  },
];

export default function Header() {
  const {
    cartCount,
    favorites,
  } = useShop();

  const { pathname } = useLocation();

  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [user, setUser] = useState(
    () => auth.currentUser
  );

  const [authReady, setAuthReady] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const searchInput = useRef(null);
  const searchButton = useRef(null);
  const menuButton = useRef(null);
  const navRef = useRef(null);

  /* FIREBASE AUTH STATE */

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next);
        setAuthReady(true);
      }),
    []
  );

  /* CLOSE MENUS ON NAVIGATION */

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      navRef.current
        ?.querySelector("a")
        ?.focus();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const frame = requestAnimationFrame(
      () => searchInput.current?.focus()
    );

    return () => cancelAnimationFrame(frame);
  }, [searchOpen]);

  useEffect(() => {
    function escape(event) {
      if (event.key !== "Escape") return;

      if (searchOpen) {
        setSearchOpen(false);
        searchButton.current?.focus();
      }

      if (menuOpen) {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }

    window.addEventListener(
      "keydown",
      escape
    );

    return () =>
      window.removeEventListener(
        "keydown",
        escape
      );
  }, [menuOpen, searchOpen]);

  /* SEARCH */

  function submitSearch(event) {
    event.preventDefault();

    const value = search.trim();

    navigate(
      `/books${
        value
          ? `?q=${encodeURIComponent(value)}`
          : ""
      }#catalog-results`
    );

    setSearchOpen(false);
  }

  const accountPath = user
    ? "/account"
    : "/login";

  const accountLabel = user
    ? "حسابي"
    : "تسجيل الدخول";

  const accountActive = [
    "/account",
    "/login",
    "/signup",
  ].includes(pathname);

  return (
    <>
      {/* ANNOUNCEMENT */}

      <div className="site-announcement">
        <Compass
          size={14}
          aria-hidden="true"
        />
        للقراءة وجهة. ولكل قارئ بوصلة.
      </div>

      {/* HEADER */}

      <header className="site-header">
        <div className="container header-inner">
          {/* LOGO */}

          <Link
            to="/"
            className="site-brand"
            aria-label="بوصلة — الرئيسية"
          >
            <img
              src="/images/bawsala-logo.png"
              alt="بوصلة"
              width="76"
              height="74"
            />
          </Link>

          {/* NAVIGATION */}

          <nav
            ref={navRef}
            id="main-navigation"
            className={`main-navigation ${
              menuOpen ? "is-open" : ""
            }`}
            aria-label="التنقل الرئيسي"
          >
            {links.map(({ href, label }) => {
              const active =
                href === "/"
                  ? pathname === href
                  : pathname === href ||
                    pathname.startsWith(
                      `${href}/`
                    );

              return (
                <Link
                  key={href}
                  to={href}
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  onClick={() =>
                    setMenuOpen(false)
                  }
                >
                  {label}
                </Link>
              );
            })}

            {/* MOBILE ACCOUNT LINK */}

            <Link
              to={accountPath}
              onClick={() =>
                setMenuOpen(false)
              }
              style={{
                display: menuOpen
                  ? "inline-flex"
                  : "none",
                alignItems: "center",
                gap: 6,
              }}
            >
              <UserRound size={16} />
              {accountLabel}
            </Link>
          </nav>

          {/* ACTION BUTTONS */}

          <div className="header-actions">
            {/* LOGIN / ACCOUNT */}

            <motion.div
              className="header-action-motion"
              whileHover={
                reduced
                  ? undefined
                  : { y: -2 }
              }
            >
              <Link
                to={
                  authReady
                    ? accountPath
                    : "/login"
                }
                className={
                  user
                    ? `icon-button header-account-link ${
                        accountActive
                          ? "is-active"
                          : ""
                      }`
                    : "header-account-link"
                }
                aria-current={
                  accountActive
                    ? "page"
                    : undefined
                }
                aria-label={accountLabel}
                title={accountLabel}
                style={
                  user
                    ? undefined
                    : {
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "0 13px",
                        minHeight: 43,
                        borderRadius: 30,
                        fontSize: 11,
                        fontWeight: 800,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        background: "#182c69",
                        color: "#fff",
                        border:
                          "1px solid #182c69",
                      }
                }
              >
                {user ? (
                  <UserRound size={19} />
                ) : (
                  <>
                    <LogIn size={17} />
                    <span>
                      تسجيل الدخول
                    </span>
                  </>
                )}
              </Link>
            </motion.div>

            {/* SEARCH */}

            <motion.button
              type="button"
              ref={searchButton}
              className={`icon-button header-search-trigger ${
                searchOpen
                  ? "is-active"
                  : ""
              }`}
              aria-label={
                searchOpen
                  ? "إغلاق البحث"
                  : "البحث عن كتاب"
              }
              aria-expanded={searchOpen}
              aria-controls={
                searchOpen
                  ? "site-search"
                  : undefined
              }
              onClick={() => {
                setSearchOpen(
                  (value) => !value
                );
                setMenuOpen(false);
              }}
              whileTap={
                reduced
                  ? undefined
                  : { scale: 0.92 }
              }
            >
              {searchOpen ? (
                <X size={19} />
              ) : (
                <Search size={19} />
              )}
            </motion.button>

            {/* FAVORITES */}

            <Link
              to="/favorites"
              className={`icon-button header-count ${
                pathname === "/favorites"
                  ? "is-active"
                  : ""
              }`}
              title="المفضلة"
              aria-label={`المفضلة، ${favorites.length} كتب`}
            >
              <Heart size={19} />

              {favorites.length > 0 && (
                <span aria-hidden="true">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* CART */}

            <Link
              to="/cart"
              className={`icon-button header-count cart-button ${
                pathname === "/cart"
                  ? "is-active"
                  : ""
              }`}
              title="سلة الكتب"
              aria-label={`سلة الكتب، ${cartCount} عناصر`}
            >
              <ShoppingBag size={19} />

              {cartCount > 0 && (
                <span aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* MOBILE MENU */}

            <button
              ref={menuButton}
              type="button"
              className="icon-button mobile-menu-button"
              aria-label={
                menuOpen
                  ? "إغلاق القائمة"
                  : "فتح القائمة"
              }
              aria-expanded={menuOpen}
              aria-controls="main-navigation"
              onClick={() => {
                setMenuOpen(
                  (value) => !value
                );
                setSearchOpen(false);
              }}
            >
              {menuOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}
            </button>
          </div>
        </div>

        {/* SEARCH PANEL */}

        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              key="site-search-panel"
              id="site-search"
              className="site-search"
              initial={
                reduced
                  ? false
                  : {
                      height: 0,
                      opacity: 0,
                    }
              }
              animate={{
                height: "auto",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              transition={{
                duration:
                  reduced ? 0 : 0.3,
              }}
            >
              <form
                className="container search-form"
                role="search"
                onSubmit={submitSearch}
              >
                <Search
                  size={20}
                  className="search-field-icon"
                  aria-hidden="true"
                />

                <label
                  htmlFor="header-search"
                  className="sr-only"
                >
                  ابحث باسم الكتاب أو الكاتب
                </label>

                <input
                  ref={searchInput}
                  id="header-search"
                  name="q"
                  type="search"
                  placeholder="أي كتاب تبحث عنه اليوم؟"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  autoComplete="off"
                />

                <button
                  type="submit"
                  className="button button-primary search-submit"
                >
                  بحث
                  <ArrowUpLeft size={17} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
