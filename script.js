let expenses = [];

// Check authentication on page load
function checkAuthentication() {
  const isAuthenticated = sessionStorage.getItem("authenticated");
  if (!isAuthenticated) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Wait for DOM and Supabase to be ready
function initializeApp() {
  // Check authentication first
  if (!checkAuthentication()) {
    return;
  }

  // Set today's date as default
  document.getElementById("date").valueAsDate = new Date();

  // Auto-calculate amount owed when total amount changes
  document.getElementById("totalAmount").addEventListener("input", function () {
    const total = parseFloat(this.value) || 0;
    const isPayment = document.getElementById("isPayment").checked;
    if (isPayment) {
      document.getElementById("debtorAmount").value = total.toFixed(2);
    } else {
      document.getElementById("debtorAmount").value = (total / 2).toFixed(2);
    }
  });

  // Handle payment checkbox changes
  document.getElementById("isPayment").addEventListener("change", function () {
    const total = parseFloat(document.getElementById("totalAmount").value) || 0;
    const creditorLabel = document.querySelector('label[for="creditor"]');
    const debtorLabel = document.querySelector('label[for="debtor"]');
    const debtorAmountLabel = document.querySelector(
      'label[for="debtorAmount"]'
    );

    if (this.checked) {
      document.getElementById("debtorAmount").value = total.toFixed(2);
      document.getElementById("submit-btn").textContent = "Add Payment";
      document.getElementById("submit-btn").style =
        "background-color: #28a745;";
      if (debtorAmountLabel) debtorAmountLabel.textContent = "Payment Amount";
      if (creditorLabel)
        creditorLabel.textContent = "Creditor (Who receives payment?)";
      if (debtorLabel) debtorLabel.textContent = "Debtor (Who is paying?)";
    } else {
      document.getElementById("debtorAmount").value = (total / 2).toFixed(2);
      document.getElementById("submit-btn").style =
        "background-color: #2563eb;";
      document.getElementById("submit-btn").textContent = "Add Expense";
      if (debtorAmountLabel) debtorAmountLabel.textContent = "Amount Owed";
      if (creditorLabel) creditorLabel.textContent = "Creditor (Who paid?)";
      if (debtorLabel) debtorLabel.textContent = "Debtor (Who owes?)";
    }
  });

  // Check if Supabase is ready
  if (typeof supabase === "undefined") {
    console.log("Waiting for Supabase to initialize...");
    setTimeout(initializeApp, 100);
    return;
  }

  console.log("App initialized with Supabase");
  loadExpenses();
}

// Helper function to show loading state
function showLoading(show = true) {
  const loader = document.getElementById("loadingIndicator");
  if (loader) {
    loader.style.display = show ? "block" : "none";
  }
}

// Helper function to show error messages
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  if (errorDiv && errorText) {
    errorText.textContent = message;
    errorDiv.style.display = "block";
    setTimeout(() => {
      errorDiv.style.display = "none";
    }, 5000);
  }
}

async function addExpense() {
  const isPayment = document.getElementById("isPayment").checked;

  const expense = {
    date: document.getElementById("date").value,
    purpose: document.getElementById("purpose").value,
    quantity: parseInt(document.getElementById("quantity").value),
    total_amount: parseFloat(document.getElementById("totalAmount").value),
    creditor: document.getElementById("creditor").value,
    debtor: document.getElementById("debtor").value,
    debtor_amount: isPayment
      ? -parseFloat(document.getElementById("totalAmount").value)
      : parseFloat(document.getElementById("debtorAmount").value),
  };

  // Validation
  if (
    !expense.date ||
    !expense.purpose ||
    !expense.creditor ||
    !expense.debtor
  ) {
    showError("Please fill in all required fields");
    return;
  }

  showLoading(true);

  try {
    const { data, error } = await supabase
      .from("expenses")
      .insert([expense])
      .select();

    if (error) throw error;

    // Add the new expense to local array with database ID
    expenses.push(data[0]);

    updateTable();
    updateDebtSummary();
    clearForm();
  } catch (error) {
    console.error("Error adding expense:", error);
    showError("Failed to add expense: " + error.message);
  } finally {
    showLoading(false);
  }
}

function updateTable() {
  const tbody = document.getElementById("expenseBody");
  tbody.innerHTML = "";

  expenses.forEach((expense) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${expense.date}</td>
      <td>${expense.purpose}</td>
      <td>${expense.quantity}</td>
      <td>₱${parseFloat(expense.total_amount).toFixed(2)}</td>
      <td>${expense.creditor}</td>
      <td>${expense.debtor}</td>
      <td>₱${parseFloat(expense.debtor_amount).toFixed(2)}</td>
      <td><button class="btn-delete" onclick="deleteExpense(${
        expense.id
      })">Delete</button></td>
    `;
  });
}

function updateDebtSummary() {
  const debtMap = {};

  // Calculate net debts with automatic offsetting
  expenses.forEach((expense) => {
    const key1 = `${expense.debtor}|${expense.creditor}`;
    const key2 = `${expense.creditor}|${expense.debtor}`;

    if (!debtMap[key1]) {
      debtMap[key1] = 0;
    }
    debtMap[key1] += parseFloat(expense.debtor_amount);

    if (debtMap[key2]) {
      const offset = Math.min(debtMap[key1], Math.abs(debtMap[key2]));
      debtMap[key1] -= offset;
      debtMap[key2] -= offset;
    }
  });

  const summaryDiv = document.getElementById("debtSummary");
  summaryDiv.innerHTML = "";

  const activeDebts = Object.entries(debtMap).filter(
    ([_, amount]) => amount > 0.01
  );

  if (activeDebts.length === 0) {
    summaryDiv.innerHTML =
      '<div class="settled-card"><h3>✅ All settled!</h3><p>No outstanding debts</p></div>';
    return;
  }

  activeDebts.forEach(([relationship, amount]) => {
    const [debtor, creditor] = relationship.split("|");
    const card = document.createElement("div");
    card.className = "debt-card";
    card.innerHTML = `
      <h3>${debtor} owes ${creditor}</h3>
      <div class="debt-amount">₱${amount.toFixed(2)}</div>
    `;
    summaryDiv.appendChild(card);
  });
}

async function deleteExpense(id) {
  if (!confirm("Are you sure you want to delete this expense?")) {
    return;
  }

  showLoading(true);

  try {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) throw error;

    expenses = expenses.filter((e) => e.id !== id);
    updateTable();
    updateDebtSummary();
  } catch (error) {
    console.error("Error deleting expense:", error);
    showError("Failed to delete expense: " + error.message);
  } finally {
    showLoading(false);
  }
}

function clearForm() {
  document.getElementById("purpose").value = "";
  document.getElementById("quantity").value = "1";
  document.getElementById("totalAmount").value = "";
  document.getElementById("creditor").value = "";
  document.getElementById("debtor").value = "";
  document.getElementById("debtorAmount").value = "";
  document.getElementById("isPayment").checked = false;
  document.getElementById("date").valueAsDate = new Date();
}

function exportToExcel() {
  const data = expenses.map((e) => ({
    Date: e.date,
    Purpose: e.purpose,
    Quantity: e.quantity,
    "Total Amount": e.total_amount,
    Creditor: e.creditor,
    Debtor: e.debtor,
    "Amount Owed": e.debtor_amount,
    Status: e.status,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");

  // Add debt summary sheet
  const debtMap = {};
  expenses.forEach((expense) => {
    const key1 = `${expense.debtor}|${expense.creditor}`;
    const key2 = `${expense.creditor}|${expense.debtor}`;

    if (!debtMap[key1]) {
      debtMap[key1] = 0;
    }
    debtMap[key1] += parseFloat(expense.debtor_amount);

    if (debtMap[key2]) {
      const offset = Math.min(debtMap[key1], Math.abs(debtMap[key2]));
      debtMap[key1] -= offset;
      debtMap[key2] -= offset;
    }
  });

  const debtData = Object.entries(debtMap)
    .filter(([_, amount]) => amount > 0.01)
    .map(([relationship, amount]) => {
      const [debtor, creditor] = relationship.split("|");
      return {
        Debtor: debtor,
        Creditor: creditor,
        "Net Amount Owed": amount,
      };
    });

  const ws2 = XLSX.utils.json_to_sheet(debtData);
  XLSX.utils.book_append_sheet(wb, ws2, "Debt Summary");

  XLSX.writeFile(
    wb,
    `Ambagan_Expenses_${new Date().toISOString().split("T")[0]}.xlsx`
  );
}

// Load expenses from Supabase on page load
async function loadExpenses() {
  showLoading(true);

  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;

    expenses = data || [];
    updateTable();
    updateDebtSummary();
  } catch (error) {
    console.error("Error loading expenses:", error);
    showError("Failed to load expenses: " + error.message);
  } finally {
    showLoading(false);
  }
}

// Initialize on page load
window.onload = function () {
  // Check authentication first
  if (!checkAuthentication()) {
    return;
  }
  loadExpenses();
  initializeApp();
};

// Logout function
function logout() {
  sessionStorage.removeItem("authenticated");
  window.location.href = "login.html";
}
