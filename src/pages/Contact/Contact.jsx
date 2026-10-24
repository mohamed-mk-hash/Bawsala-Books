
import { useState } from "react";
import {
  useSearchParams,
  Link,
} from "react-router-dom";

import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";

import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Compass,
  Headphones,
  Mail,
  MessageCircle,
  Package,
  Send,
  Sparkles,
  Handshake,
  HelpCircle,
  AlertCircle,
  Copy,
} from "lucide-react";

import "./Contact.css";

/* ======================================
   CONTACT CONFIGURATION
====================================== */

import {
  submitContactMessage,
} from "../../services/contactMessages.js";

const topics = [
  {
    id: "books",
    title: "استفسار عن كتاب",
    description:
      "تبحث عن عنوان معين أو تريد معرفة المزيد عن كتاب؟",
    icon: BookOpen,
    number: "01",
  },
  {
    id: "orders",
    title: "الطلبات والتوصيل",
    description:
      "لديك سؤال يتعلق بطلب أو بخيارات التوصيل؟",
    icon: Package,
    number: "02",
  },
  {
    id: "partnerships",
    title: "التعاون والشراكات",
    description:
      "لديك فكرة تعاون أو اقتراح يخص بوصلة؟",
    icon: Handshake,
    number: "03",
  },
];

const topicOptions = [
  { value: "", label: "اختر موضوع الرسالة" },
  { value: "books", label: "استفسار عن كتاب" },
  { value: "orders", label: "الطلبات والتوصيل" },
  { value: "partnerships", label: "التعاون والشراكات" },
  { value: "other", label: "استفسار آخر" },
];

const faqs = [
  {
    question: "هل يمكنني الاستفسار عن توفر كتاب؟",
    answer:
      "نعم، يمكنك تحديد اسم الكتاب والكاتب في رسالتك. بعد ربط نموذج التواصل بخدمة استقبال الرسائل، يمكن لفريق المتجر متابعة استفسارك.",
  },
  {
    question: "هل يمكنني الاستفسار عن طلب سابق؟",
    answer:
      "اختر «الطلبات والتوصيل» من موضوع الرسالة، ثم أضف رقم الطلب إن كان متوفرًا. لا ترسل معلومات دفع حساسة داخل الرسالة.",
  },
  {
    question: "كيف أقترح كتابًا لإضافته إلى المتجر؟",
    answer:
      "اختر «استفسار عن كتاب»، ثم أرسل عنوان الكتاب واسم المؤلف وأي تفاصيل تساعد في التعرف عليه.",
  },
  {
    question: "هل يمكنني التواصل بشأن التعاون؟",
    answer:
      "بالتأكيد. اختر «التعاون والشراكات» واشرح فكرتك وطبيعة التعاون المقترح.",
  },
];

/* ======================================
   ANIMATIONS
====================================== */

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 25,
  },

  visible: {
    opacity: 1,
    y: 0,

    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.09,
    },
  },
};

/* ======================================
   CONTACT PAGE
====================================== */

export default function Contact() {
  const [searchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();

  const requestedTopic = searchParams.get("topic");

  const initialTopic = topicOptions.some(
    (item) => item.value === requestedTopic
  )
    ? requestedTopic
    : "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: initialTopic,
    message: "",
  });

  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState(null);

  /* ==================================
     FORM INPUT
  ================================== */

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (feedback) {
      setFeedback(null);
    }
  }

  /* ==================================
     SELECT CONTACT TOPIC
  ================================== */

  function selectTopic(topic) {
    updateField("topic", topic);

    document
      .getElementById("contact-form")
      ?.scrollIntoView({
        behavior: reducedMotion
          ? "instant"
          : "smooth",
        block: "start",
      });
  }

  /* ==================================
     SUBMIT FORM
  ================================== */


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

  return (
    <main
      id="main-content"
      className="contact-page"
    >
      {/* ==================================
          HERO
      ================================== */}

      <section className="contact-hero">
        <div className="container">

          <nav
            className="contact-breadcrumb"
            aria-label="مسار الصفحة"
          >
            <Link to="/">الرئيسية</Link>

            <ChevronLeft
              size={14}
              aria-hidden="true"
            />

            <span aria-current="page">
              تواصل معنا
            </span>
          </nav>

          <div className="contact-hero-grid">

            <motion.div
              className="contact-hero-content"
              initial={
                reducedMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 25,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.7,
              }}
            >
              <p className="contact-eyebrow">
                <span />
                نحن هنا لنسمعك
              </p>

              <h1>
                بيننا وبينك
                <br />
                <span>مساحة للحوار.</span>
              </h1>

              <p className="contact-hero-description">
                سؤال عن كتاب؟ فكرة ترغب بمشاركتها؟
                أو تحتاج إلى مساعدة؟
                <br />
                في بوصلة، نحب أن نسمع منك.
                اختر موضوعك واترك لنا رسالتك.
              </p>

              <a
                href="#contact-form"
                className="button button-primary contact-hero-button"
              >
                اكتب رسالتك
                <ArrowUpLeft size={19} />
              </a>

              <div className="contact-hero-note">
                <Compass
                  size={21}
                  strokeWidth={1.5}
                />

                <span>
                  كل حوار جيد يبدأ بكلمة.
                </span>
              </div>
            </motion.div>

            {/* HERO ART */}

            <motion.div
              className="contact-hero-art"
              initial={
                reducedMotion
                  ? false
                  : {
                      opacity: 0,
                      scale: 0.9,
                    }
              }
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration: 0.9,
                delay: 0.1,
              }}
              aria-hidden="true"
            >
              <div className="contact-orbit contact-orbit-one" />
              <div className="contact-orbit contact-orbit-two" />

              <div className="contact-art-center">
                <div className="contact-art-envelope">
                  <Mail
                    size={85}
                    strokeWidth={1.1}
                  />
                </div>
              </div>

              <div className="contact-floating-card contact-floating-card-one">
                <MessageCircle size={19} />

                <span>
                  لديك سؤال؟
                </span>
              </div>

              <div className="contact-floating-card contact-floating-card-two">
                <Sparkles size={18} />

                <span>
                  نحن نستمع.
                </span>
              </div>

              <span className="contact-art-star contact-art-star-one">
                ✦
              </span>

              <span className="contact-art-star contact-art-star-two">
                ✧
              </span>

              <span className="contact-art-caption">
                LET'S CONNECT — BAWSALA
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================================
          CONTACT TOPICS
      ================================== */}

      <section className="contact-topics-section">
        <div className="container">

          <motion.div
            className="contact-section-heading"
            initial={
              reducedMotion
                ? false
                : "hidden"
            }
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <p className="contact-eyebrow">
              <span />
              كيف يمكننا مساعدتك؟
            </p>

            <h2>
              اختر وجهة <span>رسالتك.</span>
            </h2>

            <p>
              اختر نوع الاستفسار لنساعدك
              على توجيه رسالتك.
            </p>
          </motion.div>

          <motion.div
            className="contact-topics-grid"
            initial={
              reducedMotion
                ? false
                : "hidden"
            }
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.15,
            }}
            variants={stagger}
          >
            {topics.map((topic) => {
              const Icon = topic.icon;

              return (
                <motion.button
                  key={topic.id}
                  type="button"
                  className="contact-topic-card"
                  variants={fadeUp}
                  onClick={() =>
                    selectTopic(topic.id)
                  }
                  whileHover={
                    reducedMotion
                      ? undefined
                      : { y: -7 }
                  }
                >
                  <div className="contact-topic-top">
                    <span className="contact-topic-icon">
                      <Icon
                        size={27}
                        strokeWidth={1.5}
                      />
                    </span>

                    <span className="contact-topic-number">
                      {topic.number}
                    </span>
                  </div>

                  <h3>{topic.title}</h3>

                  <p>{topic.description}</p>

                  <span className="contact-topic-link">
                    اكتب استفسارك
                    <ArrowUpLeft size={18} />
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ==================================
          CONTACT FORM
      ================================== */}

      <section
        id="contact-form"
        className="contact-form-section"
      >
        <div className="container contact-form-layout">

          {/* RIGHT SIDE */}

          <motion.div
            className="contact-form-info"
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 25,
                  }
            }
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="contact-eyebrow">
              <span />
              تواصل معنا
            </p>

            <h2>
              اكتب لنا،
              <br />
              <span>نحب أن نسمعك.</span>
            </h2>

            <p className="contact-info-description">
              شاركنا سؤالك أو اقتراحك من خلال
              النموذج. كلما كانت رسالتك واضحة،
              كان التعامل مع استفسارك أسهل.
            </p>

            <div className="contact-info-divider" />

            <div className="contact-info-feature">
              <span>
                <MessageCircle size={23} />
              </span>

              <div>
                <h3>رسالة واضحة</h3>

                <p>
                  اختر موضوع الرسالة وأضف
                  التفاصيل المهمة.
                </p>
              </div>
            </div>

            <div className="contact-info-feature">
              <span>
                <Headphones size={23} />
              </span>

              <div>
                <h3>استفسارات متنوعة</h3>

                <p>
                  الكتب، والطلبات، والتعاون،
                  والاقتراحات.
                </p>
              </div>
            </div>

            <div className="contact-info-feature">
              <span>
                <CheckCircle2 size={23} />
              </span>

              <div>
                <h3>خصوصية رسالتك</h3>

                <p>
                  لا تُرسل معلومات الدفع أو
                  كلمات المرور داخل الرسالة.
                </p>
              </div>
            </div>

            <div className="contact-info-quote">
              <Compass
                size={30}
                strokeWidth={1.2}
              />

              <p>
                «نؤمن أن التواصل الجيد
                هو بداية كل علاقة جميلة.»
              </p>

              <span>— بوصلة</span>
            </div>
          </motion.div>

          {/* FORM CARD */}

          <motion.div
            className="contact-form-card"
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 30,
                  }
            }
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{ once: true }}
            transition={{
              duration: 0.65,
              delay: 0.1,
            }}
          >
            <div className="contact-form-heading">
              <div>
                <p>لنبقَ على تواصل</p>

                <h3>
                  أرسل لنا رسالة
                </h3>
              </div>

              <span>
                <Send size={23} />
              </span>
            </div>

            <form onSubmit={handleSubmit}>

              {/* NAME */}

              <div className="contact-field">
                <label htmlFor="contact-name">
                  الاسم الكامل
                  <span>*</span>
                </label>

                <input
                  id="contact-name"
                  type="text"
                  autoComplete="name"
                  placeholder="اكتب اسمك الكامل"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>

              {/* EMAIL */}

              <div className="contact-field">
                <label htmlFor="contact-email">
                  البريد الإلكتروني
                  <span>*</span>
                </label>

                <input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value
                    )
                  }
                  maxLength={254}
                  required
                  dir="ltr"
                />
              </div>

              {/* TOPIC */}

              <div className="contact-field">
                <label htmlFor="contact-topic">
                  موضوع الرسالة
                  <span>*</span>
                </label>

                <select
                  id="contact-topic"
                  value={form.topic}
                  onChange={(event) =>
                    updateField(
                      "topic",
                      event.target.value
                    )
                  }
                  required
                >
                  {topicOptions.map((topic) => (
                    <option
                      key={topic.value}
                      value={topic.value}
                    >
                      {topic.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* MESSAGE */}

              <div className="contact-field">
                <label htmlFor="contact-message">
                  رسالتك
                  <span>*</span>
                </label>

                <textarea
                  id="contact-message"
                  rows={6}
                  placeholder="أخبرنا كيف يمكننا مساعدتك..."
                  value={form.message}
                  onChange={(event) =>
                    updateField(
                      "message",
                      event.target.value
                    )
                  }
                  minLength={10}
                  maxLength={3000}
                  required
                />

                <span className="contact-character-count">
                  {form.message.length} / 3000
                </span>
              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={loading}
                className="contact-submit-button"
              >
                <span>
                  {loading
        ? "جارٍ إرسال الرسالة..."
        : "إرسال الرسالة"}
                </span>

                <ArrowUpLeft size={20} />
              </button>

              {/* FEEDBACK */}

              <AnimatePresence mode="wait">
                {feedback && (
                  <motion.div
                    key={feedback.message}
                    className={`contact-feedback contact-feedback--${feedback.type}`}
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    role={
                      feedback.type === "error"
                        ? "alert"
                        : "status"
                    }
                  >
                    {feedback.type === "success" ? (
                      <CheckCircle2 size={19} />
                    ) : (
                      <AlertCircle size={19} />
                    )}

                    <span>{feedback.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ==================================
          FAQ
      ================================== */}

      <section className="contact-faq-section">
        <div className="container contact-faq-layout">

          <div className="contact-faq-intro">
            <p className="contact-eyebrow">
              <span />
              أسئلة شائعة
            </p>

            <h2>
              ربما تجد
              <br />
              <span>إجابتك هنا.</span>
            </h2>

            <p>
              جمعنا بعض الأسئلة المتعلقة
              بالكتب والتواصل مع بوصلة.
            </p>

            <HelpCircle
              className="contact-faq-decoration"
              size={105}
              strokeWidth={0.7}
            />
          </div>

          <div className="contact-faq-list">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="contact-faq-item"
              >
                <summary>
                  <span>
                    {faq.question}
                  </span>

                  <span className="contact-faq-plus">
                    +
                  </span>
                </summary>

                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================
          BOTTOM CTA
      ================================== */}

      <section className="contact-bottom-section">
        <div className="container contact-bottom-content">
          <Compass
            size={33}
            strokeWidth={1.2}
          />

          <p>كل محادثة قد تفتح بابًا جديدًا.</p>

          <h2>
            شكرًا لأنك جزء من رحلة بوصلة.
          </h2>

          <Link to="/books">
            استكشف مكتبتنا
            <ArrowLeft size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
