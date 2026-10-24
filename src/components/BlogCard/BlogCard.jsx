
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpLeft, Clock3 } from 'lucide-react';
import {
  formatBlogDate,
  getBlogCategory,
} from '../../data/blogs.js';

import './BlogCard.css';
import { useStorefront } from '../../context/StorefrontContext.jsx';

export const blogCardVariants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.98,
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

export default function BlogCard({
  post,
  variant = 'standard',
}) {
  const reducedMotion = useReducedMotion();
  const { text } = useStorefront();

  return (
    <motion.article
      className={`blog-card blog-card--${variant}`}
      variants={
        reducedMotion ? undefined : blogCardVariants
      }
      whileHover={
        reducedMotion ? undefined : { y: -5 }
      }
      transition={{ duration: 0.28 }}
    >
      <Link
        className="blog-card__image-link"
        to={`/blog/${post.slug}`}
        aria-label={`اقرأ: ${post.title}`}
      >
        <img
          src={post.image}
          alt={post.imageAlt}
          loading="lazy"
          decoding="async"
          style={{
            objectPosition: post.imagePosition || 'center',
          }}
          onError={(event) => {
            event.currentTarget.style.opacity = '0';
          }}
        />

        <span
          className="blog-card__image-mark"
          aria-hidden="true"
        >
          <ArrowUpLeft size={19} />
        </span>
      </Link>

      <div className="blog-card__content">
        <div className="blog-card__meta">
          <span className="blog-card__category">
            {getBlogCategory(post.category).label}
          </span>

          <span
            aria-hidden="true"
            className="blog-card__dot"
          />

          <span>
            {formatBlogDate(post.publishedAt)}
          </span>
        </div>

        <h3>
          <Link to={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        </h3>

        <p className="blog-card__excerpt">
          {post.excerpt}
        </p>

        <div className="blog-card__footer">
          <span>
            <Clock3
              size={15}
              aria-hidden="true"
            />
            {post.readMinutes} {text("blog.listing.readTime", "دقائق قراءة")}
          </span>

          <Link
            to={`/blog/${post.slug}`}
            aria-label={`قراءة مقال ${post.title}`}
          >
            {text("blog.listing.readMore", "اقرأ المقال")}

            <ArrowUpLeft
              size={16}
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
