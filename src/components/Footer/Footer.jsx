
import { Link } from "react-router-dom";

import {
  ArrowUpLeft,
  Compass,
} from "lucide-react";

import {
  motion,
  useReducedMotion,
} from "motion/react";

import "./Footer.css";

export default function Footer() {
  const reduced = useReducedMotion();

  return (
    <footer className="site-footer">
      <motion.div
        className="container footer-grid"
        initial={
          reduced
            ? false
            : { opacity: 0, y: 20 }
        }
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{
          once: true,
          amount: 0.15,
        }}
        transition={{
          duration: 0.5,
        }}
      >
        {/* BRAND */}

        <div className="footer-brand">
          <Link
            to="/"
            className="footer-logo"
            aria-label="بوصلة — الصفحة الرئيسية"
          >
            <img
              src="/images/bawsala-logo.png"
              alt="بوصلة"
              width="76"
              height="74"
            />
          </Link>

          <h2>
            قصتك القادمة، تبدأ بكتاب.
          </h2>

          <p>
            بوصلة مساحة لاكتشاف الكتب التي
            تثير فضولك، وتفتح لك أبوابًا
            إلى أفكار وعوالم جديدة.
          </p>
        </div>

        {/* PAGES */}

        <div className="footer-links">
          <h3>اكتشف بوصلة</h3>

          <Link to="/">
            الرئيسية
          </Link>

          <Link to="/books">
            تصفح الكتب
          </Link>

          <Link to="/blog">
            المدونة
          </Link>

          <Link to="/contact">
            تواصل معنا
          </Link>
          <Link to="/account">
          حسابي وطلباتي
          </Link>
        </div>

        {/* PERSONAL SHELF */}

        <div className="footer-links">
          <h3>رفّك الخاص</h3>

          <Link to="/favorites">
            الكتب المفضلة
          </Link>

          <Link to="/cart">
            سلة الكتب
          </Link>

          <Link
            to="/books"
            className="footer-discover"
          >
            اعثر على كتابك
            <ArrowUpLeft
              size={16}
              aria-hidden="true"
            />
          </Link>
        </div>
      </motion.div>

      {/* FOOTER BOTTOM */}

      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} بوصلة.
          كل حكاية تستحق أن تُقرأ.
        </span>

        <span className="footer-demo">
          نسخة عرض · الكتب والأسعار والأغلفة
          للتجربة.
        </span>

        <span className="footer-signature">
          <Compass
            size={15}
            aria-hidden="true"
          />

          اتبع فضولك.
        </span>
      </div>
    </footer>
  );
}
