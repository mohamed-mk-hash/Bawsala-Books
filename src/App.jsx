
import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { MotionConfig } from "motion/react";

import { ShopProvider } from "./context/ShopContext.jsx";
import { StorefrontProvider } from "./context/StorefrontContext.jsx";

import Header from "./components/Header/Header.jsx";
import Footer from "./components/Footer/Footer.jsx";
import ShopDialog from "./components/ShopDialog/ShopDialog.jsx";

import Home from "./pages/Home/Home.jsx";
import Books from "./pages/Books/Books.jsx";
import BookDetails from "./pages/BookDetails/BookDetails.jsx";
import Blog from "./pages/Blog/Blog.jsx";
import BlogDetails from "./pages/BlogDetails/BlogDetails.jsx";
import Contact from "./pages/Contact/Contact.jsx";
import Cart from "./pages/Cart/Cart.jsx";
import Favorites from "./pages/Favorites/Favorites.jsx";
import Checkout from "./pages/Checkout/Checkout.jsx";
import Account from "./pages/Account/Account.jsx";
import NotFound from "./pages/NotFound/NotFound.jsx";

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const element = hash
        ? document.getElementById(
            decodeURIComponent(hash.slice(1))
          )
        : null;

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        window.scrollTo({
          top: 0,
          behavior: "instant",
        });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StorefrontProvider>
        <ShopProvider>
          <ScrollManager />

          <a href="#main-content" className="skip-link">
            انتقل إلى المحتوى
          </a>

          <Header />

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/books" element={<Books />} />
            <Route
              path="/books/:id"
              element={<BookDetails />}
            />
            <Route path="/blog" element={<Blog />} />
            <Route
              path="/blog/:slug"
              element={<BlogDetails />}
            />
            <Route path="/contact" element={<Contact />} />
            <Route path="/cart" element={<Cart />} />
            <Route
              path="/favorites"
              element={<Favorites />}
            />
            <Route
              path="/checkout"
              element={<Checkout />}
            />

            {/* LOGIN AND SIGNUP: SAME COMPONENT AND CSS */}
            <Route
              path="/login"
              element={<Account mode="login" />}
            />
            <Route
              path="/signup"
              element={<Account mode="signup" />}
            />
            <Route
              path="/account"
              element={<Account mode="account" />}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>

          <Footer />
          <ShopDialog />
        </ShopProvider>
      </StorefrontProvider>
    </MotionConfig>
  );
}
