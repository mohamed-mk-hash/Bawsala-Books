import { Link } from 'react-router-dom';

import {
  Compass,
  ArrowRight,
} from 'lucide-react';

import './NotFound.css';

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="not-found container"
    >
      <Compass
        size={60}
        strokeWidth={1}
      />

      <p className="eyebrow">
        404 · خارج المسار
      </p>

      <h1>
        لنعد إلى وجهة تعرفها.
      </h1>

      <p>
        هذه الصفحة غير موجودة. ستجد
        كتابك القادم في الصفحة الرئيسية.
      </p>

      <Link
        to="/"
        className="button button-primary"
      >
        العودة إلى بوصلة
        <ArrowRight size={18} />
      </Link>
    </main>
  );
}