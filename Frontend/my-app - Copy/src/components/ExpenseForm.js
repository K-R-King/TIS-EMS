import React, { useEffect, useState } from "react";

/**
 * ExpenseForm
 * - Fetches dropdowns from /api/dropdowns/*
 * - Fetches logged-in user from /api/auth/user to populate enteredBy
 * - Client-side validation: amount (no letters, no negative), date year must be 4 digits
 * - Shows success message "Pending Review" on submit
 */
export default function ExpenseForm() {
  const [formData, setFormData] = useState({
    date: "",
    amount: "",
    category: "",
    reimbursementType: "",
    taxApplicable: false,
    paymentMode: "",
    description: "",
    attachment: null,
    enteredBy: "",
    status: "Pending Review",
  });

  const [categories, setCategories] = useState([]);
  const [reimbursementTypes, setReimbursementTypes] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);

  const [submitMessage, setSubmitMessage] = useState("");
  const [errors, setErrors] = useState({ date: "", amount: "" });
  const [loading, setLoading] = useState(true);

  // load dropdowns + user
  useEffect(() => {
    const load = async () => {
      try {
        // parallel fetch dropdowns
        const [catsRes, typesRes, modesRes, userRes] = await Promise.all([
          fetch("http://localhost:8080/api/dropdowns/categories"),
          fetch("http://localhost:8080/api/dropdowns/reimbursement-types"),
          fetch("http://localhost:8080/api/dropdowns/payment-modes"),
          fetch("http://localhost:8080/api/auth/user", { credentials: "include" }),
        ]);

        // parse safely (if not ok -> null)
        const cats = catsRes.ok ? await catsRes.json() : null;
        const types = typesRes.ok ? await typesRes.json() : null;
        const modes = modesRes.ok ? await modesRes.json() : null;
        const user = userRes && userRes.ok ? await userRes.json() : null;

        // defensive set
        setCategories(Array.isArray(cats) ? cats : []);
        setReimbursementTypes(Array.isArray(types) ? types : []);
        setPaymentModes(Array.isArray(modes) ? modes : []);
        if (user && user.username) {
          setFormData((f) => ({ ...f, enteredBy: user.username }));
        }

      } catch (err) {
        console.error("Error loading dropdowns or user:", err);
        setCategories([]); setReimbursementTypes([]); setPaymentModes([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // helper: sanitize amount input (no letters, single decimal, no negative)
  const sanitizeAmount = (value) => {
    if (value == null) return "";
    // remove everything except digits and dot
    let cleaned = value.replace(/[^0-9.]/g, "");
    // if more than one dot, keep first only
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    // strip leading zeros unless "0" or "0.xxx"
    if (/^0[0-9]/.test(cleaned)) cleaned = cleaned.replace(/^0+/, "");
    // avoid starting with dot: ".5" -> "0.5"
    if (cleaned.startsWith(".")) cleaned = "0" + cleaned;
    // prevent negative
    if (cleaned === "") return "";
    // final numeric check
    const num = parseFloat(cleaned);
    if (isNaN(num)) return "";
    if (num < 0) return "";
    return cleaned;
  };

  // validate date: ensure pattern yyyy-mm-dd and year is 4 digits
  const validateDate = (value) => {
    if (!value) return "";
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return "Date must be in YYYY-MM-DD format";
    }
    const year = match[1];
    if (year.length !== 4) return "Year must be 4 digits";
    const yNum = parseInt(year, 10);
    if (yNum < 1900 || yNum > 2100) return "Year out of range (1900-2100)";
    return "";
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (name === "amount") {
      const clean = sanitizeAmount(value);
      // update validation message
      setErrors((prev) => ({ ...prev, amount: clean === "" && value !== "" ? "Invalid amount" : "" }));
      setFormData((prev) => ({ ...prev, amount: clean }));
      return;
    }

    if (name === "date") {
      const err = validateDate(value);
      setErrors((prev) => ({ ...prev, date: err }));
      setFormData((prev) => ({ ...prev, date: value }));
      return;
    }

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files[0] ?? null }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // create a simple avatar letter from username
  const avatarLetter = (username) => {
    if (!username) return "?";
    return username.trim().charAt(0).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // final validations
    if (errors.date) {
      setSubmitMessage("Please fix date field before submitting.");
      return;
    }
    if (errors.amount) {
      setSubmitMessage("Please fix amount field before submitting.");
      return;
    }
    if (!formData.date || !formData.amount || !formData.category) {
      setSubmitMessage("Please fill required fields (Date, Amount, Category).");
      return;
    }

    const fd = new FormData();
    // ensure we append enteredBy so backend can record it (backend also reads security)
    fd.append("date", formData.date);
    fd.append("amount", formData.amount);
    fd.append("category", formData.category);
    fd.append("reimbursementType", formData.reimbursementType || "");
    fd.append("taxApplicable", formData.taxApplicable ? "true" : "false");
    fd.append("paymentMode", formData.paymentMode || "");
    fd.append("description", formData.description || "");
    if (formData.attachment) fd.append("attachment", formData.attachment);
    fd.append("enteredBy", formData.enteredBy || "");
    fd.append("status", formData.status || "Pending Review");

    try {
      const res = await fetch("http://localhost:8080/api/expenses", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      if (res.ok) {
        setSubmitMessage("✅ Expense submitted — Pending Review.");
        // clear form (but keep enteredBy)
        setFormData((prev) => ({
          date: "",
          amount: "",
          category: "",
          reimbursementType: "",
          taxApplicable: false,
          paymentMode: "",
          description: "",
          attachment: null,
          enteredBy: prev.enteredBy,
          status: "Pending Review",
        }));
        setErrors({ date: "", amount: "" });
      } else {
        const txt = await res.text();
        setSubmitMessage("❌ Submit failed: " + txt);
      }
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitMessage("❌ Network error submitting expense.");
    }
  };

  // UI while loading dropdowns
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.cardCenter}>
          <p style={{ textAlign: "center" }}>Loading form…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>Create Expense</h1>
            <p style={styles.subtitle}>Submit your expense for review</p>
          </div>
          <div style={styles.userBox}>
            <div style={styles.avatar}>{avatarLetter(formData.enteredBy)}</div>
            <div style={{ marginLeft: 10 }}>
              <div style={styles.username}>{formData.enteredBy || "Not signed in"}</div>
              <div style={styles.roleSmall}>Entered By</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Date *</label>
              <input
                style={styles.input}
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
              {errors.date && <div style={styles.error}>{errors.date}</div>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Amount *</label>
              <input
                style={styles.input}
                type="text"
                inputMode="decimal"
                name="amount"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                required
              />
              {errors.amount && <div style={styles.error}>{errors.amount}</div>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Expense Category *</label>
              <select
                style={styles.select}
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">-- Select Category --</option>
                {Array.isArray(categories) && categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))
                ) : (
                  <option disabled>No categories</option>
                )}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Reimbursement Type</label>
              <select
                style={styles.select}
                name="reimbursementType"
                value={formData.reimbursementType}
                onChange={handleChange}
              >
                <option value="">-- Select Type --</option>
                {Array.isArray(reimbursementTypes) && reimbursementTypes.length > 0 ? (
                  reimbursementTypes.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))
                ) : (
                  <option disabled>No types</option>
                )}
              </select>
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.labelInline}>
                <input
                  type="checkbox"
                  name="taxApplicable"
                  checked={formData.taxApplicable}
                  onChange={handleChange}
                  style={{ marginRight: 8 }}
                />
                Tax Applicable
              </label>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Payment Mode</label>
              <select
                style={styles.select}
                name="paymentMode"
                value={formData.paymentMode}
                onChange={handleChange}
              >
                <option value="">-- Select Mode --</option>
                {Array.isArray(paymentModes) && paymentModes.length > 0 ? (
                  paymentModes.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))
                ) : (
                  <option disabled>No payment modes</option>
                )}
              </select>
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.label}>Description / Comments</label>
              <textarea
                name="description"
                rows="3"
                style={styles.textarea}
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Attachment</label>
              <input
                style={styles.inputFile}
                type="file"
                name="attachment"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleChange}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Entered By</label>
              <input
                style={{ ...styles.input, backgroundColor: "#f5f7fb" }}
                type="text"
                name="enteredBy"
                value={formData.enteredBy}
                readOnly
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button type="submit" style={styles.primaryButton}>Submit Expense</button>
            <button
              type="button"
              style={styles.ghostButton}
              onClick={() => {
                // reset (keeps enteredBy)
                setFormData((prev) => ({
                  ...prev,
                  date: "",
                  amount: "",
                  category: "",
                  reimbursementType: "",
                  taxApplicable: false,
                  paymentMode: "",
                  description: "",
                  attachment: null,
                }));
                setErrors({ date: "", amount: "" });
                setSubmitMessage("");
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {submitMessage && <div style={styles.snackbar}>{submitMessage}</div>}
      </div>
    </div>
  );
}

/* Styles (JS object) */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "linear-gradient(120deg,#e6f0ff 0%, #ffffff 60%)",
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  },
  card: {
    width: "100%",
    maxWidth: 920,
    background: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(14,30,37,0.12)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "22px 28px",
    background: "linear-gradient(90deg,#6f8cff,#8a5cff)",
    color: "#fff",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
  },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  subtitle: { margin: 0, fontSize: 13, opacity: 0.95 },
  userBox: { display: "flex", alignItems: "center" },
  avatar: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    background: "#fff",
    color: "#5b6bff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 18,
  },
  username: { fontWeight: 700, color: "#fff" },
  roleSmall: { fontSize: 12, opacity: 0.85, color: "#f2f5ff" },

  form: { padding: 22 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    gap: 16,
  },
  field: { display: "flex", flexDirection: "column" },
  fieldFull: { gridColumn: "1 / -1", display: "flex", alignItems: "center" },
  label: { fontSize: 13, marginBottom: 6, fontWeight: 600 },
  labelInline: { display: "flex", alignItems: "center", fontWeight: 600 },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e6e9ef",
    fontSize: 14,
    outline: "none",
  },
  select: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e6e9ef",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  textarea: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #e6e9ef",
    fontSize: 14,
    resize: "vertical",
  },
  inputFile: {
    padding: 8,
    borderRadius: 8,
    border: "1px dashed #e1e6f8",
    fontSize: 14,
    background: "#fafbff",
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 18,
    alignItems: "center",
  },
  primaryButton: {
    background: "linear-gradient(90deg,#4b6bff,#7b5cff)",
    color: "#fff",
    border: "none",
    padding: "12px 18px",
    fontSize: 15,
    borderRadius: 10,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(75,107,255,0.16)",
  },
  ghostButton: {
    background: "#fff",
    color: "#333",
    border: "1px solid #e6e9ef",
    padding: "10px 14px",
    fontSize: 14,
    borderRadius: 10,
    cursor: "pointer",
  },
  snackbar: {
    margin: 18,
    padding: 12,
    borderRadius: 8,
    background: "#f0fdf4",
    color: "#065f46",
    fontWeight: 700,
    textAlign: "center",
  },
  error: { marginTop: 6, color: "#b91c1c", fontSize: 13 },
  // responsive
  "@media (max-width: 720px)": {
    grid: { gridTemplateColumns: "1fr", gap: 14 },
  },
  // center card for small screens
  cardCenter: {
    width: "100%",
    maxWidth: 480,
    padding: 20,
    borderRadius: 12,
    background: "#fff",
  },
};
