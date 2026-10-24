
/* =====================================
   BAWSALA — DEMO ACCOUNT STORAGE
===================================== */

const KEYS = {
  profile: "bawsala-demo-profile",
  addresses: "bawsala-demo-addresses",
  orders: "bawsala-demo-orders",
  preferences: "bawsala-demo-preferences",
};

export const defaultProfile = {
  fullName: "قارئ بوصلة",
  email: "",
  phone: "",
};

export const defaultPreferences = {
  readingUpdates: true,
  orderReminders: true,
  compactCards: false,
};

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);

    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* =====================================
   PROFILE
===================================== */

export function getDemoProfile() {
  const saved = readStorage(KEYS.profile, {});

  return {
    ...defaultProfile,
    ...(saved && !Array.isArray(saved)
      ? saved
      : {}),
  };
}

export function saveDemoProfile(profile) {
  return writeStorage(KEYS.profile, {
    fullName: String(profile.fullName || "").slice(0, 100),
    email: String(profile.email || "").slice(0, 254),
    phone: String(profile.phone || "").slice(0, 30),
  });
}

/* =====================================
   ADDRESSES
===================================== */

export function getDemoAddresses() {
  const saved = readStorage(KEYS.addresses, []);

  return Array.isArray(saved) ? saved : [];
}

export function saveDemoAddresses(addresses) {
  return writeStorage(
    KEYS.addresses,
    addresses.slice(0, 10)
  );
}

/* =====================================
   PREFERENCES
===================================== */

export function getDemoPreferences() {
  const saved = readStorage(KEYS.preferences, {});

  return {
    ...defaultPreferences,
    ...(saved && !Array.isArray(saved)
      ? saved
      : {}),
  };
}

export function saveDemoPreferences(preferences) {
  return writeStorage(
    KEYS.preferences,
    preferences
  );
}

/* =====================================
   DEMO ORDER HISTORY
===================================== */

export function getDemoOrders() {
  const saved = readStorage(KEYS.orders, []);

  if (!Array.isArray(saved)) return [];

  return [...saved].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
}

/*
   Called ONLY after the customer confirms
   the frontend checkout preview.

   No real order is sent or created.
   Do not store payment data or passwords.
*/

export function saveDemoOrder({
  items,
  total,
  customerName,
  shipping,
}) {
  try {
    const existing = getDemoOrders();

    const id = `BZ-DEMO-${Date.now().toString(
      36
    ).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    const order = {
      id,
      createdAt: new Date().toISOString(),
      status: "demo",

      customerName: String(
        customerName || "قارئ بوصلة"
      ).slice(0, 100),

      // City-level data only
      shipping: {
        wilaya: String(
          shipping?.wilaya || ""
        ).slice(0, 80),

        commune: String(
          shipping?.commune || ""
        ).slice(0, 80),
      },

      items: (Array.isArray(items) ? items : [])
        .map((item) => ({
          id: Number(item.id),
          title: String(item.title || ""),
          price: Number(item.price) || 0,
          quantity: Math.max(
            1,
            Math.min(99, Number(item.quantity) || 1)
          ),
        }))
        .slice(0, 50),

      total: Number(total) || 0,
    };

    const saved = writeStorage(
      KEYS.orders,
      [order, ...existing].slice(0, 50)
    );

    return saved ? order : null;
  } catch {
    return null;
  }
}

/* =====================================
   DATE FORMAT
===================================== */

export function formatAccountDate(date) {
  try {
    return new Intl.DateTimeFormat("ar-DZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "تاريخ غير متوفر";
  }
}
