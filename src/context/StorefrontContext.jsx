
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase.js";

import {
  setPublishedBooks,
} from "../data/books.js";

import {
  setPublishedBlogs,
} from "../data/blogs.js";

/* =====================================
   CONTEXT
===================================== */

const StorefrontContext = createContext(null);

/* =====================================
   DEFAULT PUBLIC SETTINGS

   Used only if Firestore publicConfig/store
   is missing or incomplete.

   All checkout amounts remain unverified
   until the administrator reviews them.
===================================== */

const DEFAULT_SETTINGS = {
  general: {
    name: "بوصلة",
    slogan: "لكل قارئ وجهة",
    currency: "DZD",
  },

  branding: {
    logoUrl: "/images/bawsala-logo.png",
    primaryColor: "#182c69",
    secondaryColor: "#008e82",
    announcementEnabled: false,
    announcementText: "",
  },

  contact: {
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
  },

  system: {
    acceptOrders: true,
    maintenanceMode: false,
  },

  shipping: {
    homeDelivery: true,
    officePickup: false,
    defaultFee: 0,
    freeShippingEnabled: false,
    freeShippingThreshold: 0,
    zones: [],
  },

  payments: {
    cashOnDelivery: true,
  },

  seo: {
    title: "بوصلة | متجر الكتب",
    description: "",
  },
};

/* =====================================
   HELPERS
===================================== */

function asObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function asBoolean(value, fallback) {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function asMoney(value, fallback = 0) {
  const number = Number(value);

  return Number.isInteger(number) &&
    number >= 0
    ? number
    : fallback;
}

/* =====================================
   COMPLETE / NORMALIZE SETTINGS

   Missing fields receive safe fallback
   values for the client interface.
===================================== */

function normalizeSettings(value) {
  const data = asObject(value);

  const system = asObject(data.system);
  const shipping = asObject(data.shipping);
  const payments = asObject(data.payments);

  const configurationReady = Boolean(
    data.system &&
    data.shipping &&
    data.payments
  );

  return {
    ...DEFAULT_SETTINGS,
    ...data,

    general: {
      ...DEFAULT_SETTINGS.general,
      ...asObject(data.general),
    },

    branding: {
      ...DEFAULT_SETTINGS.branding,
      ...asObject(data.branding),
    },

    contact: {
      ...DEFAULT_SETTINGS.contact,
      ...asObject(data.contact),
    },

    system: {
      acceptOrders: asBoolean(
        system.acceptOrders,
        DEFAULT_SETTINGS.system.acceptOrders
      ),

      maintenanceMode: asBoolean(
        system.maintenanceMode,
        DEFAULT_SETTINGS.system.maintenanceMode
      ),
    },

    shipping: {
      homeDelivery: asBoolean(
        shipping.homeDelivery,
        DEFAULT_SETTINGS.shipping.homeDelivery
      ),

      officePickup: asBoolean(
        shipping.officePickup,
        DEFAULT_SETTINGS.shipping.officePickup
      ),

      defaultFee: asMoney(
        shipping.defaultFee
      ),

      freeShippingEnabled: asBoolean(
        shipping.freeShippingEnabled,
        false
      ),

      freeShippingThreshold: asMoney(
        shipping.freeShippingThreshold
      ),

      zones: Array.isArray(shipping.zones)
        ? shipping.zones
        : [],
    },

    payments: {
      cashOnDelivery: asBoolean(
        payments.cashOnDelivery,
        DEFAULT_SETTINGS.payments.cashOnDelivery
      ),
    },

    seo: {
      ...DEFAULT_SETTINGS.seo,
      ...asObject(data.seo),
    },

    /* CLIENT-ONLY METADATA */

    _configurationReady: configurationReady,
    _usingFallback: !configurationReady,
  };
}

/* =====================================
   CURRENT DATA
===================================== */

let currentSettings = normalizeSettings(null);
let currentContent = {};

/* =====================================
   GLOBAL GETTERS

   Required by orderCheckout.js
===================================== */

export function getStoreSettings() {
  return currentSettings;
}

export function getText(
  key,
  fallback = ""
) {
  const value = currentContent[key];

  return typeof value === "string" &&
    value.trim()
    ? value
    : fallback;
}

/* =====================================
   STOREFRONT PROVIDER
===================================== */

export function StorefrontProvider({
  children,
}) {
  const [revision, setRevision] =
    useState(0);

  const [retry, setRetry] =
    useState(0);

  const [status, setStatus] =
    useState({
      loading: true,
      error: "",
    });

  const [settings, setSettings] =
    useState(() =>
      normalizeSettings(null)
    );

  const [content, setContent] =
    useState({});

  /* =====================================
     FIRESTORE LISTENERS
  ===================================== */

  useEffect(() => {
    let active = true;

    const loaded = new Set();

    function updated(source) {
      if (!active) return;

      loaded.add(source);

      setRevision(
        (previous) => previous + 1
      );

      if (loaded.size === 4) {
        setStatus({
          loading: false,
          error: "",
        });
      }
    }

    function failed(error) {
      if (!active) return;

      console.error(
        "Storefront Firestore error:",
        error
      );

      setStatus({
        loading: false,
        error:
          error?.message ||
          "تعذر الاتصال بقاعدة البيانات.",
      });
    }

    setStatus({
      loading: true,
      error: "",
    });

    /* =====================================
       BOOKS
    ===================================== */

    const stopBooks = onSnapshot(
      query(
        collection(db, "books"),
        where(
          "isPublished",
          "==",
          true
        )
      ),

      (snapshot) => {
        if (!active) return;

        const books = snapshot.docs.map(
          (item) => ({
            ...item.data(),
            id: item.id,
          })
        );

        setPublishedBooks(books);
        updated("books");
      },

      failed
    );

    /* =====================================
       BLOG
    ===================================== */

    const stopBlogs = onSnapshot(
      query(
        collection(db, "blogs"),
        where(
          "status",
          "==",
          "published"
        )
      ),

      (snapshot) => {
        if (!active) return;

        const blogs = snapshot.docs.map(
          (item) => ({
            ...item.data(),
            id: item.id,
          })
        );

        setPublishedBlogs(blogs);
        updated("blogs");
      },

      failed
    );

    /* =====================================
       PUBLIC SETTINGS

       IMPORTANT:
       Missing document is NOT an error.

       Automatically use fallback settings
       without writing to Firestore.
    ===================================== */

    const stopSettings = onSnapshot(
      doc(
        db,
        "publicConfig",
        "store"
      ),

      (snapshot) => {
        if (!active) return;

        const data = snapshot.exists()
          ? snapshot.data()
          : null;

        const resolved =
          normalizeSettings(data);

        currentSettings = resolved;
        setSettings(resolved);

        if (!snapshot.exists()) {
          console.info(
            "publicConfig/store is missing. Using client fallback settings."
          );
        }

        updated("settings");
      },

      failed
    );

    /* =====================================
       WEBSITE CONTENT
    ===================================== */

    const stopContent = onSnapshot(
      doc(
        db,
        "websiteContent",
        "main"
      ),

      (snapshot) => {
        if (!active) return;

        const data = snapshot.exists()
          ? snapshot.data()
          : {};

        const fields = Array.isArray(
          data.resolvedFields
        )
          ? data.resolvedFields
          : Array.isArray(data.fields)
            ? data.fields
            : [];

        const mappedFields =
          Object.fromEntries(
            fields
              .filter(
                (field) =>
                  typeof field?.id ===
                    "string" &&
                  typeof field?.value ===
                    "string"
              )
              .map((field) => [
                field.id,
                field.value,
              ])
          );

        const resolved = {
          ...mappedFields,
          ...asObject(
            data.editor?.values
          ),
        };

        currentContent = resolved;
        setContent(resolved);

        updated("content");
      },

      failed
    );

    /* =====================================
       CLEANUP
    ===================================== */

    return () => {
      active = false;

      stopBooks();
      stopBlogs();
      stopSettings();
      stopContent();
    };
  }, [retry]);

  /* =====================================
     LOADING / ERROR SCREEN
  ===================================== */

  if (
    status.loading ||
    status.error
  ) {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f5f9f8",
          padding: 24,
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 460,
            padding: 32,
            background: "#ffffff",
            border:
              "1px solid #d8e9e4",
            borderRadius: 18,
            textAlign: "center",
          }}
        >
          <img
            src="/images/bawsala-logo.png"
            alt="بوصلة"
            style={{
              width: 74,
              margin: "0 auto 20px",
            }}
          />

          <h2
            style={{
              color: "#182c69",
              marginBottom: 12,
            }}
          >
            {status.error
              ? "تعذّر تحميل بيانات المتجر"
              : "جارٍ تجهيز متجر بوصلة..."}
          </h2>

          <p
            style={{
              lineHeight: 1.9,
              color: status.error
                ? "#b42e38"
                : "#67777b",
            }}
          >
            {status.error ||
              "يتم تحميل الكتب والمقالات وإعدادات المتجر."}
          </p>

          {status.error && (
            <button
              type="button"
              onClick={() =>
                setRetry(
                  (value) => value + 1
                )
              }
              style={{
                marginTop: 16,
                padding: "12px 24px",
                background: "#182c69",
                color: "#ffffff",
                border: 0,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              إعادة المحاولة
            </button>
          )}
        </section>
      </main>
    );
  }

  /* =====================================
     PROVIDER
  ===================================== */

  return (
    <StorefrontContext.Provider
      value={{
        revision,
        settings,
        content,
        text: getText,
        configurationReady:
          settings._configurationReady,
      }}
    >
      {children}
    </StorefrontContext.Provider>
  );
}

/* =====================================
   HOOK
===================================== */

export function useStorefront() {
  const context =
    useContext(StorefrontContext);

  if (!context) {
    throw new Error(
      "useStorefront must be used inside StorefrontProvider"
    );
  }

  return context;
}
