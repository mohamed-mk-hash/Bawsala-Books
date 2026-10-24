
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  PayPalButtons,
  PayPalScriptProvider,
} from "@paypal/react-paypal-js";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Compass,
  CreditCard,
  LockKeyhole,
  LoaderCircle,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";

import { auth } from "../../firebase.js";

import {
  formatPrice,
} from "../../data/books.js";

import {
  useLiveCatalog,
} from "../../hooks/useLiveCatalog.js";

import {
  useShop,
} from "../../context/ShopContext.jsx";

import {
  BookCover,
} from "../../components/BookCard/BookCard.jsx";

import {
  estimateShipping,
  placeBookOrder,
  createPayPalOrder,
  capturePayPalOrder,
} from "../../services/orderCheckout.js";

import "./Checkout.css";

/* ==========================================
   PAYPAL CONFIGURATION
========================================== */

const PAYPAL_CLIENT_ID =
  import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

const PAYPAL_OPTIONS = {
  clientId: PAYPAL_CLIENT_ID,
  currency: "USD",
  intent: "capture",
  components: "buttons",
};

/* ==========================================
   STEPS
========================================== */

const steps = [
  {
    id: 1,
    title: "معلوماتك",
    icon: UserRound,
  },
  {
    id: 2,
    title: "عنوان التوصيل",
    icon: MapPin,
  },
  {
    id: 3,
    title: "تأكيد الطلب",
    icon: ClipboardList,
  },
];

const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  wilaya: "",
  commune: "",
  address: "",
  notes: "",
};

/* ==========================================
   FORM VALIDATION
========================================== */

function validateStep(step, form) {
  const errors = {};

  if (step === 1) {
    if (
      form.fullName.trim().length < 3 ||
      form.fullName.length > 100
    ) {
      errors.fullName =
        "أدخل اسمًا صحيحًا.";
    }

    if (
      !/^(?:\+213|0)[567]\d{8}$/.test(
        form.phone.replace(/[\s-]/g, "")
      )
    ) {
      errors.phone =
        "رقم هاتف جزائري غير صحيح.";
    }

    if (
      form.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      errors.email =
        "البريد الإلكتروني غير صحيح.";
    }
  }

  if (step === 2) {
    if (!form.wilaya.trim()) {
      errors.wilaya =
        "أدخل الولاية.";
    }

    if (!form.commune.trim()) {
      errors.commune =
        "أدخل البلدية.";
    }

    if (
      form.address.trim().length < 8
    ) {
      errors.address =
        "أدخل عنوانًا واضحًا.";
    }
  }

  return errors;
}

/* ==========================================
   REQUEST ID
========================================== */

function getRequestId() {
  const key =
    "bawsala-pending-request";

  try {
    const saved =
      sessionStorage.getItem(key);

    if (
      /^bz-[a-f0-9-]{36}$/i.test(
        saved || ""
      )
    ) {
      return saved;
    }

    const next =
      `bz-${crypto.randomUUID()}`;

    sessionStorage.setItem(
      key,
      next
    );

    return next;
  } catch {
    return `bz-${crypto.randomUUID()}`;
  }
}

function clearRequestId() {
  try {
    sessionStorage.removeItem(
      "bawsala-pending-request"
    );
  } catch {
    // Storage is optional.
  }
}

/* ==========================================
   CHECKOUT COMPONENT
========================================== */

export default function Checkout() {
  const {
    cart,
    cartTotal,
    cartCount,
    clearCart,
  } = useShop();

  const {
    books,
    revision,
    settings,
  } = useLiveCatalog();

  const reduced =
    useReducedMotion();

  const requestId =
    useRef(null);

  const completedRef =
    useRef(false);

  if (!requestId.current) {
    requestId.current =
      getRequestId();
  }

  /* ========================================
     STATE
  ======================================== */

  const [user, setUser] =
    useState(
      () => auth.currentUser
    );

  const [step, setStep] =
    useState(1);

  const [form, setForm] =
    useState(initialForm);

  const [errors, setErrors] =
    useState({});

  const [accepted, setAccepted] =
    useState(false);

  const [payment, setPayment] =
    useState("cod");

  const [submitting, setSubmitting] =
    useState(false);

  const [paypalProcessing, setPaypalProcessing] =
    useState(false);

  const [complete, setComplete] =
    useState(null);

  const [
    submitError,
    setSubmitError,
  ] = useState("");

  const [
    paypalQuote,
    setPaypalQuote,
  ] = useState(null);

  /* ========================================
     FIREBASE AUTH
  ======================================== */

  useEffect(
    () =>
      onAuthStateChanged(
        auth,
        setUser
      ),
    []
  );

  /* ========================================
     LIVE CATALOG
  ======================================== */

  const items = useMemo(
    () =>
      cart
        .map((entry) => {
          const book =
            books.find(
              (candidate) =>
                String(candidate.id) ===
                String(entry.id)
            );

          return book
            ? {
                ...book,
                quantity:
                  entry.quantity,
              }
            : null;
        })
        .filter(Boolean),

    [cart, books, revision]
  );

  /* ========================================
     STORE SETTINGS
  ======================================== */

  const shipping =
    settings?.shipping || {};

  const system =
    settings?.system || {};

  const paypalDisabled =
    system.maintenanceMode === true ||
    system.acceptOrders === false ||
    shipping.homeDelivery === false;

  const codDisabled =
    paypalDisabled ||
    settings?.payments
      ?.cashOnDelivery === false;

  const invalidStock =
    items.length !== cart.length ||
    items.some(
      (item) =>
        Number(item.stock) <
        item.quantity
    );

  const estimatedShipping =
    estimateShipping(
      shipping,
      form.wilaya,
      cartTotal
    );

  const estimatedTotal =
    cartTotal +
    estimatedShipping;

  /* ========================================
     IMPORTANT FIX

     Order availability must NOT depend
     on the submitting state.

     Otherwise, after PayPal approval:
       submitting = true
       canOrder = false

     That would incorrectly display an
     error while payment confirmation is
     still being processed.
  ======================================== */

  const canOrder =
    !invalidStock &&
    items.length > 0 &&
    (
      payment === "cod"
        ? !codDisabled
        : !paypalDisabled
    );

  /* ========================================
     PROCESSING IS SEPARATE

     This only prevents duplicate actions.
     It does not make the order invalid.
  ======================================== */

  const canSubmit =
    canOrder &&
    !submitting;

  /* ========================================
     DOCUMENT TITLE
  ======================================== */

  useEffect(() => {
    const old =
      document.title;

    document.title =
      "إتمام الطلب | بوصلة";

    return () => {
      document.title = old;
    };
  }, []);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [step]);

  /* ========================================
     UPDATE FORM
  ======================================== */

  function updateField(name, value) {
    if (submitting) return;

    setForm(
      (old) => ({
        ...old,
        [name]: value,
      })
    );

    setErrors(
      (old) => ({
        ...old,
        [name]: undefined,
      })
    );

    setSubmitError("");
  }

  /* ========================================
     NEXT STEP
  ======================================== */

  function nextStep(event) {
    event?.preventDefault();

    if (submitting) return;

    const result =
      validateStep(step, form);

    setErrors(result);

    if (
      Object.keys(result).length
    ) {
      return;
    }

    setStep(
      (old) =>
        Math.min(3, old + 1)
    );
  }

  /* ========================================
     PREVIOUS STEP
  ======================================== */

  function previousStep() {
    if (submitting) return;

    setSubmitError("");

    setStep(
      (old) =>
        Math.max(1, old - 1)
    );
  }

  /* ========================================
     CHOOSE PAYMENT

     Prevent switching methods during
     an active PayPal confirmation.
  ======================================== */

  function choosePayment(value) {
    if (submitting) return;

    if (value === payment) return;

    setPayment(value);
    setSubmitError("");
    setPaypalQuote(null);

    clearRequestId();

    requestId.current =
      getRequestId();
  }

  /* ========================================
     VALIDATE COMPLETE FORM
  ======================================== */

  function validateFullForm() {
    const first =
      validateStep(1, form);

    if (
      Object.keys(first).length
    ) {
      setErrors(first);
      setStep(1);

      throw new Error(
        "أكمل معلومات التواصل."
      );
    }

    const second =
      validateStep(2, form);

    if (
      Object.keys(second).length
    ) {
      setErrors(second);
      setStep(2);

      throw new Error(
        "أكمل عنوان التوصيل."
      );
    }

    if (!accepted) {
      throw new Error(
        "وافق على شروط الطلب أولًا."
      );
    }

    if (!canOrder) {
      throw new Error(
        "الطلب غير متاح. راجع السلة وإعدادات التوصيل."
      );
    }
  }

  /* ========================================
     COMPLETE ORDER

     Success is shown only after the server
     confirms the order/payment.
  ======================================== */

  function finishOrder(result, method) {
    completedRef.current = true;

    setSubmitError("");

    setComplete({
      ...result,
      method,

      customerName:
        form.fullName.trim(),

      count:
        cartCount,
    });

    clearCart();
    clearRequestId();

    window.scrollTo(0, 0);
  }

  /* ========================================
     CASH ON DELIVERY
  ======================================== */

  async function confirmCOD() {
    if (submitting) return;

    try {
      validateFullForm();

      setSubmitting(true);
      setSubmitError("");

      const result =
        await placeBookOrder(
          form,
          cart,
          requestId.current
        );

      finishOrder(
        result,
        "cod"
      );
    } catch (error) {
      setSubmitError(
        error?.message ||
        "تعذّر إنشاء الطلب."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ========================================
     PAYPAL — CREATE ORDER
  ======================================== */

  async function paypalCreate() {
    try {
      validateFullForm();

      if (!user) {
        throw new Error(
          "سجّل الدخول لاستخدام PayPal."
        );
      }

      if (completedRef.current) {
        throw new Error(
          "هذا الطلب مكتمل بالفعل."
        );
      }

      setSubmitError("");

      const result =
        await createPayPalOrder(
          form,
          cart,
          requestId.current
        );

      if (!result.paypalOrderId) {
        throw new Error(
          "لم يُنشأ أمر PayPal."
        );
      }

      setPaypalQuote(result);

      return result.paypalOrderId;
    } catch (error) {
      setSubmitError(
        error?.message ||
        "تعذّر إنشاء أمر PayPal."
      );

      throw error;
    }
  }

  /* ========================================
     PAYPAL — APPROVE AND CAPTURE

     FIX:
     Keep PayPal buttons mounted while
     waiting for the server response.

     Display a processing message,
     not an error message.
  ======================================== */

  async function paypalApprove(data) {
    if (completedRef.current) {
      return;
    }

    setSubmitting(true);
    setPaypalProcessing(true);

    setSubmitError("");

    try {
      const result =
        await capturePayPalOrder(
          requestId.current,
          data.orderID
        );

      if (result.ok !== true) {
        throw new Error(
          "لم يتم تأكيد الدفع بعد."
        );
      }

      finishOrder(
        {
          ...result,
          shippingFee:
            estimatedShipping,
        },
        "paypal"
      );
    } catch (error) {
      console.error(
        "PayPal capture confirmation:",
        error
      );

      if (!completedRef.current) {
        setSubmitError(
          error?.message ||
          "تعذّر تأكيد الدفع. تحقق من حالة الطلب قبل إعادة المحاولة."
        );
      }
    } finally {
      setPaypalProcessing(false);
      setSubmitting(false);
    }
  }

  /* ========================================
     PAYPAL CANCEL
  ======================================== */

  function paypalCancel() {
    if (
      completedRef.current ||
      paypalProcessing
    ) {
      return;
    }

    setSubmitError(
      "ألغيت عملية PayPal. لم يتم تأكيد الدفع."
    );
  }

  /* ========================================
     PAYPAL ERROR
  ======================================== */

  function paypalError(error) {
    console.error(
      "PayPal SDK:",
      error
    );

    if (
      completedRef.current ||
      paypalProcessing
    ) {
      return;
    }

    setSubmitError(
      (previous) =>
        previous ||
        "تعذّر تشغيل PayPal. حاول مجددًا."
    );
  }

  /* ========================================
     ANIMATION
  ======================================== */

  const motionProps = reduced
    ? {
        initial: false,

        animate: {
          opacity: 1,
        },

        exit: {
          opacity: 0,
        },
      }
    : {
        initial: {
          opacity: 0,
          y: 15,
        },

        animate: {
          opacity: 1,
          y: 0,
        },

        exit: {
          opacity: 0,
          y: -8,
        },

        transition: {
          duration: 0.3,
        },
      };

  /* ========================================
     SUCCESS PAGE
  ======================================== */

  if (complete) {
    return (
      <main
        id="main-content"
        className="checkout-page"
        dir="rtl"
      >
        <section className="checkout-success">
          <motion.div
            className="container checkout-success-card"
            {...motionProps}
          >
            <div className="checkout-success-icon">
              <CheckCircle2 size={56} />
            </div>

            <p className="checkout-eyebrow">
              <Sparkles size={16} />
              تم تسجيل طلبك
            </p>

            <h1>
              شكرًا لاختيارك{" "}
              <span>بوصلة.</span>
            </h1>

            <p className="checkout-success-message">
              شكرًا {complete.customerName}.
              تم تسجيل طلبك برقم{" "}
              <strong dir="ltr">
                {complete.id}
              </strong>.
            </p>

            <div className="checkout-success-summary">
              <div>
                <span>عدد النسخ</span>
                <strong>
                  {complete.count}
                </strong>
              </div>

              <div>
                <span>الإجمالي</span>
                <strong>
                  {formatPrice(
                    complete.total
                  )}
                </strong>
              </div>

              <div>
                <span>الدفع</span>

                <strong>
                  {complete.method ===
                  "paypal"
                    ? "مدفوع — Sandbox"
                    : "عند الاستلام"}
                </strong>
              </div>
            </div>

            {complete.method ===
              "paypal" && (
              <p className="checkout-success-note">
                تم تأكيد مبلغ{" "}
                <strong>
                  {complete.usd} USD
                </strong>{" "}
                داخل بيئة PayPal Sandbox.
                لم تُستخدم أموال حقيقية.
              </p>
            )}

            <div className="checkout-success-actions">
              <Link
                to="/account?tab=orders"
                className="checkout-primary"
              >
                عرض طلباتي
                <ArrowUpLeft size={17} />
              </Link>

              <Link
                to="/books"
                className="checkout-secondary"
              >
                العودة للكتب
                <ArrowLeft size={17} />
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
    );
  }

  /* ========================================
     EMPTY CART
  ======================================== */

  if (!items.length) {
    return (
      <main
        id="main-content"
        className="checkout-page"
        dir="rtl"
      >
        <section className="checkout-empty">
          <div className="container checkout-empty-inner">
            <ShoppingBag size={55} />

            <h1>
              لا توجد كتب لإتمام الطلب.
            </h1>

            <Link
              to="/books"
              className="checkout-primary"
            >
              تصفح الكتب
              <ArrowUpLeft size={18} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  /* ========================================
     MAIN CHECKOUT PAGE
  ======================================== */

  return (
    <main
      id="main-content"
      className="checkout-page"
      dir="rtl"
    >
      {/* HERO */}

      <section className="checkout-hero">
        <div className="container">
          <nav className="checkout-breadcrumb">
            <Link to="/">
              الرئيسية
            </Link>

            <ChevronLeft size={14} />

            <Link to="/cart">
              السلة
            </Link>

            <ChevronLeft size={14} />

            <span>
              إتمام الطلب
            </span>
          </nav>

          <div className="checkout-hero-layout">
            <div>
              <p className="checkout-eyebrow">
                <Sparkles size={16} />
                المحطة الأخيرة
              </p>

              <h1>
                رحلة كتابك{" "}
                <span>
                  تبدأ هنا.
                </span>
              </h1>

              <p>
                اختر الدفع عند الاستلام
                أو جرّب PayPal Sandbox
                لإتمام الدفع الإلكتروني.
              </p>
            </div>

            <div className="checkout-hero-mark">
              <Compass size={52} />
              <span>
                THE NEXT CHAPTER
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CHECKOUT BODY */}

      <section className="checkout-body">
        <div className="container">

          {/* STEPPER */}

          <div className="checkout-stepper">
            {steps.map(
              (item, index) => {
                const Icon =
                  item.icon;

                const done =
                  step > item.id;

                return (
                  <div
                    key={item.id}
                    className={`checkout-step ${
                      step === item.id
                        ? "is-active"
                        : ""
                    } ${
                      done
                        ? "is-done"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      disabled={
                        item.id > step ||
                        submitting
                      }
                      onClick={() =>
                        setStep(item.id)
                      }
                    >
                      <span className="checkout-step-icon">
                        {done ? (
                          <Check size={19} />
                        ) : (
                          <Icon size={19} />
                        )}
                      </span>

                      <span>
                        <small>
                          الخطوة {item.id}
                        </small>

                        <strong>
                          {item.title}
                        </strong>
                      </span>
                    </button>

                    {index < 2 && (
                      <div className="checkout-step-line">
                        <span
                          style={{
                            width: done
                              ? "100%"
                              : "0%",
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>

          <div className="checkout-main-layout">

            {/* FORM COLUMN */}

            <div className="checkout-form-column">
              <AnimatePresence
                mode="wait"
                initial={false}
              >

                {/* STEP 1 — CUSTOMER */}

                {step === 1 && (
                  <motion.form
                    key="customer"
                    className="checkout-form-card"
                    {...motionProps}
                    onSubmit={nextStep}
                  >
                    <div className="checkout-card-heading">
                      <div className="checkout-heading-icon">
                        <UserRound size={24} />
                      </div>

                      <div>
                        <p>
                          01 / بيانات التواصل
                        </p>

                        <h2>
                          لنتعرّف عليك.
                        </h2>
                      </div>
                    </div>

                    <div className="checkout-form-grid">
                      {[
                        {
                          id: "fullName",
                          title: "الاسم واللقب",
                          type: "text",
                          placeholder:
                            "الاسم الكامل",
                          full: true,
                        },
                        {
                          id: "phone",
                          title: "رقم الهاتف",
                          type: "tel",
                          placeholder:
                            "0550 00 00 00",
                        },
                        {
                          id: "email",
                          title:
                            "البريد الإلكتروني (اختياري)",
                          type: "email",
                          placeholder:
                            "example@email.com",
                        },
                      ].map(
                        (field) => (
                          <div
                            className={`checkout-field ${
                              field.full
                                ? "checkout-field-full"
                                : ""
                            }`}
                            key={field.id}
                          >
                            <label
                              htmlFor={`checkout-${field.id}`}
                            >
                              {field.title}
                            </label>

                            <input
                              id={`checkout-${field.id}`}
                              type={field.type}
                              placeholder={
                                field.placeholder
                              }
                              dir={
                                field.type ===
                                "email"
                                  ? "ltr"
                                  : undefined
                              }
                              value={
                                form[field.id]
                              }
                              onChange={(event) =>
                                updateField(
                                  field.id,
                                  event.target.value
                                )
                              }
                              disabled={submitting}
                            />

                            {errors[field.id] && (
                              <small className="checkout-error">
                                {errors[field.id]}
                              </small>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    <div className="checkout-info-strip">
                      <ShieldCheck size={19} />
                      بياناتك مخصصة لمعالجة طلبك.
                    </div>

                    <div className="checkout-form-actions">
                      <Link
                        to="/cart"
                        className="checkout-back"
                      >
                        <ArrowRight size={17} />
                        العودة للسلة
                      </Link>

                      <button
                        type="submit"
                        className="checkout-primary"
                      >
                        التالي
                        <ArrowLeft size={18} />
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* STEP 2 — DELIVERY */}

                {step === 2 && (
                  <motion.form
                    key="address"
                    className="checkout-form-card"
                    {...motionProps}
                    onSubmit={nextStep}
                  >
                    <div className="checkout-card-heading">
                      <div className="checkout-heading-icon">
                        <Truck size={24} />
                      </div>

                      <div>
                        <p>
                          02 / التوصيل
                        </p>

                        <h2>
                          إلى أين نوجّه الكتب؟
                        </h2>
                      </div>
                    </div>

                    <div className="checkout-form-grid">
                      {[
                        {
                          id: "wilaya",
                          title: "الولاية",
                          placeholder:
                            "مثال: الجزائر",
                        },
                        {
                          id: "commune",
                          title: "البلدية",
                          placeholder:
                            "مثال: باب الزوار",
                        },
                        {
                          id: "address",
                          title:
                            "العنوان بالتفصيل",
                          placeholder:
                            "الحي، الشارع، رقم المنزل...",
                          full: true,
                        },
                      ].map(
                        (field) => (
                          <div
                            className={`checkout-field ${
                              field.full
                                ? "checkout-field-full"
                                : ""
                            }`}
                            key={field.id}
                          >
                            <label
                              htmlFor={`checkout-${field.id}`}
                            >
                              {field.title}
                            </label>

                            <input
                              id={`checkout-${field.id}`}
                              type="text"
                              placeholder={
                                field.placeholder
                              }
                              value={
                                form[field.id]
                              }
                              onChange={(event) =>
                                updateField(
                                  field.id,
                                  event.target.value
                                )
                              }
                              disabled={submitting}
                            />

                            {errors[field.id] && (
                              <small className="checkout-error">
                                {errors[field.id]}
                              </small>
                            )}
                          </div>
                        )
                      )}

                      <div className="checkout-field checkout-field-full">
                        <label htmlFor="checkout-notes">
                          ملاحظات إضافية
                        </label>

                        <textarea
                          id="checkout-notes"
                          rows={4}
                          maxLength={500}
                          value={form.notes}
                          onChange={(event) =>
                            updateField(
                              "notes",
                              event.target.value
                            )
                          }
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="checkout-delivery-note">
                      <MapPin size={21} />

                      <div>
                        <strong>
                          رسوم التوصيل التقديرية
                        </strong>

                        <p>
                          {formatPrice(
                            estimatedShipping
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="checkout-form-actions">
                      <button
                        type="button"
                        className="checkout-back"
                        onClick={previousStep}
                      >
                        <ArrowRight size={17} />
                        السابق
                      </button>

                      <button
                        type="submit"
                        className="checkout-primary"
                      >
                        مراجعة الطلب
                        <ArrowLeft size={18} />
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* STEP 3 — REVIEW */}

                {step === 3 && (
                  <motion.div
                    key="review"
                    className="checkout-form-card"
                    {...motionProps}
                  >
                    <div className="checkout-card-heading">
                      <div className="checkout-heading-icon">
                        <ClipboardList size={24} />
                      </div>

                      <div>
                        <p>
                          03 / المراجعة
                        </p>

                        <h2>
                          تأكيد الطلب والدفع.
                        </h2>
                      </div>
                    </div>

                    <div className="checkout-review">

                      {/* CUSTOMER DETAILS */}

                      <div className="checkout-review-block">
                        <div className="checkout-review-title">
                          <strong>
                            <UserRound size={18} />
                            معلومات التواصل
                          </strong>

                          <button
                            type="button"
                            onClick={() =>
                              setStep(1)
                            }
                            disabled={submitting}
                          >
                            تعديل
                          </button>
                        </div>

                        <p>{form.fullName}</p>
                        <p dir="ltr">
                          {form.phone}
                        </p>

                        {form.email && (
                          <p>{form.email}</p>
                        )}
                      </div>

                      {/* DELIVERY DETAILS */}

                      <div className="checkout-review-block">
                        <div className="checkout-review-title">
                          <strong>
                            <MapPin size={18} />
                            معلومات التوصيل
                          </strong>

                          <button
                            type="button"
                            onClick={() =>
                              setStep(2)
                            }
                            disabled={submitting}
                          >
                            تعديل
                          </button>
                        </div>

                        <p>
                          {form.wilaya}،
                          {form.commune}
                        </p>

                        <p>{form.address}</p>
                      </div>

                      {/* PAYMENT METHOD */}

                      <div className="checkout-review-block">
                        <div className="checkout-review-title">
                          <strong>
                            <CreditCard size={18} />
                            طريقة الدفع
                          </strong>
                        </div>

                        {/* CASH ON DELIVERY */}

                        <label
                          className="checkout-payment-option"
                          style={{
                            cursor: submitting
                              ? "not-allowed"
                              : "pointer",
                            marginBottom: 12,
                          }}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="cod"
                            checked={
                              payment === "cod"
                            }
                            disabled={
                              codDisabled ||
                              submitting
                            }
                            onChange={() =>
                              choosePayment("cod")
                            }
                          />

                          <span>
                            <PackageCheck size={20} />
                          </span>

                          <div>
                            <strong>
                              الدفع عند الاستلام
                            </strong>

                            <p>
                              ادفع عند استلام الكتب.
                            </p>
                          </div>

                          {payment === "cod" && (
                            <CheckCircle2 size={20} />
                          )}
                        </label>

                        {/* PAYPAL SANDBOX */}

                        <label
                          className="checkout-payment-option"
                          style={{
                            cursor: submitting
                              ? "not-allowed"
                              : "pointer",
                            marginBottom: 12,
                          }}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="paypal"
                            checked={
                              payment === "paypal"
                            }
                            disabled={submitting}
                            onChange={() =>
                              choosePayment("paypal")
                            }
                          />

                          <span>
                            <CreditCard size={20} />
                          </span>

                          <div>
                            <strong>
                              PayPal Sandbox
                            </strong>

                            <p>
                              دفع تجريبي بالدولار —
                              لا توجد أموال حقيقية.
                            </p>
                          </div>

                          {payment === "paypal" && (
                            <CheckCircle2 size={20} />
                          )}
                        </label>
                      </div>
                    </div>

                    {/* ACCEPT TERMS */}

                    <label className="checkout-agreement">
                      <input
                        type="checkbox"
                        checked={accepted}
                        disabled={submitting}
                        onChange={(event) =>
                          setAccepted(
                            event.target.checked
                          )
                        }
                      />

                      <span>
                        أوافق على معالجة بيانات
                        الطلب، وأفهم أن طريقة
                        PayPal هنا للاختبار
                        فقط وبعملة USD.
                      </span>
                    </label>

                    {/* REAL ERRORS ONLY */}

                    {submitError && (
                      <p
                        className="checkout-error"
                        role="alert"
                        style={{
                          marginTop: 14,
                        }}
                      >
                        {submitError}
                      </p>
                    )}

                    {/* CASH ON DELIVERY */}

                    {payment === "cod" && (
                      <div className="checkout-form-actions">
                        <button
                          type="button"
                          className="checkout-back"
                          onClick={previousStep}
                          disabled={submitting}
                        >
                          <ArrowRight size={17} />
                          السابق
                        </button>

                        <button
                          type="button"
                          className="checkout-primary"
                          onClick={confirmCOD}
                          disabled={
                            !accepted ||
                            !canSubmit
                          }
                        >
                          {submitting ? (
                            <>
                              <LoaderCircle
                                size={18}
                                className="animate-spin"
                              />
                              جارٍ إرسال الطلب...
                            </>
                          ) : (
                            <>
                              تأكيد الطلب
                              <Check size={18} />
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* PAYPAL SANDBOX */}

                    {payment === "paypal" && (
                      <div
                        style={{
                          marginTop: 20,
                        }}
                      >
                        {!user ? (
                          <div className="checkout-info-strip">
                            <LockKeyhole size={19} />

                            <span>
                              يجب تسجيل الدخول
                              إلى حساب بوصلة
                              لاستخدام PayPal.{" "}
                              <Link
                                to="/login"
                                style={{
                                  fontWeight: 800,
                                }}
                              >
                                تسجيل الدخول
                              </Link>
                            </span>
                          </div>
                        ) : !PAYPAL_CLIENT_ID ? (
                          <p className="checkout-error">
                            لم تتم إضافة
                            VITE_PAYPAL_CLIENT_ID
                            إلى ملف .env.
                          </p>
                        ) : !accepted ? (
                          <p className="checkout-info-strip">
                            <ShieldCheck size={19} />
                            وافق على شروط الطلب
                            لإظهار زر PayPal.
                          </p>
                        ) : !canOrder ? (
                          <p className="checkout-error">
                            تعذّر تجهيز الدفع.
                            راجع المخزون
                            وإعدادات المتجر.
                          </p>
                        ) : (
                          <>
                            {/* PROCESSING STATUS */}

                            {paypalProcessing && (
                              <div
                                role="status"
                                aria-live="polite"
                                className="checkout-info-strip"
                                style={{
                                  marginBottom: 14,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  color: "#008e82",
                                  fontWeight: 700,
                                }}
                              >
                                <LoaderCircle
                                  size={20}
                                  className="animate-spin"
                                />

                                <span>
                                  جارٍ تأكيد الدفع
                                  مع PayPal وحفظ
                                  طلبك بأمان...
                                </span>
                              </div>
                            )}

                            {/* KEEP BUTTONS MOUNTED */}

                            <PayPalScriptProvider
                              options={PAYPAL_OPTIONS}
                            >
                              <PayPalButtons
                                style={{
                                  layout: "vertical",
                                  label: "paypal",
                                }}

                                disabled={submitting}

                                createOrder={
                                  paypalCreate
                                }

                                onApprove={
                                  paypalApprove
                                }

                                onCancel={
                                  paypalCancel
                                }

                                onError={
                                  paypalError
                                }
                              />
                            </PayPalScriptProvider>
                          </>
                        )}

                        {/* SERVER QUOTE */}

                        {paypalQuote && (
                          <p
                            className="checkout-info-strip"
                            style={{
                              marginTop: 12,
                            }}
                          >
                            <CreditCard size={18} />

                            المبلغ الذي حسبه
                            الخادم:{" "}
                            <strong>
                              {paypalQuote.usd} USD
                            </strong>
                            {" "}
                            — إجمالي الطلب:{" "}
                            {formatPrice(
                              paypalQuote.dzd
                            )}
                          </p>
                        )}

                        <div className="checkout-form-actions">
                          <button
                            type="button"
                            className="checkout-back"
                            onClick={previousStep}
                            disabled={submitting}
                          >
                            <ArrowRight size={17} />
                            السابق
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ORDER SUMMARY */}

            <aside className="checkout-summary">
              <div className="checkout-summary-top">
                <div>
                  <p>YOUR BOOKSHELF</p>

                  <h2>
                    ملخص طلبك
                  </h2>
                </div>

                <ShoppingBag size={24} />
              </div>

              <div className="checkout-summary-products">
                {items.map(
                  (book) => (
                    <div
                      className="checkout-summary-product"
                      key={book.id}
                    >
                      <Link
                        to={`/books/${book.id}`}
                        className="checkout-summary-cover"
                      >
                        <BookCover book={book} />
                      </Link>

                      <div className="checkout-summary-info">
                        <Link
                          to={`/books/${book.id}`}
                        >
                          {book.title}
                        </Link>

                        <span>
                          {book.author}
                        </span>

                        <small>
                          الكمية: {book.quantity}
                        </small>
                      </div>

                      <strong>
                        {formatPrice(
                          book.price *
                          book.quantity
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>

              <div className="checkout-summary-totals">
                <div>
                  <span>عدد النسخ</span>

                  <strong>
                    {cartCount}
                  </strong>
                </div>

                <div>
                  <span>
                    المجموع الفرعي
                  </span>

                  <strong>
                    {formatPrice(
                      cartTotal
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    رسوم التوصيل التقديرية
                  </span>

                  <strong>
                    {formatPrice(
                      estimatedShipping
                    )}
                  </strong>
                </div>
              </div>

              <div className="checkout-summary-grand">
                <span>
                  الإجمالي التقديري
                </span>

                <strong>
                  {formatPrice(
                    estimatedTotal
                  )}
                </strong>
              </div>

              <p className="checkout-summary-warning">
                عند اختيار PayPal،
                يحسب الخادم السعر من
                Firestore ويحوّله إلى USD
                وفق سعر الصرف التجريبي.
              </p>

              <div className="checkout-summary-footer">
                <LockKeyhole size={16} />
                PayPal Sandbox / دفع عند الاستلام
              </div>

              <Link
                to="/cart"
                className="checkout-edit-cart"
              >
                تعديل السلة
                <ArrowLeft size={16} />
              </Link>
            </aside>
          </div>

          {/* FEATURES */}

          <div className="checkout-features">
            <div>
              <Compass size={21} />
              <span>
                رحلتك تبدأ بكتاب
              </span>
            </div>

            <div>
              <ShieldCheck size={21} />
              <span>
                بيانات طلبك محمية
              </span>
            </div>

            <div>
              <BookOpen size={21} />
              <span>
                كتب مختارة لك
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
