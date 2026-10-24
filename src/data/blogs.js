
export const blogPosts = [];

export const blogCategories = [
  {
    id: "all",
    label: "كل المقالات",
  },
];

/* =====================================
   READING TIME
===================================== */

function readingMinutes(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return Math.max(
    1,
    Math.ceil(words.length / 200)
  );
}

/* =====================================
   ARTICLE CONTENT PARSER
===================================== */

function parseArticle(content) {
  const blocks = String(content || "")
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const sections = [];

  let lead = "";

  for (const block of blocks) {
    const heading = block.match(
      /^#{1,3}\s+(.+)$/
    );

    if (heading) {
      sections.push({
        id: `section-${sections.length + 1}`,
        heading: heading[1].trim(),
        paragraphs: [],
        bullets: [],
      });

      continue;
    }

    const current = sections.at(-1);

    if (
      !current &&
      !lead &&
      !block.startsWith("- ") &&
      !block.startsWith("> ")
    ) {
      lead = block;
      continue;
    }

    if (!current) {
      sections.push({
        id: "content",
        heading: "المقال",
        paragraphs: [],
        bullets: [],
      });
    }

    const target = sections.at(-1);

    if (block.startsWith("> ")) {
      target.quote = block
        .replace(/^>\s?/gm, "")
        .trim();
    } else if (
      block
        .split("\n")
        .every((line) =>
          /^[-*]\s/.test(line)
        )
    ) {
      target.bullets.push(
        ...block
          .split("\n")
          .map((line) =>
            line.replace(/^[-*]\s/, "")
          )
      );
    } else {
      target.paragraphs.push(block);
    }
  }

  if (
    !lead &&
    sections.length === 0 &&
    content
  ) {
    lead = String(content);
  }

  return {
    lead,
    sections,
  };
}

/* =====================================
   FIRESTORE ARTICLES
===================================== */

export function setPublishedBlogs(documents) {
  const next = documents
    .filter(
      (post) =>
        post &&
        post.status === "published"
    )
    .map((post) => {
      const category = String(
        post.category || "أخرى"
      );

      const {
        lead,
        sections,
      } = parseArticle(post.content);

      const publishedAt =
        post.publishedAt ||
        post.createdAt ||
        "";

      return {
        id: String(post.id),

        slug: String(
          post.slug || post.id
        ),

        title: String(
          post.title || ""
        ),

        excerpt: String(
          post.excerpt || ""
        ),

        category,

        author: String(
          post.author ||
          "فريق تحرير بوصلة"
        ),

        publishedAt:
          String(publishedAt),

        readMinutes:
          readingMinutes(
            post.content
          ),

        featured:
          post.featured === true,

        image: String(
          post.cover ||
          "/images/bawsala-logo.png"
        ),

        imageAlt:
          `صورة مقال ${
            post.title || ""
          }`,

        imagePosition: "center",

        lead:
          lead ||
          String(post.excerpt || ""),

        sections,

        tags: Array.isArray(post.tags)
          ? post.tags
          : [],

        seoTitle: String(
          post.seoTitle || ""
        ),

        seoDescription: String(
          post.seoDescription || ""
        ),
      };
    })
    .sort((a, b) =>
      b.publishedAt.localeCompare(
        a.publishedAt
      )
    );

  blogPosts.splice(
    0,
    blogPosts.length,
    ...next
  );

  const uniqueCategories = [
    ...new Set(
      next.map(
        (post) => post.category
      )
    ),
  ];

  blogCategories.splice(
    0,
    blogCategories.length,

    {
      id: "all",
      label: "كل المقالات",
    },

    ...uniqueCategories.map(
      (label) => ({
        id: label,
        label,
      })
    )
  );
}

/* =====================================
   HELPERS
===================================== */

export function getBlogPost(slug) {
  return blogPosts.find(
    (post) => post.slug === slug
  );
}

export function getBlogCategory(id) {
  return (
    blogCategories.find(
      (category) =>
        category.id === id
    ) || {
      id,
      label: String(id || "أخرى"),
    }
  );
}

export function formatBlogDate(value) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "ar-DZ",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(date);
}

export function normalizeBlogSearch(
  value = ""
) {
  return String(value)
    .toLowerCase()
    .replace(
      /[\u064B-\u065F\u0670ـ]/g,
      ""
    )
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}
