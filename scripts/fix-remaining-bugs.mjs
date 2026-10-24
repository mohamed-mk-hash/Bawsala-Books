
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

function update(relative, transform) {
  const filename = path.join(root, relative);

  if (!fs.existsSync(filename)) {
    throw new Error(`Missing file: ${relative}`);
  }

  const original = fs.readFileSync(
    filename,
    "utf8"
  );

  const before = original.replace(
    /\r\n/g,
    "\n"
  );

  const after = transform(before);

  if (after === before) {
    console.log("Already updated:", relative);
    return;
  }

  const backup = filename + ".before-fix.bak";

  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, original);
  }

  fs.writeFileSync(filename, after);

  console.log("Fixed:", relative);
}

function mustReplace(content, before, after, name) {
  if (content.includes(after)) {
    return content;
  }

  if (!content.includes(before)) {
    throw new Error(
      `${name}: expected text not found. Stop and send the file.`
    );
  }

  return content.replace(before, after);
}

/* =====================================
   FIX 1: BOOK DETAILS

   Firestore IDs are strings:
   book-004, book-005, etc.
===================================== */

update(
  "src/pages/BookDetails/BookDetails.jsx",
  (src) => {
    // Fix the actual cause of the 404.
    src = src.replace(
      /\bitem\.id\s*===\s*Number\(id\)/g,
      "String(item.id) === String(id)"
    );

    // Support the existing live catalog hook.
    if (!src.includes("useLiveCatalog")) {
      src = mustReplace(
        src,

        `import {
  books,
  categories,
  formatPrice,
} from "../../data/books.js";`,

        `import {
  formatPrice,
} from "../../data/books.js";

import {
  useLiveCatalog,
} from "../../hooks/useLiveCatalog.js";`,

        "BookDetails import"
      );

      src = mustReplace(
        src,

        "export default function BookDetails() {",

        `export default function BookDetails() {
  const {
    books,
    categories,
    revision,
  } = useLiveCatalog();`,

        "BookDetails component"
      );
    }

    // Respect current Firestore stock.
    src = src.replace(
      /\b99\s*-\s*cartQuantity\b/g,

      "Math.min(99, book?.stock ?? 0) - cartQuantity"
    );

    // Refresh related books on Firestore updates.
    if (
      !src.includes("}, [book, revision]);")
    ) {
      src = src.replace(
        /}, \[book\]\);/,
        "}, [book, revision]);"
      );
    }

    // Remove incorrect preview messages.
    src = src.replace(
      `غلاف تصوري ضمن النسخة التجريبية
                لمتجر بوصلة.`,

      `{book.cover
        ? "صورة الغلاف المسجلة للكتاب."
        : "لا توجد صورة غلاف مسجلة."}`
    );

    src = src.replace(
      `السعر تجريبي وقد يتغير عند
                إضافة المخزون الفعلي.`,

      "السعر المعروض هو السعر المسجل حاليًا في المتجر."
    );

    return src;
  }
);

/* =====================================
   FIX 2: CONTACT FORM

   Remove old demo/copy workflow.
   Save directly into Firestore.
===================================== */

update(
  "src/pages/Contact/Contact.jsx",
  (src) => {
    // Previously fixed? Avoid duplicate changes.
    if (src.includes("submitContactMessage")) {
      return src;
    }

    if (
      !src.includes(
        "const CONTACT_API = import.meta.env.VITE_CONTACT_API_URL;"
      )
    ) {
      throw new Error(
        "Contact.jsx has a different submit flow. Please send its current content."
      );
    }

    src = src.replace(
      "const CONTACT_API = import.meta.env.VITE_CONTACT_API_URL;",

      `import {
  submitContactMessage,
} from "../../services/contactMessages.js";`
    );

    const start = src.indexOf(
      "  async function handleSubmit(event) {"
    );

    const end = src.indexOf(
      "\n  return (\n    <main",
      start
    );

    if (start < 0 || end < 0) {
      throw new Error(
        "Contact: could not locate form handler."
      );
    }

    const handler = `
  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setFeedback(null);

    try {
      const id = await submitContactMessage(form);

      setFeedback({
        type: "success",
        message:
          "تم إرسال رسالتك إلى بوصلة بنجاح. رقم الرسالة: " + id,
      });

      setForm({
        name: "",
        email: "",
        topic: "",
        message: "",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error?.message || "تعذّر إرسال الرسالة.",
      });
    } finally {
      setLoading(false);
    }
  }
`;

    src =
      src.slice(0, start) +
      handler +
      src.slice(end);

    // Change copy button into send button.
    src = src.replace(
      /\{loading\s*\?\s*"جارٍ المعالجة\.\.\."\s*:\s*CONTACT_API\s*\?\s*"إرسال الرسالة"\s*:\s*"نسخ الرسالة"\}/,

      `{loading
        ? "جارٍ إرسال الرسالة..."
        : "إرسال الرسالة"}`
    );

    src = src.replace(
      /\{CONTACT_API\s*\?\s*\(\s*<ArrowUpLeft size=\{20\} \/>\s*\)\s*:\s*\(\s*<Copy size=\{19\} \/>\s*\)\}/,

      "<ArrowUpLeft size={20} />"
    );

    // Remove the old demo warning.
    src = src.replace(
      /\s*\{!CONTACT_API\s*&&\s*\(\s*<p className="contact-demo-note">[\s\S]*?<\/p>\s*\)\}/,

      ""
    );

    if (src.includes("CONTACT_API")) {
      throw new Error(
        "Contact: old API references remain."
      );
    }

    return src;
  }
);

console.log(
  "Done: BookDetails and Contact fixed. CSS was not changed."
);
