
import fs from "node:fs";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

const root = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  ".."
);

/* =====================================
   SAFE FILE UPDATE
===================================== */

function patch(relative, replacements) {
  const filename = path.join(
    root,
    relative
  );

  if (!fs.existsSync(filename)) {
    throw new Error(
      `Missing file: ${relative}`
    );
  }

  const original = fs.readFileSync(
    filename,
    "utf8"
  );

  let source = original.replace(
    /\r\n/g,
    "\n"
  );

  let changed = false;

  for (const [before, after] of replacements) {
    // Prevent duplicate modifications.
    if (source.includes(after)) {
      continue;
    }

    if (!source.includes(before)) {
      throw new Error(
        `Expected text not found in ${relative}: ${before.slice(0, 110)}`
      );
    }

    source = source.replace(
      before,
      after
    );

    changed = true;
  }

  if (changed) {
    const backup =
      filename +
      ".before-firestore-blog.bak";

    if (!fs.existsSync(backup)) {
      fs.writeFileSync(
        backup,
        original
      );
    }

    fs.writeFileSync(
      filename,
      source
    );
  }

  console.log(
    `${
      changed
        ? "Updated"
        : "Already updated"
    }: ${relative}`
  );
}

/* =====================================
   BLOG LIST PAGE
===================================== */

patch("src/pages/Blog/Blog.jsx", [
  /*
    Remove static global arrays from
    direct imports.
  */

  [
    `import {
  blogCategories,
  blogPosts,
  formatBlogDate,`,

    `import {
  formatBlogDate,`,
  ],

  /*
    Import the live Firestore hook.
  */

  [
    `import BlogCard from "../../components/BlogCard/BlogCard.jsx";`,

    `import BlogCard from "../../components/BlogCard/BlogCard.jsx";
import { useLiveBlog } from "../../hooks/useLiveBlog.js";`,
  ],

  /*
    Obtain fresh article arrays for
    every Firestore revision.
  */

  [
    `export default function Blog() {
  const [params, setParams] = useSearchParams();`,

    `export default function Blog() {
  const { posts: blogPosts, categories: blogCategories, revision, text } = useLiveBlog();
  const [params, setParams] = useSearchParams();`,
  ],

  /*
    Do not crash if Firestore has
    zero published articles.
  */

  [
    `if (isDefault && post.id === featured.id) {`,

    `if (isDefault && featured && post.id === featured.id) {`,
  ],

  /*
    Refresh memoized search results
    when the collection changes.
  */

  [
    `}, [category, q, sort, featured.id]);`,

    `}, [category, q, sort, featured?.id, revision]);`,
  ],

  /*
    Conditionally render the featured
    article only when one exists.
  */

  [
    `          <motion.div
            className="bs-blog-hero__feature"`,

    `          {featured ? (
          <motion.div
            className="bs-blog-hero__feature"`,
  ],

  [
    `          </motion.div>
        </div>
      </section>

      {/* BLOG ARTICLES */}`,

    `          </motion.div>
          ) : (
            <div
              className="bs-blog-hero__feature"
              aria-live="polite"
              style={{
                display: "grid",
                placeItems: "center",
                padding: 28,
                minHeight: 250
              }}
            >
              <div style={{ textAlign: "center" }}>
                <BookOpen
                  size={38}
                  aria-hidden="true"
                  style={{
                    margin: "0 auto 14px"
                  }}
                />

                <p>
                  {text(
                    "blog.listing.empty",
                    "لا توجد مقالات منشورة حاليًا."
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* BLOG ARTICLES */}`,
  ],

  /* =====================================
     CMS TEXT CONTENT
  ===================================== */

  [
    `              مِن دفتر بوصلة`,

    `              {text("blog.hero.eyebrow", "مِن دفتر بوصلة")}`,
  ],

  [
    `              القراءة لا تنتهي
              <br />
              <em>عند آخر صفحة.</em>`,

    `              {text("blog.hero.titleStart", "القراءة لا تنتهي")}
              <br />
              <em>{text("blog.hero.titleEnd", "عند آخر صفحة.")}</em>`,
  ],

  [
    `              مساحة للأفكار التي تولد بين السطور؛ نحكي
              عن الكتب، وعادات القراءة، وكل ما يجعلنا
              نكتشف العالم من زاوية أخرى.`,

    `              {text(
                "blog.hero.description",
                "مساحة للأفكار التي تولد بين السطور؛ نحكي عن الكتب وعادات القراءة وكل ما يجعلنا نكتشف العالم من زاوية أخرى."
              )}`,
  ],

  [
    `                مقال تحت الضوء`,

    `                {text("blog.listing.featured", "مقال تحت الضوء")}`,
  ],

  [
    `                أفكار تستحق <span>التوقّف.</span>`,

    `                {text("blog.listing.title", "أفكار تستحق التوقّف.")}`,
  ],

  [
    `                  placeholder="ابحث عن فكرة أو مقال..."`,

    `                  placeholder={text("blog.listing.search", "ابحث عن فكرة أو مقال...")}`,
  ],

  [
    `                    لم نجد مقالات بهذه الخيارات`,

    `                    {text("blog.listing.empty", "لم نجد مقالات بهذه الخيارات")}`,
  ],

  [
    `                    عرض كل المقالات
                    <ArrowLeft size={17} />`,

    `                    {text("blog.listing.reset", "عرض كل المقالات")}
                    <ArrowLeft size={17} />`,
  ],
]);

/* =====================================
   ARTICLE DETAILS PAGE
===================================== */

patch(
  "src/pages/BlogDetails/BlogDetails.jsx",
  [
    /*
      Replace the static article list
      with a live collection.
    */

    [
      `import {
  blogPosts,
  formatBlogDate,
  getBlogCategory,
  getBlogPost,
} from "../../data/blogs.js";`,

      `import {
  formatBlogDate,
  getBlogCategory,
} from "../../data/blogs.js";
import { useLiveBlog } from "../../hooks/useLiveBlog.js";`,
    ],

    [
      `export default function BlogDetails() {
  const { slug } = useParams();

  const post = getBlogPost(slug);`,

      `export default function BlogDetails() {
  const { slug } = useParams();
  const { posts: blogPosts, revision, text } = useLiveBlog();

  const post = blogPosts.find((entry) => entry.slug === slug);`,
    ],

    /*
      Refresh the article's title when
      Firestore changes the article.
    */

    [
      `  }, [post]);

  /* READING PROGRESS AND TABLE OF CONTENTS */`,

      `  }, [post, revision]);

  /* READING PROGRESS AND TABLE OF CONTENTS */`,
    ],

    /*
      Rebuild the article's table of
      contents after live changes.
    */

    [
      `  }, [post]);

  /* SHARE FEEDBACK */`,

      `  }, [post, revision]);

  /* SHARE FEEDBACK */`,
    ],

    /*
      Recalculate related articles when
      new articles are published.
    */

    [
      `      ...others.filter(
        (item) => item.category !== post.category
      ),
    ].slice(0, 3);
  }, [post]);`,

      `      ...others.filter(
        (item) => item.category !== post.category
      ),
    ].slice(0, 3);
  }, [post, revision]);`,
    ],

    /* =====================================
       CMS CONTENT
    ===================================== */

    [
      `                <small>كتابة وتحرير</small>`,

      `                <small>{text("blogDetails.article.authorRole", "كتابة وتحرير")}</small>`,
    ],

    [
      `                {post.readMinutes} دقائق قراءة`,

      `                {post.readMinutes} {text("blogDetails.article.readingTime", "دقائق قراءة")}`,
    ],

    [
      `              <span>شارك هذه الفكرة</span>`,

      `              <span>{text("blogDetails.article.share", "شارك هذه الفكرة")}</span>`,
    ],

    [
      `              نسخ رابط المقال
            </button>`,

      `              {text("blogDetails.article.copyLink", "نسخ الرابط")}
            </button>`,
    ],

    [
      `                قد يعجبك <span>أيضًا.</span>`,

      `                {text("blogDetails.article.relatedTitle", "قد يعجبك أيضًا.")}`,
    ],

    [
      `          العودة إلى المدونة
        </Link>`,

      `          {text("blogDetails.article.back", "العودة إلى المدونة")}
        </Link>`,
    ],
  ]
);

/* =====================================
   ARTICLE CARD
===================================== */

patch(
  "src/components/BlogCard/BlogCard.jsx",
  [
    /*
      Access editable public website
      text from the content provider.
    */

    [
      `import './BlogCard.css';`,

      `import './BlogCard.css';
import { useStorefront } from '../../context/StorefrontContext.jsx';`,
    ],

    [
      `  const reducedMotion = useReducedMotion();`,

      `  const reducedMotion = useReducedMotion();
  const { text } = useStorefront();`,
    ],

    /*
      Reading time label
    */

    [
      `            {post.readMinutes} دقائق قراءة`,

      `            {post.readMinutes} {text("blog.listing.readTime", "دقائق قراءة")}`,
    ],

    /*
      Read article button
    */

    [
      `            اقرأ المقال

            <ArrowUpLeft`,

      `            {text("blog.listing.readMore", "اقرأ المقال")}

            <ArrowUpLeft`,
    ],
  ]
);

console.log(
  "Done: Blog and article details now follow published Firestore documents."
);
