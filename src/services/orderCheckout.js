
import {
  doc,
  setDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase.js";

import {
  getBook,
} from "../data/books.js";

import {
  getStoreSettings,
} from "../context/StorefrontContext.jsx";

/* =====================================
   CONFIG
===================================== */

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  ""
).replace(/\/$/, "");

/* =====================================
   SHIPPING ESTIMATE
===================================== */

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(
      /[\u064B-\u065F\u0670ـ]/g,
      ""
    )
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .trim();
}

export function estimateShipping(
  shipping = {},
  wilaya = "",
  subtotal = 0
) {
  let fee = Number(
    shipping.defaultFee
  );

  if (
    !Number.isInteger(fee) ||
    fee < 0
  ) {
    fee = 0;
  }

  const zone = (
    Array.isArray(shipping.zones)
      ? shipping.zones
      : []
  ).find(
    (item) =>
      item.enabled !== false &&
      String(item.wilayas || "")
        .split(/[,;،\n]+/)
        .some(
          (name) =>
            normalize(name) ===
            normalize(wilaya)
        )
  );

  if (zone) {
    const price = Number(
      zone.price
    );

    if (
      Number.isInteger(price) &&
      price >= 0
    ) {
      fee = price;
    }
  }

  if (
    shipping.freeShippingEnabled === true &&
    Number(
      shipping.freeShippingThreshold
    ) > 0 &&
    subtotal >=
      Number(
        shipping.freeShippingThreshold
      )
  ) {
    return 0;
  }

  return fee;
}

/* =====================================
   FIREBASE AUTH TOKEN FOR SERVER
===================================== */

async function authHeaders() {
  const user =
    auth.currentUser;

  if (!user) {
    throw new Error(
      "يرجى تسجيل الدخول لاستخدام PayPal."
    );
  }

  const token =
    await user.getIdToken();

  return {
    "Content-Type":
      "application/json",

    Authorization:
      `Bearer ${token}`,
  };
}

/* =====================================
   SERVER REQUEST
===================================== */

async function apiPost(
  endpoint,
  payload
) {
  const headers =
    await authHeaders();

  let response;

  try {
    response = await fetch(
      `${API_BASE}${endpoint}`,
      {
        method: "POST",
        headers,

        body:
          JSON.stringify(
            payload
          ),

        signal:
          AbortSignal.timeout(40000),
      }
    );
  } catch (error) {
    throw new Error(
      "تعذّر الاتصال بخادم PayPal. تأكد أنه يعمل على المنفذ 5011."
    );
  }

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      "فشل طلب PayPal."
    );
  }

  return data;
}

/* =====================================
   PAYPAL — CREATE
===================================== */

export async function createPayPalOrder(
  form,
  cart,
  requestId
) {
  return apiPost(
    "/api/paypal/create",

    {
      requestId,

      form,

      items: cart.map(
        (item) => ({
          bookId:
            String(item.id),

          quantity:
            Number(
              item.quantity
            ),
        })
      ),
    }
  );
}

/* =====================================
   PAYPAL — CAPTURE
===================================== */

export async function capturePayPalOrder(
  requestId,
  paypalOrderId
) {
  return apiPost(
    "/api/paypal/capture",

    {
      requestId,
      paypalOrderId,
    }
  );
}

/* =====================================
   CASH ON DELIVERY

   Retains the free Spark workflow.

   Prices remain pending admin review.
===================================== */

export async function placeBookOrder(
  form,
  cart,
  requestId
) {
  if (
    !/^bz-[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(
      String(requestId)
    )
  ) {
    throw new Error(
      "معرّف الطلب غير صالح."
    );
  }

  const customerName = String(
    form.fullName || ""
  ).trim();

  const customerPhone = String(
    form.phone || ""
  ).replace(/[\s-]/g, "");

  const customerEmail = String(
    form.email || ""
  )
    .trim()
    .toLowerCase();

  const wilaya = String(
    form.wilaya || ""
  ).trim();

  const commune = String(
    form.commune || ""
  ).trim();

  const address = String(
    form.address || ""
  ).trim();

  const customerNote = String(
    form.notes || ""
  ).trim();

  if (
    customerName.length < 3 ||
    customerName.length > 100 ||
    !/^(?:\+213|0)[567]\d{8}$/.test(
      customerPhone
    ) ||
    (
      customerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        customerEmail
      )
    ) ||
    !wilaya ||
    commune.length > 80 ||
    !commune ||
    wilaya.length > 80 ||
    address.length < 8 ||
    address.length > 250 ||
    customerNote.length > 500
  ) {
    throw new Error(
      "بيانات الطلب أو العنوان غير صحيحة."
    );
  }

  if (
    !Array.isArray(cart) ||
    cart.length < 1 ||
    cart.length > 20
  ) {
    throw new Error(
      "السلة فارغة أو غير صالحة."
    );
  }

  const seen =
    new Set();

  const items =
    cart.map(
      (line) => {
        const bookId =
          String(
            line.id || ""
          );

        const quantity =
          Number(
            line.quantity
          );

        if (
          !bookId ||
          seen.has(bookId) ||
          !Number.isInteger(
            quantity
          ) ||
          quantity < 1 ||
          quantity > 99
        ) {
          throw new Error(
            "كتاب أو كمية غير صحيحة."
          );
        }

        seen.add(
          bookId
        );

        const book =
          getBook(
            bookId
          );

        if (
          !book ||
          !Number.isInteger(
            Number(book.price)
          ) ||
          Number(book.price) <= 0 ||
          Number(book.stock) <
            quantity
        ) {
          throw new Error(
            `الكتاب ${
              book?.title ||
              bookId
            } غير متاح بهذه الكمية.`
          );
        }

        return {
          bookId,

          title:
            String(
              book.title
            ),

          author:
            String(
              book.author ||
              ""
            ),

          unitPrice:
            Number(
              book.price
            ),

          quantity,
        };
      }
    );

  const subtotal =
    items.reduce(
      (sum, item) =>
        sum +
        item.unitPrice *
          item.quantity,

      0
    );

  const settings =
    getStoreSettings();

  if (
    !settings?.system ||
    !settings?.shipping ||
    !settings?.payments
  ) {
    throw new Error(
      "إعدادات المتجر العامة غير جاهزة."
    );
  }

  if (
    settings.system
      .acceptOrders === false ||
    settings.system
      .maintenanceMode === true ||
    settings.shipping
      .homeDelivery === false ||
    settings.payments
      .cashOnDelivery === false
  ) {
    throw new Error(
      "الدفع عند الاستلام غير متاح حاليًا."
    );
  }

  const shippingFee =
    estimateShipping(
      settings.shipping,
      wilaya,
      subtotal
    );

  const total =
    subtotal +
    shippingFee;

  if (
    !Number.isSafeInteger(
      total
    ) ||
    total <= 0 ||
    total > 101000000
  ) {
    throw new Error(
      "مبلغ الطلب غير صحيح."
    );
  }

  const now =
    new Date()
      .toISOString();

  const order = {
    id:
      requestId,

    customerName,
    customerPhone,
    customerEmail,

    wilaya,
    commune,
    address,
    customerNote,

    items,

    subtotal,
    shippingFee,
    total,

    pricingVerified:
      false,

    pricingStatus:
      "pending_admin_verification",

    status:
      "new",

    paymentStatus:
      "pending",

    paymentMethod:
      "cash_on_delivery",

    deliveryMethod:
      "home",

    carrier: "",
    trackingNumber: "",
    adminNote: "",
    archived: false,

    source:
      "website",

    createdAt:
      now,

    updatedAt:
      now,

    history: [
      {
        id:
          `created-${requestId}`,

        status:
          "new",

        date:
          now,

        note:
          "طلب الدفع عند الاستلام بانتظار مراجعة الإدارة.",
      },
    ],

    ...(auth.currentUser
      ? {
          customerUid:
            auth.currentUser.uid,
        }
      : {}),
  };

  try {
    await setDoc(
      doc(
        db,
        "orders",
        requestId
      ),

      order
    );

    return {
      id:
        requestId,

      subtotal,
      shippingFee,
      total,

      status:
        "new",

      paymentStatus:
        "pending",
    };
  } catch (error) {
    console.error(
      "COD order failed:",
      error
    );

    if (
      error?.code ===
      "permission-denied"
    ) {
      throw new Error(
        "رفض Firestore حفظ الطلب. تحقق من قواعد الطلبات."
      );
    }

    throw new Error(
      error?.message ||
      "تعذّر إرسال الطلب."
    );
  }
}
