
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  Heart,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  Package,
  Pencil,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserRound,
  LogOut,
  LoaderCircle,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";

import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../../firebase.js";
import { formatPrice } from "../../data/books.js";
import { useLiveCatalog } from "../../hooks/useLiveCatalog.js";
import { useShop } from "../../context/ShopContext.jsx";
import { BookCover } from "../../components/BookCard/BookCard.jsx";

import "./Account.css";

const tabs = [
  ["overview", "نظرة عامة", LayoutDashboard],
  ["orders", "طلباتي", Package],
  ["favorites", "المفضلة", Heart],
  ["profile", "الملف الشخصي", UserRound],
  ["addresses", "عناويني", MapPin],
  ["security", "الأمان", LockKeyhole],
  ["preferences", "التفضيلات", Settings2],
];

const emptyAddress = {
  label: "المنزل",
  wilaya: "",
  commune: "",
  address: "",
};

const defaultPreferences = {
  readingUpdates: false,
  orderReminders: false,
  compactCards: false,
};

const initialAuth = {
  name: "",
  email: "",
  password: "",
  confirm: "",
};

function messageFor(error) {
  const messages = {
    "auth/email-already-in-use":
      "البريد الإلكتروني مستخدم. سجّل الدخول بدلًا من إنشاء حساب.",
    "auth/invalid-email":
      "البريد الإلكتروني غير صالح.",
    "auth/invalid-credential":
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "auth/wrong-password":
      "كلمة المرور غير صحيحة.",
    "auth/weak-password":
      "كلمة المرور ضعيفة.",
    "auth/too-many-requests":
      "محاولات كثيرة. حاول لاحقًا.",
    "auth/requires-recent-login":
      "يرجى تسجيل الدخول مرة أخرى قبل هذا الإجراء.",
    "auth/network-request-failed":
      "تعذر الاتصال بالإنترنت.",
    "permission-denied":
      "لا تسمح قواعد Firestore بتنفيذ هذا الإجراء.",
  };

  return (
    messages[error?.code] ||
    error?.message ||
    "حدث خطأ غير متوقع."
  );
}

function formatDate(raw) {
  if (!raw) return "—";

  const d =
    typeof raw?.toDate === "function"
      ? raw.toDate()
      : new Date(raw);

  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ar-DZ", {
        dateStyle: "medium",
      }).format(d);
}

function statusText(status) {
  return (
    {
      new: "جديد",
      confirmed: "مؤكد",
      processing: "قيد التجهيز",
      shipped: "قيد التوصيل",
      delivered: "تم التسليم",
      completed: "مكتمل",
      cancelled: "ملغى",
      canceled: "ملغى",
    }[status] || "قيد المراجعة"
  );
}

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="account-section-heading">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  link,
  linkLabel,
}) {
  return (
    <div className="account-empty">
      <div className="account-empty-icon">
        <Icon size={34} />
      </div>

      <h3>{title}</h3>
      <p>{description}</p>

      {link && (
        <Link
          to={link}
          className="account-action-primary"
        >
          {linkLabel}
          <ArrowUpLeft size={17} />
        </Link>
      )}
    </div>
  );
}

function Notice({ value }) {
  if (!value) return null;

  return (
    <motion.p
      role={
        value.type === "error"
          ? "alert"
          : "status"
      }
      className={`account-notice ${
        value.type === "error"
          ? "account-notice--error"
          : ""
      }`}
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
    >
      {value.type !== "error" && (
        <Check size={17} />
      )}
      {value.message}
    </motion.p>
  );
}

/*
  /login  -> mode="login"
  /signup -> mode="signup"
  /account -> mode="account"

  All use this file and Account.css.
*/

export default function Account({ mode = "account" }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [params, setParams] = useSearchParams();

  const [user, setUser] = useState(
    () => auth.currentUser
  );

  const [authReady, setAuthReady] =
    useState(false);

  const [authForm, setAuthForm] =
    useState(initialAuth);

  const [showPassword, setShowPassword] =
    useState(false);

  const [resetMode, setResetMode] =
    useState(false);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
  });

  const [addresses, setAddresses] =
    useState([]);

  const [preferences, setPreferences] =
    useState(defaultPreferences);

  const [orders, setOrders] = useState([]);

  const [accountLoading, setAccountLoading] =
    useState(false);

  const [ordersLoading, setOrdersLoading] =
    useState(false);

  const [ordersError, setOrdersError] =
    useState("");

  const [addressOpen, setAddressOpen] =
    useState(false);

  const [editingAddressId, setEditingAddressId] =
    useState(null);

  const [addressDraft, setAddressDraft] =
    useState(emptyAddress);

  const [expandedOrder, setExpandedOrder] =
    useState(null);

  const [passwordForm, setPasswordForm] =
    useState({
      current: "",
      next: "",
      confirm: "",
    });

  const [passwordLoading, setPasswordLoading] =
    useState(false);

  const {
    books,
    revision,
  } = useLiveCatalog();

  const {
    cart,
    cartCount,
    favorites,
    toggleFavorite,
    addToCart,
  } = useShop();

  const activeTab = tabs.some(
    ([id]) => id === params.get("tab")
  )
    ? params.get("tab")
    : "overview";

  const favoriteBooks = useMemo(
    () =>
      books.filter(
        (book) =>
          favorites.includes(book.id)
      ),
    [books, favorites, revision]
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const book = books.find(
          (b) =>
            b.id === String(item.id)
        );

        return (
          sum +
          (Number(book?.price) || 0) *
            item.quantity
        );
      }, 0),
    [cart, books, revision]
  );

  /* AUTH STATE */

  useEffect(
    () =>
      onAuthStateChanged(auth, (value) => {
        setUser(value);
        setAuthReady(true);

        if (!value) {
          setProfile({
            fullName: "",
            phone: "",
          });
          setAddresses([]);
          setOrders([]);
          setPreferences(defaultPreferences);
        }
      }),
    []
  );

  useEffect(() => {
    document.title =
      mode === "signup"
        ? "إنشاء حساب | بوصلة"
        : mode === "login"
          ? "تسجيل الدخول | بوصلة"
          : "حسابي | بوصلة";
  }, [mode]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = setTimeout(
      () => setNotice(null),
      6500
    );

    return () => clearTimeout(timeout);
  }, [notice]);

  function flash(
    message,
    type = "success"
  ) {
    setNotice({
      message,
      type,
    });
  }

  /* CUSTOMER PROFILE FIRESTORE LISTENER */

  useEffect(() => {
    if (!user || mode !== "account") {
      return undefined;
    }

    setAccountLoading(true);

    const ref = doc(
      db,
      "customerAccounts",
      user.uid
    );

    return onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists()
          ? snap.data()
          : {};

        setProfile({
          fullName: String(
            data.fullName ||
              user.displayName ||
              ""
          ),
          phone: String(
            data.phone || ""
          ),
        });

        setAddresses(
          Array.isArray(data.addresses)
            ? data.addresses
            : []
        );

        setPreferences({
          ...defaultPreferences,
          ...(data.preferences || {}),
        });

        setAccountLoading(false);
      },
      (error) => {
        setAccountLoading(false);
        flash(
          messageFor(error),
          "error"
        );
      }
    );
  }, [mode, user]);

  /* CUSTOMER'S OWN ORDERS ONLY */

  useEffect(() => {
    if (!user || mode !== "account") {
      return undefined;
    }

    setOrdersLoading(true);
    setOrdersError("");

    return onSnapshot(
      query(
        collection(db, "orders"),
        where(
          "customerUid",
          "==",
          user.uid
        )
      ),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({
            ...d.data(),
            id: d.id,
          })
        );

        list.sort(
          (a, b) =>
            String(
              b.createdAt || ""
            ).localeCompare(
              String(
                a.createdAt || ""
              )
            )
        );

        setOrders(list);
        setOrdersLoading(false);
      },
      (error) => {
        setOrders([]);
        setOrdersError(
          messageFor(error)
        );
        setOrdersLoading(false);
      }
    );
  }, [mode, user]);

  /* LOGIN / SIGNUP / RESET */

  async function submitAuth(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setNotice(null);

    const email = authForm.email
      .trim()
      .toLowerCase();

    try {
      if (resetMode) {
        await sendPasswordResetEmail(
          auth,
          email
        );

        flash(
          "إذا كان البريد مسجّلًا فستصلك رسالة استعادة كلمة المرور."
        );

        setResetMode(false);
      } else if (mode === "signup") {
        if (
          authForm.name.trim().length < 3
        ) {
          throw Error(
            "أدخل اسمًا كاملًا (3 أحرف على الأقل)."
          );
        }

        if (
          authForm.password.length < 8
        ) {
          throw Error(
            "كلمة المرور يجب أن تتكون من 8 أحرف على الأقل."
          );
        }

        if (
          authForm.password !==
          authForm.confirm
        ) {
          throw Error(
            "تأكيد كلمة المرور غير مطابق."
          );
        }

        const {
          user: created,
        } =
          await createUserWithEmailAndPassword(
            auth,
            email,
            authForm.password
          );

        await updateProfile(created, {
          displayName:
            authForm.name.trim(),
        });

        await setDoc(
          doc(
            db,
            "customerAccounts",
            created.uid
          ),
          {
            fullName:
              authForm.name.trim(),
            email: created.email,
            phone: "",
            addresses: [],
            preferences:
              defaultPreferences,
            createdAt:
              new Date().toISOString(),
            updatedAt:
              new Date().toISOString(),
          }
        );

        navigate("/account", {
          replace: true,
        });
      } else {
        await signInWithEmailAndPassword(
          auth,
          email,
          authForm.password
        );

        navigate("/account", {
          replace: true,
        });
      }

      setAuthForm(initialAuth);
    } catch (error) {
      flash(
        messageFor(error),
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  /* SAVE CUSTOMER PROFILE */

  async function saveData(
    data,
    confirmation
  ) {
    if (!user || busy) {
      return false;
    }

    setBusy(true);

    try {
      const ref = doc(
        db,
        "customerAccounts",
        user.uid
      );

      await setDoc(
        ref,
        {
          ...data,
          email: user.email || "",
          updatedAt:
            new Date().toISOString(),
        },
        {
          merge: true,
        }
      );

      flash(confirmation);

      return true;
    } catch (error) {
      flash(
        messageFor(error),
        "error"
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  /* EDIT PROFILE */

  async function submitProfile(event) {
    event.preventDefault();

    const name =
      profile.fullName.trim();

    const phone =
      profile.phone.replace(
        /[\s-]/g,
        ""
      );

    if (
      name.length < 3 ||
      name.length > 100
    ) {
      return flash(
        "أدخل اسمًا صحيحًا.",
        "error"
      );
    }

    if (
      phone &&
      !/^(?:\+213|0)[567]\d{8}$/.test(
        phone
      )
    ) {
      return flash(
        "رقم الهاتف غير صحيح.",
        "error"
      );
    }

    if (
      await saveData(
        {
          fullName: name,
          phone,
        },
        "تم حفظ بيانات الحساب."
      )
    ) {
      try {
        await updateProfile(
          auth.currentUser,
          {
            displayName: name,
          }
        );
      } catch {
        // Firestore save succeeded.
      }
    }
  }

  /* ADD / EDIT ADDRESS */

  async function submitAddress(event) {
    event.preventDefault();

    const value =
      Object.fromEntries(
        Object.entries(
          addressDraft
        ).map(
          ([k, v]) => [
            k,
            String(v).trim(),
          ]
        )
      );

    if (
      !value.label ||
      !value.wilaya ||
      !value.commune ||
      value.address.length < 8
    ) {
      return flash(
        "أكمل بيانات العنوان.",
        "error"
      );
    }

    if (
      addresses.length >= 10 &&
      !editingAddressId
    ) {
      return flash(
        "يمكن حفظ عشرة عناوين بحد أقصى.",
        "error"
      );
    }

    const next = editingAddressId
      ? addresses.map(
          (a) =>
            a.id === editingAddressId
              ? {
                  ...a,
                  ...value,
                }
              : a
        )
      : [
          ...addresses,
          {
            ...value,
            id: crypto.randomUUID(),
            isDefault:
              addresses.length === 0,
          },
        ];

    if (
      await saveData(
        {
          addresses: next,
        },
        "تم حفظ العنوان."
      )
    ) {
      setAddressOpen(false);
      setEditingAddressId(null);
      setAddressDraft(emptyAddress);
    }
  }

  async function removeAddress(id) {
    if (
      !window.confirm(
        "هل تريد حذف العنوان؟"
      )
    ) {
      return;
    }

    let next = addresses.filter(
      (a) => a.id !== id
    );

    if (
      next.length &&
      !next.some(
        (a) => a.isDefault
      )
    ) {
      next = next.map(
        (a, i) => ({
          ...a,
          isDefault: i === 0,
        })
      );
    }

    await saveData(
      {
        addresses: next,
      },
      "تم حذف العنوان."
    );
  }

  async function defaultAddress(id) {
    await saveData(
      {
        addresses: addresses.map(
          (a) => ({
            ...a,
            isDefault:
              a.id === id,
          })
        ),
      },
      "تم تغيير العنوان الافتراضي."
    );
  }

  async function changePreference(id) {
    await saveData(
      {
        preferences: {
          ...preferences,
          [id]:
            !preferences[id],
        },
      },
      "تم حفظ التفضيلات."
    );
  }

  /* FIREBASE PASSWORD CHANGE */

  async function submitPassword(event) {
    event.preventDefault();

    if (!user || passwordLoading) {
      return;
    }

    if (
      passwordForm.next.length < 10 ||
      !/[A-Za-z\u0621-\u064A]/.test(
        passwordForm.next
      ) ||
      !/\d/.test(
        passwordForm.next
      )
    ) {
      return flash(
        "كلمة المرور الجديدة يجب أن تضم 10 أحرف على الأقل، بينها حرف ورقم.",
        "error"
      );
    }

    if (
      passwordForm.next !==
      passwordForm.confirm
    ) {
      return flash(
        "تأكيد كلمة المرور غير مطابق.",
        "error"
      );
    }

    setPasswordLoading(true);

    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(
          user.email,
          passwordForm.current
        )
      );

      await updatePassword(
        user,
        passwordForm.next
      );

      setPasswordForm({
        current: "",
        next: "",
        confirm: "",
      });

      flash(
        "تم تحديث كلمة المرور بنجاح."
      );
    } catch (error) {
      flash(
        messageFor(error),
        "error"
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  /* BUY AGAIN */

  function buyAgain(order) {
    const matched = (
      order.items || []
    ).filter(
      (line) =>
        books.some(
          (b) =>
            b.id === String(
              line.bookId
            )
        )
    );

    if (!matched.length) {
      return flash(
        "كتب هذا الطلب غير متاحة حاليًا.",
        "error"
      );
    }

    matched.forEach(
      (line) =>
        addToCart(
          String(line.bookId),
          Number(line.quantity) || 1
        )
    );

    navigate("/cart");
  }

  function goToTab(id) {
    setParams(
      id === "overview"
        ? {}
        : { tab: id },
      {
        preventScrollReset: true,
      }
    );

    setNotice(null);

    if (window.innerWidth < 800) {
      document
        .getElementById(
          "account-content"
        )
        ?.scrollIntoView({
          behavior: reduced
            ? "instant"
            : "smooth",
        });
    }
  }

  /* CHECK AUTH BEFORE RENDER */

  if (!authReady) {
    return (
      <main
        id="main-content"
        className="account-page"
      >
        <section className="account-body">
          <div
            className="container account-surface"
            style={{
              textAlign: "center",
            }}
          >
            <LoaderCircle className="animate-spin" />
            جارٍ التحقق من جلسة الحساب...
          </div>
        </section>
      </main>
    );
  }

  if (user && mode !== "account") {
    return (
      <Navigate
        to="/account"
        replace
      />
    );
  }

  if (!user && mode === "account") {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /* SHARED LOGIN / SIGNUP DESIGN */

  if (!user) {
    const signup =
      mode === "signup";

    return (
      <main
        id="main-content"
        className="account-page"
        dir="rtl"
      >
        <section className="account-hero">
          <div className="container account-hero-inner">
            <div>
              <p className="account-eyebrow">
                <Sparkles size={16} />
                حساب بوصلة
              </p>

              <h1>
                {signup
                  ? "انضم إلى"
                  : "مرحبًا بعودتك إلى"}{" "}
                <span>
                  بوصلة.
                </span>
              </h1>

              <p>
                {signup
                  ? "أنشئ حسابك لتتابع طلباتك وعناوينك بكل سهولة."
                  : "سجّل الدخول لإدارة حسابك ومتابعة طلباتك."}
              </p>
            </div>

            <div className="account-hero-symbol">
              <Compass size={61} />
            </div>
          </div>
        </section>

        <section className="account-body">
          <div
            className="container"
            style={{
              maxWidth: 590,
            }}
          >
            <section
              className="account-surface account-form"
              style={{
                padding:
                  "clamp(22px,4vw,44px)",
              }}
            >
              <div className="account-profile-intro">
                <span className="account-security-symbol">
                  <ShieldCheck size={28} />
                </span>

                <div>
                  <h3>
                    {resetMode
                      ? "استعادة كلمة المرور"
                      : signup
                        ? "إنشاء حساب جديد"
                        : "تسجيل الدخول"}
                  </h3>

                  <p>
                    تسجيل آمن باستخدام
                    Firebase Authentication.
                  </p>
                </div>
              </div>

              {/* LOGIN / SIGNUP TABS */}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  margin: "22px 0",
                  borderBottom:
                    "1px solid #e5eeee",
                  paddingBottom: 12,
                }}
              >
                <Link
                  to="/login"
                  onClick={() =>
                    setResetMode(false)
                  }
                  style={{
                    color: !signup
                      ? "#008e82"
                      : "#182c69",
                    borderBottom: !signup
                      ? "2px solid #008e82"
                      : "none",
                    fontWeight: 800,
                    padding: "10px 12px",
                  }}
                >
                  تسجيل الدخول
                </Link>

                <Link
                  to="/signup"
                  onClick={() =>
                    setResetMode(false)
                  }
                  style={{
                    color: signup
                      ? "#008e82"
                      : "#182c69",
                    borderBottom: signup
                      ? "2px solid #008e82"
                      : "none",
                    fontWeight: 800,
                    padding: "10px 12px",
                  }}
                >
                  إنشاء حساب
                </Link>
              </div>

              <form
                className="account-form-fields"
                onSubmit={submitAuth}
              >
                {signup && !resetMode && (
                  <div className="account-field account-field-full">
                    <label htmlFor="signup-name">
                      الاسم الكامل
                    </label>

                    <input
                      id="signup-name"
                      minLength={3}
                      maxLength={100}
                      required
                      autoComplete="name"
                      value={
                        authForm.name
                      }
                      onChange={(e) =>
                        setAuthForm(
                          (a) => ({
                            ...a,
                            name:
                              e.target.value,
                          })
                        )
                      }
                    />
                  </div>
                )}

                <div className="account-field account-field-full">
                  <label htmlFor="auth-email">
                    البريد الإلكتروني
                  </label>

                  <input
                    id="auth-email"
                    type="email"
                    dir="ltr"
                    required
                    autoComplete="email"
                    value={
                      authForm.email
                    }
                    onChange={(e) =>
                      setAuthForm(
                        (a) => ({
                          ...a,
                          email:
                            e.target.value,
                        })
                      )
                    }
                  />
                </div>

                {!resetMode && (
                  <div className="account-field account-field-full">
                    <label htmlFor="auth-password">
                      كلمة المرور
                    </label>

                    <div
                      style={{
                        position: "relative",
                      }}
                    >
                      <input
                        id="auth-password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        required
                        minLength={
                          signup
                            ? 8
                            : undefined
                        }
                        autoComplete={
                          signup
                            ? "new-password"
                            : "current-password"
                        }
                        value={
                          authForm.password
                        }
                        onChange={(e) =>
                          setAuthForm(
                            (a) => ({
                              ...a,
                              password:
                                e.target.value,
                            })
                          )
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (v) => !v
                          )
                        }
                        aria-label={
                          showPassword
                            ? "إخفاء كلمة المرور"
                            : "إظهار كلمة المرور"
                        }
                        style={{
                          position: "absolute",
                          insetInlineEnd: 14,
                          top: "50%",
                          transform:
                            "translateY(-50%)",
                          border: 0,
                          background:
                            "transparent",
                        }}
                      >
                        {showPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {signup && !resetMode && (
                  <div className="account-field account-field-full">
                    <label htmlFor="auth-confirm">
                      تأكيد كلمة المرور
                    </label>

                    <input
                      id="auth-confirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={
                        authForm.confirm
                      }
                      onChange={(e) =>
                        setAuthForm(
                          (a) => ({
                            ...a,
                            confirm:
                              e.target.value,
                          })
                        )
                      }
                    />
                  </div>
                )}

                <div className="account-field account-field-full">
                  <button
                    type="submit"
                    className="account-action-primary"
                    disabled={busy}
                    style={{
                      width: "100%",
                      justifyContent:
                        "center",
                      minHeight: 50,
                    }}
                  >
                    {busy ? (
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <LockKeyhole size={18} />
                    )}

                    {resetMode
                      ? "إرسال رابط الاستعادة"
                      : signup
                        ? "إنشاء الحساب"
                        : "تسجيل الدخول"}
                  </button>
                </div>
              </form>

              <div
                className="account-form-actions"
                style={{
                  marginTop: 18,
                  flexWrap: "wrap",
                }}
              >
                {resetMode ? (
                  <button
                    type="button"
                    className="account-action-secondary"
                    onClick={() =>
                      setResetMode(false)
                    }
                  >
                    العودة للدخول
                  </button>
                ) : signup ? (
                  <Link
                    className="account-action-secondary"
                    to="/login"
                  >
                    لديك حساب بالفعل؟ سجّل الدخول
                  </Link>
                ) : (
                  <>
                    <Link
                      className="account-action-secondary"
                      to="/signup"
                    >
                      ليس لديك حساب؟ أنشئ حسابًا
                    </Link>

                    <button
                      type="button"
                      className="account-action-secondary"
                      onClick={() =>
                        setResetMode(true)
                      }
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </>
                )}
              </div>

              <Notice value={notice} />
            </section>
          </div>
        </section>
      </main>
    );
  }

  /* AUTHENTICATED ACCOUNT */

  return (
    <main
      id="main-content"
      className="account-page"
      dir="rtl"
    >
      <section className="account-hero">
        <div className="container account-hero-inner">
          <motion.div
            initial={
              reduced
                ? false
                : {
                    opacity: 0,
                    y: 20,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
          >
            <p className="account-eyebrow">
              <Sparkles size={16} />
              مساحتك الشخصية
            </p>

            <h1>
              أهلًا،{" "}
              <span>
                {profile.fullName ||
                  user.displayName ||
                  "قارئ بوصلة"}
              </span>
            </h1>

            <p>
              طلباتك وكتبك المفضلة وعناوينك في مكان واحد.
            </p>
          </motion.div>

          <div className="account-hero-symbol">
            <Compass size={61} />
          </div>
        </div>
      </section>

      <section className="account-body">
        <div className="container account-layout">
          {/* SIDEBAR */}

          <aside className="account-sidebar">
            <div className="account-sidebar-user">
              <div className="account-avatar">
                {(
                  profile.fullName ||
                  user.email ||
                  "ب"
                ).charAt(0)}
              </div>

              <div>
                <strong>
                  {profile.fullName ||
                    user.displayName ||
                    "قارئ بوصلة"}
                </strong>

                <span
                  style={{
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {user.email}
                </span>
              </div>
            </div>

            <nav aria-label="أقسام حسابي">
              {tabs.map(
                ([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    className={`account-nav-item ${
                      activeTab === id
                        ? "is-active"
                        : ""
                    }`}
                    onClick={() =>
                      goToTab(id)
                    }
                    aria-current={
                      activeTab === id
                        ? "page"
                        : undefined
                    }
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                    <ArrowLeft size={15} />
                  </button>
                )
              )}
            </nav>

            <div className="account-sidebar-bottom">
              <ShieldCheck size={20} />
              <p>
                حساب آمن مرتبط بـ Firebase.
                بياناتك الشخصية لا يطّلع
                عليها العملاء الآخرون.
              </p>
            </div>

            <button
              type="button"
              className="account-action-secondary"
              style={{
                marginTop: 16,
                width: "100%",
                justifyContent:
                  "center",
              }}
              onClick={() =>
                signOut(auth)
                  .then(() =>
                    navigate("/login")
                  )
                  .catch((e) =>
                    flash(
                      messageFor(e),
                      "error"
                    )
                  )
              }
            >
              <LogOut size={17} />
              تسجيل الخروج
            </button>
          </aside>

          {/* CONTENT */}

          <div
            id="account-content"
            className="account-content"
          >
            {accountLoading && (
              <p className="account-info-message">
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
                جارٍ تحميل حسابك...
              </p>
            )}

            <AnimatePresence
              mode="wait"
              initial={false}
            >
              <motion.div
                key={activeTab}
                className="account-panel"
                initial={
                  reduced
                    ? false
                    : {
                        opacity: 0,
                        y: 14,
                      }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration:
                    reduced
                      ? 0
                      : 0.25,
                }}
              >
                {/* OVERVIEW */}

                {activeTab === "overview" && (
                  <>
                    <SectionHeading
                      eyebrow="لوحة المتابعة"
                      title="نظرة على رفّك."
                    >
                      <Link to="/books">
                        تصفح الكتب
                        <ArrowUpLeft size={17} />
                      </Link>
                    </SectionHeading>

                    <div className="account-stats">
                      {[
                        [
                          "طلباتي",
                          orders.length,
                          Package,
                          "orders",
                        ],
                        [
                          "كتب مفضلة",
                          favorites.length,
                          Heart,
                          "favorites",
                        ],
                        [
                          "نسخ في السلة",
                          cartCount,
                          ShoppingBag,
                          "/cart",
                        ],
                        [
                          "عناوين محفوظة",
                          addresses.length,
                          MapPin,
                          "addresses",
                        ],
                      ].map(
                        ([
                          label,
                          value,
                          Icon,
                          target,
                        ]) => (
                          <button
                            type="button"
                            key={label}
                            className="account-stat"
                            onClick={() =>
                              target.startsWith(
                                "/"
                              )
                                ? navigate(
                                    target
                                  )
                                : goToTab(
                                    target
                                  )
                            }
                          >
                            <span className="account-stat-icon">
                              <Icon size={23} />
                            </span>

                            <strong>
                              {value}
                            </strong>
                            <span>
                              {label}
                            </span>
                            <ArrowUpLeft size={16} />
                          </button>
                        )
                      )}
                    </div>

                    <div className="account-overview-grid">
                      <div className="account-surface">
                        <div className="account-surface-heading">
                          <div>
                            <p>
                              آخر النشاطات
                            </p>
                            <h3>
                              أحدث الطلبات
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              goToTab(
                                "orders"
                              )
                            }
                          >
                            عرض الكل
                            <ArrowLeft size={16} />
                          </button>
                        </div>

                        {ordersError ? (
                          <p className="account-info-message">
                            {ordersError}
                          </p>
                        ) : ordersLoading ? (
                          <p>
                            جارٍ التحميل...
                          </p>
                        ) : orders.length ? (
                          orders
                            .slice(0, 3)
                            .map((o) => (
                              <button
                                type="button"
                                className="account-recent-order"
                                key={o.id}
                                onClick={() => {
                                  setExpandedOrder(
                                    o.id
                                  );
                                  goToTab(
                                    "orders"
                                  );
                                }}
                              >
                                <span className="account-recent-icon">
                                  <Package size={20} />
                                </span>

                                <span>
                                  <strong dir="ltr">
                                    {o.id}
                                  </strong>
                                  <small>
                                    {formatDate(
                                      o.createdAt
                                    )}
                                  </small>
                                </span>

                                <b>
                                  {formatPrice(
                                    o.total
                                  )}
                                </b>
                              </button>
                            ))
                        ) : (
                          <div className="account-mini-empty">
                            <Package size={29} />

                            <p>
                              لم تسجّل أي طلبات بحسابك.
                            </p>

                            <Link to="/books">
                              ابدأ من المكتبة
                              <ArrowLeft size={16} />
                            </Link>
                          </div>
                        )}
                      </div>

                      <div className="account-welcome-card">
                        <Compass size={39} />

                        <span>
                          YOUR READING SPACE
                        </span>

                        <h3>
                          كل قراءة،
                          <br />
                          <em>
                            وجهة جديدة.
                          </em>
                        </h3>

                        <p>
                          استكشف كتابك القادم من بوصلة.
                        </p>

                        <Link to="/favorites">
                          رفّي المفضل
                          <ArrowUpLeft size={17} />
                        </Link>
                      </div>
                    </div>

                    <div
                      className="account-surface account-overview-cart"
                      style={{
                        marginTop: 20,
                      }}
                    >
                      <div className="account-surface-heading">
                        <div>
                          <p>
                            في انتظارك
                          </p>
                          <h3>
                            سلّة الكتب
                          </h3>
                        </div>

                        <Link to="/cart">
                          انتقل إلى السلة
                          <ArrowLeft size={16} />
                        </Link>
                      </div>

                      <div className="account-cart-overview">
                        <span>
                          {cartCount} نسخة في السلة
                        </span>
                        <strong>
                          {formatPrice(
                            cartTotal
                          )}
                        </strong>
                      </div>
                    </div>
                  </>
                )}

                {/* ORDERS */}

                {activeTab === "orders" && (
                  <>
                    <SectionHeading
                      eyebrow="سجل نشاطك"
                      title="طلباتي."
                    />

                    <div className="account-info-message">
                      <ShieldCheck size={20} />

                      <p>
                        تظهر هنا الطلبات التي أرسلتها
                        وأنت مسجّل الدخول. الطلبات
                        السابقة كزائر لا تُربط
                        تلقائيًا بحسابك. الأسعار
                        تحتاج تأكيد الإدارة.
                      </p>
                    </div>

                    {ordersLoading ? (
                      <p className="account-info-message">
                        جارٍ تحميل الطلبات...
                      </p>
                    ) : ordersError ? (
                      <p
                        className="account-info-message"
                        role="alert"
                      >
                        {ordersError}
                      </p>
                    ) : orders.length ? (
                      <div className="account-orders-list">
                        {orders.map(
                          (order) => (
                            <article
                              className="account-order"
                              key={order.id}
                            >
                              <div className="account-order-top">
                                <div>
                                  <span className="account-order-caption">
                                    رقم الطلب
                                  </span>

                                  <strong dir="ltr">
                                    {order.id}
                                  </strong>

                                  <small>
                                    {formatDate(
                                      order.createdAt
                                    )}
                                  </small>
                                </div>

                                <span className="account-order-status">
                                  {statusText(
                                    order.status
                                  )}
                                </span>
                              </div>

                              <div className="account-order-summary">
                                <div>
                                  <span>
                                    الكتب
                                  </span>

                                  <strong>
                                    {(order.items || []).reduce(
                                      (n, i) =>
                                        n +
                                        (Number(
                                          i.quantity
                                        ) || 0),
                                      0
                                    )}{" "}
                                    نسخة
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    الوجهة
                                  </span>

                                  <strong>
                                    {[
                                      order.commune,
                                      order.wilaya,
                                    ]
                                      .filter(
                                        Boolean
                                      )
                                      .join(
                                        "، "
                                      ) ||
                                      "—"}
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    الإجمالي التقديري
                                  </span>

                                  <strong>
                                    {formatPrice(
                                      order.total
                                    )}
                                  </strong>
                                </div>
                              </div>

                              <div className="account-order-actions">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedOrder(
                                      (n) =>
                                        n ===
                                        order.id
                                          ? null
                                          : order.id
                                    )
                                  }
                                >
                                  {expandedOrder ===
                                  order.id
                                    ? "إخفاء التفاصيل"
                                    : "عرض التفاصيل"}

                                  <ChevronDown
                                    size={16}
                                    className={
                                      expandedOrder ===
                                      order.id
                                        ? "is-rotated"
                                        : ""
                                    }
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    buyAgain(
                                      order
                                    )
                                  }
                                >
                                  <ShoppingBag size={16} />
                                  أضف الكتب للسلة مجددًا
                                </button>
                              </div>

                              <AnimatePresence>
                                {expandedOrder ===
                                  order.id && (
                                  <motion.div
                                    className="account-order-items"
                                    initial={{
                                      opacity: 0,
                                      height: 0,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      height:
                                        "auto",
                                    }}
                                    exit={{
                                      opacity: 0,
                                      height: 0,
                                    }}
                                  >
                                    {(order.items || []).map(
                                      (
                                        line,
                                        i
                                      ) => (
                                        <div
                                          key={`${line.bookId}-${i}`}
                                        >
                                          <Link
                                            to={`/books/${line.bookId}`}
                                          >
                                            {
                                              line.title
                                            }
                                          </Link>

                                          <span>
                                            {
                                              line.quantity
                                            }{" "}
                                            ×{" "}
                                            {formatPrice(
                                              line.unitPrice
                                            )}
                                          </span>
                                        </div>
                                      )
                                    )}

                                    <p>
                                      رسوم التوصيل:{" "}
                                      {formatPrice(
                                        order.shippingFee ||
                                          0
                                      )}{" "}
                                      —{" "}
                                      {order.pricingVerified
                                        ? "تمت مراجعة السعر"
                                        : "بانتظار مراجعة الإدارة"}
                                      .
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </article>
                          )
                        )}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Package}
                        title="سجل طلباتك فارغ"
                        description="أرسل طلبًا أثناء تسجيل الدخول ليظهر هنا."
                        link="/books"
                        linkLabel="تصفح الكتب"
                      />
                    )}
                  </>
                )}

                {/* FAVORITES */}

                {activeTab === "favorites" && (
                  <>
                    <SectionHeading
                      eyebrow="اختياراتك"
                      title="كتبي المفضلة."
                    >
                      <Link to="/favorites">
                        كل المفضلة
                        <ArrowLeft size={17} />
                      </Link>
                    </SectionHeading>

                    {favoriteBooks.length ? (
                      <div className="account-favorites-grid">
                        {favoriteBooks.map(
                          (book) => (
                            <div
                              key={book.id}
                              className="account-favorite-card"
                            >
                              <Link
                                to={`/books/${book.id}`}
                                className="account-favorite-cover"
                              >
                                <BookCover book={book} />
                              </Link>

                              <div>
                                <Link
                                  to={`/books/${book.id}`}
                                  className="account-favorite-title"
                                >
                                  {book.title}
                                </Link>

                                <span>
                                  {book.author}
                                </span>

                                <strong>
                                  {formatPrice(
                                    book.price
                                  )}
                                </strong>
                              </div>

                              <div className="account-favorite-actions">
                                <button
                                  type="button"
                                  disabled={
                                    book.stock <=
                                    0
                                  }
                                  onClick={() =>
                                    addToCart(
                                      book.id
                                    )
                                  }
                                  title="إضافة إلى السلة"
                                >
                                  <ShoppingBag size={17} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleFavorite(
                                      book.id
                                    )
                                  }
                                  title="حذف من المفضلة"
                                >
                                  <Heart
                                    size={17}
                                    fill="currentColor"
                                  />
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Heart}
                        title="لا توجد مفضلة بعد"
                        description="اختر كتبك واضغط أيقونة القلب."
                        link="/books"
                        linkLabel="تصفح الكتب"
                      />
                    )}
                  </>
                )}

                {/* PROFILE */}

                {activeTab === "profile" && (
                  <>
                    <SectionHeading
                      eyebrow="بيانات الحساب"
                      title="ملفي الشخصي."
                    />

                    <form
                      className="account-surface account-form"
                      onSubmit={submitProfile}
                    >
                      <div className="account-profile-intro">
                        <span className="account-avatar account-avatar-large">
                          {(
                            profile.fullName ||
                            "ب"
                          ).charAt(0)}
                        </span>

                        <div>
                          <h3>
                            معلوماتك الأساسية
                          </h3>

                          <p>
                            تُحفظ البيانات داخل حسابك في Firestore.
                          </p>
                        </div>
                      </div>

                      <div className="account-form-fields">
                        <div className="account-field">
                          <label htmlFor="profile-name">
                            الاسم الكامل
                          </label>

                          <input
                            id="profile-name"
                            required
                            minLength={3}
                            maxLength={100}
                            value={
                              profile.fullName
                            }
                            onChange={(e) =>
                              setProfile(
                                (p) => ({
                                  ...p,
                                  fullName:
                                    e.target.value,
                                })
                              )
                            }
                          />
                        </div>

                        <div className="account-field">
                          <label htmlFor="profile-email">
                            البريد الإلكتروني
                          </label>

                          <input
                            id="profile-email"
                            type="email"
                            dir="ltr"
                            readOnly
                            value={
                              user.email ||
                              ""
                            }
                          />
                        </div>

                        <div className="account-field">
                          <label htmlFor="profile-phone">
                            رقم الهاتف
                          </label>

                          <input
                            id="profile-phone"
                            type="tel"
                            dir="ltr"
                            placeholder="0550 00 00 00"
                            value={
                              profile.phone
                            }
                            onChange={(e) =>
                              setProfile(
                                (p) => ({
                                  ...p,
                                  phone:
                                    e.target.value,
                                })
                              )
                            }
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="account-action-primary"
                        disabled={busy}
                      >
                        <Save size={17} />

                        {busy
                          ? "جارٍ الحفظ..."
                          : "حفظ التغييرات"}
                      </button>
                    </form>
                  </>
                )}

                {/* ADDRESSES */}

                {activeTab === "addresses" && (
                  <>
                    <SectionHeading
                      eyebrow="أماكن التوصيل"
                      title="عناويني."
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddressId(
                            null
                          );
                          setAddressDraft(
                            emptyAddress
                          );
                          setAddressOpen(
                            true
                          );
                        }}
                      >
                        <Plus size={18} />
                        إضافة عنوان
                      </button>
                    </SectionHeading>

                    {addresses.length ? (
                      <div className="account-address-grid">
                        {addresses.map(
                          (a) => (
                            <article
                              className="account-address-card"
                              key={a.id}
                            >
                              <div className="account-address-top">
                                <span>
                                  <MapPin size={20} />
                                </span>

                                {a.isDefault && (
                                  <b>
                                    العنوان الافتراضي
                                  </b>
                                )}
                              </div>

                              <h3>
                                {a.label}
                              </h3>

                              <p>
                                {a.wilaya}
                                ،{" "}
                                {a.commune}
                              </p>

                              <p>
                                {a.address}
                              </p>

                              <div className="account-address-actions">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    setEditingAddressId(
                                      a.id
                                    );
                                    setAddressDraft(
                                      {
                                        label:
                                          a.label,
                                        wilaya:
                                          a.wilaya,
                                        commune:
                                          a.commune,
                                        address:
                                          a.address,
                                      }
                                    );
                                    setAddressOpen(
                                      true
                                    );
                                  }}
                                >
                                  <Pencil size={15} />
                                  تعديل
                                </button>

                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    removeAddress(
                                      a.id
                                    )
                                  }
                                >
                                  <Trash2 size={15} />
                                  حذف
                                </button>

                                {!a.isDefault && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      defaultAddress(
                                        a.id
                                      )
                                    }
                                  >
                                    جعله افتراضيًا
                                  </button>
                                )}
                              </div>
                            </article>
                          )
                        )}
                      </div>
                    ) : (
                      !addressOpen && (
                        <EmptyState
                          icon={MapPin}
                          title="لا توجد عناوين محفوظة"
                          description="أضف عنوان التوصيل المفضل لديك."
                        />
                      )
                    )}

                    {addressOpen && (
                      <form
                        className="account-surface account-form account-address-form"
                        onSubmit={submitAddress}
                      >
                        <h3>
                          {editingAddressId
                            ? "تعديل العنوان"
                            : "إضافة عنوان"}
                        </h3>

                        <div className="account-form-fields">
                          {[
                            [
                              "label",
                              "اسم العنوان",
                              "المنزل / العمل",
                            ],
                            [
                              "wilaya",
                              "الولاية",
                              "الجزائر",
                            ],
                            [
                              "commune",
                              "البلدية",
                              "باب الزوار",
                            ],
                            [
                              "address",
                              "العنوان بالتفصيل",
                              "الحي، الشارع، رقم المنزل...",
                            ],
                          ].map(
                            ([
                              id,
                              label,
                              placeholder,
                            ]) => (
                              <div
                                className={`account-field ${
                                  id ===
                                  "address"
                                    ? "account-field-full"
                                    : ""
                                }`}
                                key={id}
                              >
                                <label
                                  htmlFor={`addr-${id}`}
                                >
                                  {label}
                                </label>

                                <input
                                  id={`addr-${id}`}
                                  required
                                  minLength={
                                    id ===
                                    "address"
                                      ? 8
                                      : 1
                                  }
                                  maxLength={
                                    id ===
                                    "address"
                                      ? 250
                                      : 80
                                  }
                                  placeholder={
                                    placeholder
                                  }
                                  value={
                                    addressDraft[
                                      id
                                    ]
                                  }
                                  onChange={(e) =>
                                    setAddressDraft(
                                      (p) => ({
                                        ...p,
                                        [id]:
                                          e.target.value,
                                      })
                                    )
                                  }
                                />
                              </div>
                            )
                          )}
                        </div>

                        <div className="account-form-actions">
                          <button
                            className="account-action-primary"
                            type="submit"
                            disabled={busy}
                          >
                            <Save size={17} />

                            {busy
                              ? "جارٍ الحفظ..."
                              : "حفظ العنوان"}
                          </button>

                          <button
                            type="button"
                            className="account-action-secondary"
                            onClick={() =>
                              setAddressOpen(
                                false
                              )
                            }
                          >
                            إلغاء
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}

                {/* SECURITY */}

                {activeTab === "security" && (
                  <>
                    <SectionHeading
                      eyebrow="حماية الحساب"
                      title="الأمان وكلمة المرور."
                    />

                    <div className="account-info-message">
                      <ShieldCheck size={20} />

                      <p>
                        تحديث كلمة المرور يتم عبر
                        Firebase Authentication مع
                        التحقق من كلمة المرور الحالية.
                      </p>
                    </div>

                    <form
                      className="account-surface account-form"
                      onSubmit={submitPassword}
                    >
                      <div className="account-profile-intro">
                        <span className="account-security-symbol">
                          <LockKeyhole size={27} />
                        </span>

                        <div>
                          <h3>
                            تغيير كلمة المرور
                          </h3>

                          <p>
                            لا نحفظ كلمة مرورك في Firestore.
                          </p>
                        </div>
                      </div>

                      <div className="account-form-fields">
                        {[
                          [
                            "current",
                            "كلمة المرور الحالية",
                          ],
                          [
                            "next",
                            "كلمة المرور الجديدة",
                          ],
                          [
                            "confirm",
                            "تأكيد كلمة المرور",
                          ],
                        ].map(
                          ([id, label]) => (
                            <div
                              className="account-field account-field-full"
                              key={id}
                            >
                              <label
                                htmlFor={`pass-${id}`}
                              >
                                {label}
                              </label>

                              <input
                                id={`pass-${id}`}
                                type="password"
                                required
                                autoComplete={
                                  id ===
                                  "current"
                                    ? "current-password"
                                    : "new-password"
                                }
                                value={
                                  passwordForm[
                                    id
                                  ]
                                }
                                onChange={(e) =>
                                  setPasswordForm(
                                    (p) => ({
                                      ...p,
                                      [id]:
                                        e.target.value,
                                    })
                                  )
                                }
                                disabled={
                                  passwordLoading
                                }
                              />
                            </div>
                          )
                        )}
                      </div>

                      <button
                        type="submit"
                        className="account-action-primary"
                        disabled={
                          passwordLoading
                        }
                      >
                        <LockKeyhole size={17} />

                        {passwordLoading
                          ? "جارٍ التحديث..."
                          : "تغيير كلمة المرور"}
                      </button>
                    </form>
                  </>
                )}

                {/* PREFERENCES */}

                {activeTab === "preferences" && (
                  <>
                    <SectionHeading
                      eyebrow="تخصيص التجربة"
                      title="تفضيلاتي."
                    />

                    <div className="account-surface account-preferences">
                      <div className="account-preferences-heading">
                        <Settings2 size={25} />

                        <div>
                          <h3>
                            إعدادات القراءة والحساب
                          </h3>

                          <p>
                            تحفظ تفضيلاتك في Firestore،
                            دون تفعيل إشعارات بريدية آلية.
                          </p>
                        </div>
                      </div>

                      {[
                        [
                          "readingUpdates",
                          "أخبار ومقترحات الكتب",
                          "حفظ رغبتك في تلقي مقترحات القراءة",
                          BookOpen,
                        ],
                        [
                          "orderReminders",
                          "تنبيهات الطلبات",
                          "حفظ رغبتك في تلقي تحديثات الطلب",
                          Package,
                        ],
                        [
                          "compactCards",
                          "عرض مدمج",
                          "تفضيل البطاقات المدمجة مستقبلًا",
                          LayoutDashboard,
                        ],
                      ].map(
                        ([
                          id,
                          label,
                          description,
                          Icon,
                        ]) => (
                          <label
                            className="account-preference-row"
                            key={id}
                          >
                            <span className="account-preference-icon">
                              <Icon size={20} />
                            </span>

                            <span className="account-preference-copy">
                              <strong>
                                {label}
                              </strong>
                              <small>
                                {description}
                              </small>
                            </span>

                            <input
                              type="checkbox"
                              checked={
                                !!preferences[
                                  id
                                ]
                              }
                              disabled={busy}
                              onChange={() =>
                                changePreference(
                                  id
                                )
                              }
                            />
                          </label>
                        )
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <Notice value={notice} />
          </div>
        </div>
      </section>
    </main>
  );
}
