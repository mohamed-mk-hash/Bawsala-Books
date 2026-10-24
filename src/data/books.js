
export const books = [];

export const categories = [
  {
    id: "all",
    label: "كل الكتب",
  },
];

const knownCategories = {
  "روايات": "novels",
  "روايات وأدب": "novels",
  "أدب": "novels",
  "تطوير الذات": "self",
  "تاريخ وفكر": "thought",
  "فلسفة": "thought",
  "فكر وفلسفة": "thought",
  "تاريخ وسير": "history",
  "مال وأعمال": "business",
  "كتب الأطفال": "kids",
  "عالم الصغار": "kids",
  "علم ومعرفة": "science",
  "دين": "religion",
  "أخرى": "other",
};

const categoryLabels = {
  novels: "روايات وأدب",
  self: "تطوير الذات",
  thought: "فكر وفلسفة",
  history: "تاريخ وسير",
  business: "مال وأعمال",
  kids: "عالم الصغار",
  science: "علم ومعرفة",
  religion: "دين",
  other: "أخرى",
};

export function setPublishedBooks(documents) {
  const next = documents
    .filter(
      (book) =>
        book &&
        book.isPublished === true
    )
    .map((book) => {
      const category = String(
        book.category || "أخرى"
      ).trim();

      const categoryId =
        knownCategories[category] ||
        `custom-${category}`;

      return {
        id: String(book.id),

        title: String(book.title || ""),
        author: String(book.author || ""),

        categoryId,
        category,

        price: Number(book.price) || 0,

        oldPrice:
          Number(book.oldPrice) > 0
            ? Number(book.oldPrice)
            : null,

        stock: Math.max(
          0,
          Math.floor(
            Number(book.stock) || 0
          )
        ),

        sold: Math.max(
          0,
          Number(book.sold) || 0
        ),

        pages: Math.max(
          0,
          Number(book.pages) || 0
        ),

        label: String(
          book.publisher ||
          book.description ||
          ""
        ).slice(0, 75),

        description: String(
          book.description || ""
        ),

        publisher: String(
          book.publisher || ""
        ),

        isbn: String(book.isbn || ""),
        language: String(
          book.language || ""
        ),

        year: book.year ?? null,

        cover:
          typeof book.cover === "string"
            ? book.cover
            : "",

        color: "#eff5f3",

        accent: String(
          book.accent || "#008e82"
        ),

        motif: "orbit",

        tag:
          book.isFeatured === true
            ? "اختيار بوصلة"
            : "",

        isFeatured:
          book.isFeatured === true,

        createdAt: String(
          book.createdAt || ""
        ),
      };
    })
    .sort(
      (a, b) =>
        Number(b.isFeatured) -
          Number(a.isFeatured) ||
        b.createdAt.localeCompare(
          a.createdAt
        )
    );

  // Keep array identity for existing imports.
  books.splice(
    0,
    books.length,
    ...next
  );

  const uniqueCategories = [
    ...new Set(
      next.map(
        (book) => book.categoryId
      )
    ),
  ];

  categories.splice(
    0,
    categories.length,

    {
      id: "all",
      label: "كل الكتب",
    },

    ...uniqueCategories.map((id) => {
      const book = next.find(
        (item) =>
          item.categoryId === id
      );

      return {
        id,
        label:
          categoryLabels[id] ||
          book?.category ||
          "أخرى",
      };
    })
  );
}

export function getBook(id) {
  return books.find(
    (book) =>
      String(book.id) === String(id)
  );
}

const priceFormatter =
  new Intl.NumberFormat("fr-DZ", {
    maximumFractionDigits: 0,
  });

export function formatPrice(value) {
  return `${priceFormatter.format(
    Number(value) || 0
  )} د.ج`;
}
