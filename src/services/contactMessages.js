
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase.js";

const topics = {
  books: "استفسار عن كتاب",
  orders: "الطلبات والتوصيل",
  partnerships: "التعاون والشراكات",
  other: "استفسار آخر",
};

export async function submitContactMessage(form) {
  const name = String(form.name || "").trim();

  const email = String(form.email || "")
    .trim()
    .toLowerCase();

  const topic = String(form.topic || "");

  const message = String(form.message || "").trim();

  if (name.length < 2 || name.length > 100) {
    throw new Error("أدخل اسمًا صحيحًا.");
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    throw new Error("تحقق من البريد الإلكتروني.");
  }

  if (!topics[topic]) {
    throw new Error("اختر موضوع الرسالة.");
  }

  if (message.length < 10 || message.length > 3000) {
    throw new Error(
      "يجب أن تحتوي الرسالة على 10 إلى 3000 حرف."
    );
  }

  const reference = doc(
    collection(db, "contactMessages")
  );

  try {
    await setDoc(reference, {
      id: reference.id,

      name,
      email,
      phone: "",

      topic,
      subject: topics[topic],
      message,

      date: new Date().toISOString(),
      createdAt: serverTimestamp(),

      read: false,
      archived: false,
      priority: "normal",
      replied: false,

      repliedAt: null,
      replyDraft: "",
      adminNote: "",

      source: "website",
    });

    return reference.id;
  } catch (error) {
    console.error("Contact Firestore error:", error);

    if (error?.code === "permission-denied") {
      throw new Error(
        "رفض Firestore حفظ الرسالة. تأكد من نشر قواعد contactMessages الصحيحة."
      );
    }

    throw new Error(
      "تعذّر إرسال الرسالة. تحقق من الاتصال وحاول مجددًا."
    );
  }
}
