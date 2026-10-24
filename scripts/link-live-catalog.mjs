
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const resolve = (name) =>
  path.join(root, name);

/* =====================================
   SAFE FILE UPDATE
===================================== */

function update(relative, replacements) {
  const filename = resolve(relative);

  if (!fs.existsSync(filename)) {
    throw new Error(
      `Missing file: ${relative}`
    );
  }

  let content = fs
    .readFileSync(filename, "utf8")
    .replace(/\r\n/g, "\n");

  let changed = false;

  for (const [before, after] of replacements) {
    if (content.includes(after)) {
      continue;
    }

    if (!content.includes(before)) {
      throw new Error(
        `Cannot find expected content in ${relative}: ${before.slice(0, 70)}`
      );
    }

    content = content.replace(
      before,
      after
    );

    changed = true;
  }

  if (changed) {
    fs.writeFileSync(
      filename +
        ".before-live-catalog.bak",
      fs.readFileSync(filename)
    );

    fs.writeFileSync(
      filename,
      content
    );
  }

  console.log(
    `${changed ? "Updated" : "Already done"}: ${relative}`
  );
}

/* =====================================
   HOME PAGE
===================================== */

update("src/pages/Home/Home.jsx", [
  [
    `import {
  books,
  categories,
  formatPrice,
} from "../../data/books.js";`,

    `import { formatPrice } from "../../data/books.js";
import { useLiveCatalog } from "../../hooks/useLiveCatalog.js";`,
  ],

  [
    `export default function Home() {
  const reducedMotion = useReducedMotion();`,

    `export default function Home() {
  const { books, categories, text } = useLiveCatalog();
  const reducedMotion = useReducedMotion();`,
  ],

  [
    `              للقراءة وجهة جديدة`,

    `              {text("home.hero.eyebrow", "للقراءة وجهة جديدة")}`,
  ],

  [
    `              دع كتابك القادم
              <br />
              <span>يغيّر وجهتك.</span>`,

    `              {text("home.hero.titleLine1", "دع كتابك القادم")}
              <br />
              <span>{text("home.hero.titleLine2", "يغيّر وجهتك.")}</span>`,
  ],

  [
    `              بين حكاية تعيشها وفكرة تلهمك،
              هناك كتاب يشبهك.
              اكتشفه في بوصلة، وابدأ رحلة
              تستحق القراءة.`,

    `              {text("home.hero.description", "بين حكاية تعيشها وفكرة تلهمك، هناك كتاب يشبهك. اكتشفه في بوصلة، وابدأ رحلة تستحق القراءة.")}`,
  ],

  [
    `                اكتشف كتابك القادم`,

    `                {text("home.hero.primaryButton", "اكتشف كتابك القادم")}`,
  ],

  [
    `                أين يأخذك فضولك؟`,

    `                {text("home.hero.secondaryButton", "أين يأخذك فضولك؟")}`,
  ],

  [
    `            مختارات وأسعار تجريبية بالدينار الجزائري
            · أغلفة تصورية صُممت لهذه الواجهة`,

    `            الأسعار بالدينار الجزائري، والتوفر بحسب المخزون الحالي.`,
  ],
]);

/* =====================================
   BOOKS PAGE
===================================== */

update("src/pages/Books/Books.jsx", [
  [
    `import {
  books,
  categories,
} from "../../data/books.js";`,

    `import { useLiveCatalog } from "../../hooks/useLiveCatalog.js";`,
  ],

  [
    `export default function Books() {
  const [searchParams, setSearchParams] =`,

    `export default function Books() {
  const { books, categories, revision } = useLiveCatalog();
  const [searchParams, setSearchParams] =`,
  ],

  [
    `    favorites,
  ]);`,

    `    favorites,
    revision,
  ]);`,
  ],

  [
    `                مختارات تجريبية من مكتبة بوصلة`,

    `                كتب بوصلة المتاحة حاليًا`,
  ],

  [
    `              الأسعار بالدينار الجزائري
              · الأغلفة المعروضة تصورية`,

    `              الأسعار والمخزون تُحدّث مباشرة من بيانات المتجر`,
  ],
]);

/* =====================================
   BOOK DETAILS
===================================== */

update(
  "src/pages/BookDetails/BookDetails.jsx",
  [
    [
      `import {
  books,
  categories,
  formatPrice,
} from "../../data/books.js";`,

      `import { formatPrice } from "../../data/books.js";
import { useLiveCatalog } from "../../hooks/useLiveCatalog.js";`,
    ],

    [
      `export default function BookDetails() {
  const { id } = useParams();`,

      `export default function BookDetails() {
  const { books, categories, revision } = useLiveCatalog();
  const { id } = useParams();`,
    ],

    [
      `  const availableQuantity = Math.max(
    0,
    99 - cartQuantity
  );`,

      `  const availableQuantity = Math.max(
    0,
    Math.min(99, book?.stock ?? 0) - cartQuantity
  );`,
    ],

    [
      `  }, [book]);`,

      `  }, [book, revision]);`,
    ],

    [
      `                غلاف تصوري ضمن النسخة التجريبية
                لمتجر بوصلة.`,

      `                {book.cover
                  ? "صورة الغلاف الفعلية لهذا الكتاب."
                  : "لم تُضف صورة غلاف لهذا الكتاب بعد."}`,
    ],

    [
      `                السعر تجريبي وقد يتغير عند
                إضافة المخزون الفعلي.`,

      `                السعر المعروض هو السعر الحالي في متجر بوصلة.`,
    ],

    [
      `                    يمكنك حاليًا إضافة الكتب إلى
                    سلتك وتعديل الكميات. هذه نسخة
                    تجريبية من المتجر، ولم يتم
                    تفعيل استقبال الطلبات بعد.`,

      `                    يمكنك اختيار الكمية المتاحة وإضافة الكتاب
                    إلى سلّتك ثم الانتقال إلى إتمام الطلب.`,
    ],

    [
      `                    عندما نضيف صفحة إتمام الطلب،
                    سنعرض خيارات التوصيل والأسعار
                    المتاحة حسب الولاية والعنوان،
                    ثم نؤكد المجموع قبل إتمام الطلب.`,

      `                    تُعرض خيارات التوصيل ورسومه قبل تأكيد الطلب.
                    لا يعدّ الطلب مكتملًا قبل تأكيد الاستلام.`,
    ],

    [
      `                      <span>سيُفعّل لاحقًا</span>`,

      `                      <span>حسب حالة الطلب</span>`,
    ],
  ]
);

/* =====================================
   CART
===================================== */

update("src/pages/Cart/Cart.jsx", [
  [
    `import {
  books,
  formatPrice,
} from "../../data/books.js";`,

    `import { formatPrice } from "../../data/books.js";
import { useLiveCatalog } from "../../hooks/useLiveCatalog.js";`,
  ],

  [
    `export default function Cart() {
  const {`,

    `export default function Cart() {
  const { books, revision } = useLiveCatalog();
  const {`,
  ],

  [
    `    [cart]
  );`,

    `    [cart, revision]
  );`,
  ],

  [
    `                  الإجمالي لا يشمل رسوم التوصيل،
                  والأسعار ما زالت تجريبية.`,

    `                  الإجمالي لا يشمل رسوم التوصيل،
                  وتُحسب الأسعار وفق بيانات الكتب الحالية.`,
  ],
]);

/* =====================================
   FAVORITES
===================================== */

update(
  "src/pages/Favorites/Favorites.jsx",
  [
    [
      `import {
  books,
  categories,
  formatPrice,
} from "../../data/books.js";`,

      `import { formatPrice } from "../../data/books.js";
import { useLiveCatalog } from "../../hooks/useLiveCatalog.js";`,
    ],

    [
      `export default function Favorites() {
  const {`,

      `export default function Favorites() {
  const { books, categories, revision } = useLiveCatalog();
  const {`,
    ],

    [
      `    [favorites]
  );`,

      `    [favorites, revision]
  );`,
    ],
  ]
);

console.log(
  "\nCompleted: live book, cart and favorites views. No CSS files changed."
);
