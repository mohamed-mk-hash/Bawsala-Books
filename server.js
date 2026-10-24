
import express from "express";
import cors from "cors";
import crypto from "node:crypto";

import {
  initializeApp,
  applicationDefault,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/* =====================================================
   CONFIGURATION: PAYPAL SANDBOX + FIREBASE ADMIN
===================================================== */

const required = [
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "FIREBASE_PROJECT_ID",
  "PAYPAL_DZD_PER_USD",
];

for (const name of required) {
  if (!process.env[name]?.trim()) {
    throw new Error(
      `Missing environment variable: ${name}`
    );
  }
}

const RATE = Number(
  process.env.PAYPAL_DZD_PER_USD
);

const PORT = Number(
  process.env.PORT || 5011
);

const PAYPAL_BASE =
  "https://api-m.sandbox.paypal.com";

if (!Number.isFinite(RATE) || RATE <= 0) {
  throw new Error(
    "Invalid PAYPAL_DZD_PER_USD"
  );
}

/* =====================================================
   FIREBASE ADMIN
===================================================== */

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = getFirestore();
const firebaseAuth = getAuth();

/* =====================================================
   EXPRESS
===================================================== */

const app = express();

const origins = (
  process.env.CLIENT_ORIGINS ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origins,
  })
);

app.use(
  express.json({
    limit: "16kb",
  })
);

/* =====================================================
   ERROR HELPERS
===================================================== */

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function field(value, max = 250) {
  return typeof value === "string"
    ? value.trim().slice(0, max + 1)
    : "";
}

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

/* =====================================================
   SHIPPING

   Calculated from private Firestore settings.
===================================================== */

function shippingFee(settings, wilaya, subtotal) {
  const shipping = settings.shipping || {};

  if (shipping.homeDelivery === false) {
    fail(
      409,
      "التوصيل غير متاح حاليًا."
    );
  }

  let fee = Number(
    shipping.defaultFee
  );

  if (
    !Number.isInteger(fee) ||
    fee < 0
  ) {
    fail(
      409,
      "رسوم التوصيل غير مضبوطة في لوحة الإدارة."
    );
  }

  const zone = (
    Array.isArray(shipping.zones)
      ? shipping.zones
      : []
  ).find(
    (entry) =>
      entry.enabled !== false &&
      String(entry.wilayas || "")
        .split(/[,;،\n]+/)
        .some(
          (name) =>
            normalize(name) ===
            normalize(wilaya)
        )
  );

  if (zone) {
    fee = Number(zone.price);

    if (
      !Number.isInteger(fee) ||
      fee < 0
    ) {
      fail(
        409,
        "رسوم التوصيل لهذه الولاية غير صالحة."
      );
    }
  }

  if (
    shipping.freeShippingEnabled === true &&
    Number(
      shipping.freeShippingThreshold
    ) > 0 &&
    subtotal >= Number(
      shipping.freeShippingThreshold
    )
  ) {
    return 0;
  }

  return fee;
}

/* =====================================================
   VALIDATION REGEX
===================================================== */

const REQUEST_ID_RE =
  /^bz-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

const PAYPAL_ID_RE =
  /^[A-Z0-9]{8,40}$/;

/* =====================================================
   VALIDATE CUSTOMER REQUEST
===================================================== */

function parseRequest(body) {
  if (
    !body ||
    typeof body !== "object"
  ) {
    fail(
      400,
      "بيانات الطلب مفقودة."
    );
  }

  const requestId = field(
    body.requestId,
    40
  );

  if (!REQUEST_ID_RE.test(requestId)) {
    fail(
      400,
      "معرّف الطلب غير صحيح."
    );
  }

  const form = body.form || {};

  const customerName = field(
    form.fullName,
    100
  );

  const customerPhone = field(
    form.phone,
    25
  ).replace(/[\s-]/g, "");

  const customerEmail = field(
    form.email,
    150
  ).toLowerCase();

  const wilaya = field(
    form.wilaya,
    80
  );

  const commune = field(
    form.commune,
    80
  );

  const address = field(
    form.address,
    250
  );

  const customerNote = field(
    form.notes,
    500
  );

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
    wilaya.length > 80 ||
    !commune ||
    commune.length > 80 ||
    address.length < 8 ||
    address.length > 250 ||
    customerNote.length > 500
  ) {
    fail(
      400,
      "بيانات الزبون أو العنوان غير صحيحة."
    );
  }

  if (
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > 20
  ) {
    fail(
      400,
      "السلة غير صالحة."
    );
  }

  const seen = new Set();

  const items = body.items.map(
    (item) => {
      const bookId = field(
        item?.bookId,
        150
      );

      const quantity = item?.quantity;

      if (
        !bookId ||
        bookId.length > 150 ||
        bookId.includes("/") ||
        seen.has(bookId) ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      ) {
        fail(
          400,
          "أحد الكتب أو الكميات غير صالح."
        );
      }

      seen.add(bookId);

      return {
        bookId,
        quantity,
      };
    }
  );

  return {
    requestId,
    customerName,
    customerPhone,
    customerEmail,
    wilaya,
    commune,
    address,
    customerNote,
    items,
  };
}

/* =====================================================
   FIREBASE ID TOKEN AUTHENTICATION
===================================================== */

async function authenticated(
  req,
  _res,
  next
) {
  try {
    const match =
      /^Bearer (.+)$/.exec(
        req.headers.authorization || ""
      );

    if (!match) {
      fail(
        401,
        "سجّل الدخول قبل استخدام PayPal."
      );
    }

    req.user =
      await firebaseAuth.verifyIdToken(
        match[1],
        true
      );

    next();
  } catch (error) {
    next(error);
  }
}

/* =====================================================
   PAYPAL ACCESS TOKEN
===================================================== */

async function accessToken() {
  const credentials = Buffer.from(
    `${
      process.env.PAYPAL_CLIENT_ID.trim()
    }:${
      process.env.PAYPAL_CLIENT_SECRET.trim()
    }`
  ).toString("base64");

  const response = await fetch(
    `${PAYPAL_BASE}/v1/oauth2/token`,
    {
      method: "POST",

      headers: {
        Authorization: `Basic ${credentials}`,

        "Content-Type":
          "application/x-www-form-urlencoded",

        Accept: "application/json",
      },

      body:
        "grant_type=client_credentials",

      signal:
        AbortSignal.timeout(15000),
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (
    !response.ok ||
    !data.access_token
  ) {
    console.error(
      "PayPal OAuth failed:",
      {
        httpStatus: response.status,

        error:
          data.error || null,

        debugId:
          response.headers.get(
            "paypal-debug-id"
          ),
      }
    );

    fail(
      502,
      "تعذرت مصادقة حساب PayPal Sandbox التجاري."
    );
  }

  return data.access_token;
}

/* =====================================================
   PAYPAL REST API REQUEST
===================================================== */

async function paypal(
  path,
  method = "GET",
  body,
  requestKey
) {
  const token =
    await accessToken();

  const headers = {
    Authorization:
      `Bearer ${token}`,

    "Content-Type":
      "application/json",

    Accept:
      "application/json",
  };

  if (requestKey) {
    headers["PayPal-Request-Id"] =
      requestKey;
  }

  const response = await fetch(
    `${PAYPAL_BASE}${path}`,
    {
      method,

      headers,

      ...(
        body !== undefined
          ? {
              body: JSON.stringify(body),
            }
          : {}
      ),

      signal:
        AbortSignal.timeout(20000),
    }
  );

  const result = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    const issue =
      result.details?.[0]?.issue ||
      result.name ||
      String(response.status);

    const debugId =
      response.headers.get(
        "paypal-debug-id"
      ) ||
      result.debug_id;

    console.error(
      "PayPal Sandbox error:",
      {
        path,
        httpStatus:
          response.status,

        issue,

        debugId:
          debugId || null,
      }
    );

    fail(
      502,
      `تعذرت عملية PayPal (${issue}).`
    );
  }

  return result;
}

/* =====================================================
   HELPERS
===================================================== */

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(value)
    )
    .digest("hex");
}

/*
  Convert USD to integer cents.

  Examples:
  "17.78" -> 1778
  "17.8"  -> 1780
  "17.80" -> 1780
*/

function dollarsToCents(value) {
  const input =
    String(value ?? "");

  if (
    !/^\d+(?:\.\d{1,2})?$/.test(input)
  ) {
    return NaN;
  }

  const [
    whole,
    fractional = "",
  ] = input.split(".");

  const result =
    Number(whole) * 100 +
    Number(
      fractional.padEnd(2, "0")
    );

  return Number.isSafeInteger(result)
    ? result
    : NaN;
}

/* =====================================================
   SERVER HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (_req, res) => {
    res.json({
      ok: true,
      mode: "sandbox",
    });
  }
);

/* =====================================================
   CREATE PAYPAL ORDER

   Prices and inventory are read
   directly from Firestore.

   PayPal order is saved as pending
   until capture is confirmed.
===================================================== */

app.post(
  "/api/paypal/create",
  authenticated,

  async (req, res, next) => {
    try {
      const data =
        parseRequest(req.body);

      const fingerprint =
        digest({
          uid: req.user.uid,
          ...data,
        });

      const orderRef = db
        .collection("orders")
        .doc(data.requestId);

      /* EXISTING ORDER / RETRY */

      const previous =
        await orderRef.get();

      if (previous.exists) {
        const saved =
          previous.data();

        if (
          saved.customerUid !==
            req.user.uid ||
          saved.paymentMethod !==
            "paypal" ||
          saved.requestFingerprint !==
            fingerprint
        ) {
          fail(
            409,
            "معرّف الطلب مستخدم لبيانات أخرى. ابدأ طلبًا جديدًا."
          );
        }

        if (
          saved.paymentStatus ===
          "paid"
        ) {
          fail(
            409,
            "هذا الطلب مدفوع بالفعل. راجعه داخل حسابك ولا تدفع مرة أخرى."
          );
        }

        if (
          saved.status === "cancelled" ||
          saved.status === "canceled"
        ) {
          fail(
            409,
            "هذا الطلب ملغى. ابدأ طلبًا جديدًا."
          );
        }

        return res.json({
          id: data.requestId,

          paypalOrderId:
            saved.paypalOrderId,

          usd:
            saved.paypalAmountUSD,

          dzd:
            saved.total,

          currency: "USD",
        });
      }

      /* READ SETTINGS AND BOOKS */

      const [
        settingsSnap,
        ...bookSnaps
      ] = await Promise.all([
        db
          .doc("settings/store")
          .get(),

        ...data.items.map(
          (item) =>
            db
              .collection("books")
              .doc(item.bookId)
              .get()
        ),
      ]);

      if (!settingsSnap.exists) {
        fail(
          409,
          "إعدادات الإدارة غير متاحة."
        );
      }

      const settings =
        settingsSnap.data();

      if (
        settings.system
          ?.maintenanceMode === true ||
        settings.system
          ?.acceptOrders === false
      ) {
        fail(
          409,
          "استقبال الطلبات متوقف مؤقتًا."
        );
      }

      /* VALIDATE PRICES AND STOCK */

      let subtotal = 0;

      const orderItems =
        data.items.map(
          (line, index) => {
            const snap =
              bookSnaps[index];

            const book =
              snap.exists
                ? snap.data()
                : null;

            if (
              !book ||
              book.isPublished !== true
            ) {
              fail(
                409,
                "أحد الكتب غير متاح للبيع."
              );
            }

            const price =
              Number(book.price);

            const stock =
              Number(book.stock);

            if (
              !Number.isSafeInteger(price) ||
              price <= 0 ||
              !Number.isSafeInteger(stock) ||
              stock < line.quantity
            ) {
              fail(
                409,
                `الكمية غير متوفرة: ${
                  book.title ||
                  line.bookId
                }`
              );
            }

            subtotal +=
              price * line.quantity;

            return {
              bookId:
                line.bookId,

              title:
                String(
                  book.title || ""
                ),

              author:
                String(
                  book.author || ""
                ),

              unitPrice:
                price,

              quantity:
                line.quantity,
            };
          }
        );

      if (
        !Number.isSafeInteger(subtotal) ||
        subtotal <= 0 ||
        subtotal > 100000000
      ) {
        fail(
          400,
          "إجمالي السلة غير صحيح."
        );
      }

      /* SHIPPING AND CURRENCY */

      const fee = shippingFee(
        settings,
        data.wilaya,
        subtotal
      );

      const total =
        subtotal + fee;

      const usdCents =
        Math.round(
          (total / RATE) * 100
        );

      if (
        !Number.isSafeInteger(total) ||
        !Number.isSafeInteger(usdCents) ||
        usdCents < 1
      ) {
        fail(
          400,
          "مبلغ PayPal غير صالح."
        );
      }

      const usd =
        (usdCents / 100)
          .toFixed(2);

      /* CREATE ORDER AT PAYPAL */

      const remote =
        await paypal(
          "/v2/checkout/orders",

          "POST",

          {
            intent: "CAPTURE",

            purchase_units: [
              {
                reference_id:
                  data.requestId,

                custom_id:
                  data.requestId,

                description:
                  "Bawsala bookstore sandbox payment",

                amount: {
                  currency_code:
                    "USD",

                  value: usd,
                },
              },
            ],
          },

          data.requestId
        );

      if (
        !remote.id ||
        !PAYPAL_ID_RE.test(remote.id)
      ) {
        fail(
          502,
          "PayPal لم يرجع معرّفًا صالحًا للطلب."
        );
      }

      /* SAVE PENDING ORDER IN FIRESTORE */

      const now =
        new Date().toISOString();

      const record = {
        id:
          data.requestId,

        customerUid:
          req.user.uid,

        customerName:
          data.customerName,

        customerPhone:
          data.customerPhone,

        customerEmail:
          data.customerEmail ||
          req.user.email ||
          "",

        wilaya:
          data.wilaya,

        commune:
          data.commune,

        address:
          data.address,

        customerNote:
          data.customerNote,

        items:
          orderItems,

        subtotal,
        shippingFee: fee,
        total,

        pricingVerified: true,

        pricingStatus:
          "verified_by_server",

        paymentMethod:
          "paypal",

        paymentStatus:
          "pending",

        status:
          "new",

        deliveryMethod:
          "home",

        carrier: "",
        trackingNumber: "",
        adminNote: "",

        archived: false,

        source:
          "website",

        paypalOrderId:
          remote.id,

        paypalCurrency:
          "USD",

        paypalAmountUSD:
          usd,

        exchangeRateDZDPerUSD:
          RATE,

        requestFingerprint:
          fingerprint,

        createdAt:
          now,

        updatedAt:
          now,

        history: [
          {
            id:
              `created-${data.requestId}`,

            status:
              "new",

            date:
              now,

            note:
              "تم إنشاء طلب PayPal Sandbox وبانتظار تأكيد الدفع.",
          },
        ],
      };

      try {
        await orderRef.create(
          record
        );
      } catch (error) {
        if (
          error.code !== 6 &&
          error.code !== "already-exists"
        ) {
          throw error;
        }

        const latest =
          (
            await orderRef.get()
          ).data();

        if (
          latest?.customerUid !==
            req.user.uid ||
          latest?.requestFingerprint !==
            fingerprint ||
          latest?.paymentMethod !==
            "paypal"
        ) {
          fail(
            409,
            "تم استخدام معرّف الطلب."
          );
        }

        return res.json({
          id:
            data.requestId,

          paypalOrderId:
            latest.paypalOrderId,

          usd:
            latest.paypalAmountUSD,

          dzd:
            latest.total,

          currency:
            "USD",
        });
      }

      return res.json({
        id:
          data.requestId,

        paypalOrderId:
          remote.id,

        usd,
        dzd: total,

        currency:
          "USD",
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =====================================================
   CAPTURE PAYPAL PAYMENT

   FIXED VERSION:

   1. Verify Firebase identity.
   2. Read existing Firestore order.
   3. Check PayPal status before capture.
   4. Never recapture a completed order.
   5. Recover previously completed captures.
   6. Validate amount in integer cents.
   7. Save payment only once in Firestore.
===================================================== */

app.post(
  "/api/paypal/capture",
  authenticated,

  async (req, res, next) => {
    try {
      const requestId = field(
        req.body?.requestId,
        40
      );

      const paypalOrderId = field(
        req.body?.paypalOrderId,
        80
      );

      if (
        !REQUEST_ID_RE.test(requestId) ||
        !PAYPAL_ID_RE.test(paypalOrderId)
      ) {
        fail(
          400,
          "معرّفات عملية الدفع غير صالحة."
        );
      }

      /* 1. GET FIRESTORE ORDER */

      const orderRef = db
        .collection("orders")
        .doc(requestId);

      const snap =
        await orderRef.get();

      if (!snap.exists) {
        fail(
          404,
          "لم نجد الطلب في Firestore."
        );
      }

      const saved =
        snap.data();

      /* 2. VERIFY CUSTOMER OWNERSHIP */

      if (
        saved.customerUid !==
          req.user.uid ||
        saved.paypalOrderId !==
          paypalOrderId ||
        saved.paymentMethod !==
          "paypal"
      ) {
        fail(
          403,
          "ليس لديك صلاحية على عملية الدفع."
        );
      }

      /* 3. HANDLE ALREADY PAID ORDERS */

      if (
        saved.paymentStatus ===
        "paid"
      ) {
        if (!saved.paypalCaptureId) {
          fail(
            409,
            "الطلب مسجّل كمدفوع لكن معرّف التحصيل مفقود. راجع الإدارة."
          );
        }

        return res.json({
          ok: true,

          alreadyPaid: true,

          id:
            requestId,

          total:
            saved.total,

          usd:
            saved.paypalAmountUSD,

          captureId:
            saved.paypalCaptureId,
        });
      }

      /* 4. READ PAYPAL ORDER STATUS */

      let remote =
        await paypal(
          `/v2/checkout/orders/${paypalOrderId}`
        );

      if (
        remote.id !==
        paypalOrderId
      ) {
        fail(
          409,
          "معرّف PayPal لا يطابق معرّف العملية المحفوظ."
        );
      }

      /*
       * 5. CAPTURE ONLY IF APPROVED
       *
       * If the order is COMPLETED,
       * skip capture entirely.
       *
       * A previous request may have
       * captured the payment already.
       */

      if (
        remote.status === "APPROVED"
      ) {
        try {
          await paypal(
            `/v2/checkout/orders/${paypalOrderId}/capture`,

            "POST",

            {},

            `${requestId}-capture`
          );
        } catch (captureError) {
          /*
           * Capture might have succeeded
           * at PayPal before the API request
           * returned an error or timed out.
           *
           * Check remote state before
           * reporting the failure.
           */

          const inspected =
            await paypal(
              `/v2/checkout/orders/${paypalOrderId}`
            );

          if (
            inspected.status !==
            "COMPLETED"
          ) {
            throw captureError;
          }
        }

        /*
         * Fetch PayPal's canonical
         * order details after capture.
         */

        remote =
          await paypal(
            `/v2/checkout/orders/${paypalOrderId}`
          );
      }

      /* 6. REQUIRE COMPLETED STATUS */

      if (
        remote.status !==
        "COMPLETED"
      ) {
        fail(
          409,
          `عملية PayPal ليست مكتملة (${
            remote.status || "UNKNOWN"
          }).`
        );
      }

      /* 7. VALIDATE PURCHASE UNIT */

      const units =
        Array.isArray(
          remote.purchase_units
        )
          ? remote.purchase_units
          : [];

      if (
        units.length !== 1
      ) {
        fail(
          409,
          "عدد وحدات عملية PayPal لا يطابق طلب بوصلة."
        );
      }

      const unit =
        units[0];

      /*
       * FIX:
       *
       * Do not require custom_id to exist.
       * It is optional in some responses.
       *
       * However, if either reference is
       * returned, its value must match
       * the stored Firestore order.
       */

      if (
        (
          unit.reference_id &&
          unit.reference_id !== requestId
        ) ||
        (
          unit.custom_id &&
          unit.custom_id !== requestId
        )
      ) {
        console.error(
          "PayPal purchase unit reference mismatch",
          {
            requestId,
            paypalOrderId,

            referenceId:
              unit.reference_id || null,

            customId:
              unit.custom_id || null,
          }
        );

        fail(
          409,
          "مرجع عملية PayPal لا يطابق الطلب."
        );
      }

      /* 8. FIND COMPLETED CAPTURE */

      const captures =
        Array.isArray(
          unit.payments?.captures
        )
          ? unit.payments.captures
          : [];

      const successful =
        captures.filter(
          (capture) =>
            capture.status ===
            "COMPLETED"
        );

      /*
       * This checkout uses one
       * purchase unit and expects
       * exactly one completed capture.
       */

      if (
        successful.length !== 1
      ) {
        console.error(
          "PayPal completed capture count:",
          {
            paypalOrderId,

            remoteStatus:
              remote.status,

            captureStatuses:
              captures.map(
                (item) => item.status
              ),
          }
        );

        fail(
          409,
          "لم يتم العثور على تحصيل PayPal واحد مكتمل."
        );
      }

      const capture =
        successful[0];

      /* 9. VERIFY AMOUNT AND CURRENCY */

      const expectedCents =
        dollarsToCents(
          saved.paypalAmountUSD
        );

      const paidCents =
        dollarsToCents(
          capture.amount?.value
        );

      const orderCents =
        dollarsToCents(
          unit.amount?.value
        );

      const verified =
        typeof capture.id ===
          "string" &&

        !!capture.id &&

        capture.amount
          ?.currency_code ===
          "USD" &&

        unit.amount
          ?.currency_code ===
          "USD" &&

        Number.isSafeInteger(
          expectedCents
        ) &&

        expectedCents > 0 &&

        paidCents ===
          expectedCents &&

        orderCents ===
          expectedCents;

      if (!verified) {
        console.error(
          "PayPal amount verification mismatch:",
          {
            paypalOrderId,

            expectedUSD:
              saved.paypalAmountUSD,

            orderUSD:
              unit.amount?.value ||
              null,

            capturedUSD:
              capture.amount?.value ||
              null,

            capturedCurrency:
              capture.amount
                ?.currency_code ||
              null,
          }
        );

        fail(
          409,
          "بيانات التحصيل لا تطابق المبلغ الصحيح للطلب."
        );
      }

      /* 10. ATOMIC FIRESTORE CONFIRMATION */

      const now =
        new Date().toISOString();

      await db.runTransaction(
        async (tx) => {
          const freshSnap =
            await tx.get(
              orderRef
            );

          if (
            !freshSnap.exists
          ) {
            fail(
              404,
              "الطلب لم يعد موجودًا."
            );
          }

          const fresh =
            freshSnap.data();

          /*
           * Protect against changes
           * during payment verification.
           */

          if (
            fresh.customerUid !==
              req.user.uid ||

            fresh.paypalOrderId !==
              paypalOrderId ||

            fresh.paymentMethod !==
              "paypal" ||

            fresh.paypalAmountUSD !==
              saved.paypalAmountUSD ||

            fresh.paypalCurrency !==
              "USD"
          ) {
            fail(
              409,
              "تغيرت بيانات الطلب أثناء تأكيد الدفع."
            );
          }

          /*
           * Idempotent response:
           * Payment was already saved.
           */

          if (
            fresh.paymentStatus ===
            "paid"
          ) {
            if (
              fresh.paypalCaptureId !==
              capture.id
            ) {
              fail(
                409,
                "الطلب مرتبط بتحصيل آخر مختلف."
              );
            }

            return;
          }

          /*
           * Do not silently mark
           * cancelled orders as paid.
           */

          if (
            fresh.status ===
              "cancelled" ||
            fresh.status ===
              "canceled"
          ) {
            fail(
              409,
              "تم تحصيل طلب ملغى. راجع الإدارة لمعالجة استرداد المبلغ."
            );
          }

          /* SAVE VERIFIED PAYMENT */

          tx.update(
            orderRef,
            {
              paymentStatus:
                "paid",

              paypalCaptureId:
                capture.id,

              paidAt:
                now,

              updatedAt:
                now,

              history: [
                ...(
                  Array.isArray(
                    fresh.history
                  )
                    ? fresh.history
                    : []
                ),

                {
                  id:
                    `paid-${capture.id}`,

                  status:
                    fresh.status,

                  date:
                    now,

                  note:
                    "تم تأكيد عملية PayPal Sandbox والتحقق من المبلغ.",
                },
              ],
            }
          );
        }
      );

      /* 11. RETURN SUCCESS */

      return res.json({
        ok: true,

        id:
          requestId,

        total:
          saved.total,

        usd:
          saved.paypalAmountUSD,

        captureId:
          capture.id,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =====================================================
   ERROR HANDLING
===================================================== */

app.use(
  (
    error,
    _req,
    res,
    _next
  ) => {
    console.error(
      "Bawsala PayPal API:",
      error
    );

    const status =
      Number.isInteger(
        error?.status
      )
        ? error.status
        : 500;

    res.status(status).json({
      error:
        status === 500
          ? "تعذّر إكمال العملية. راجع سجل الخادم."
          : error.message,
    });
  }
);

/* =====================================================
   START SERVER
===================================================== */

app.listen(
  PORT,
  () => {
    console.log(
      `Bawsala PayPal Sandbox API: http://localhost:${PORT}`
    );
  }
);
