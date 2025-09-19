let expenses = [];

// Set today's date as default
document.getElementById("date").valueAsDate = new Date();

// Auto-calculate amount owed when total amount changes
document.getElementById("totalAmount").addEventListener("input", function () {
  const total = parseFloat(this.value) || 0;
  document.getElementById("debtorAmount").value = (total / 2).toFixed(2);
});

function addExpense() {
  const expense = {
    id: Date.now(),
    date: document.getElementById("date").value,
    purpose: document.getElementById("purpose").value,
    quantity: document.getElementById("quantity").value,
    totalAmount: parseFloat(document.getElementById("totalAmount").value),
    creditor: document.getElementById("creditor").value,
    debtor: document.getElementById("debtor").value,
    debtorAmount: parseFloat(document.getElementById("debtorAmount").value),
    status: document.getElementById("status").value,
  };

  expenses.push(expense);
  updateTable();
  updateDebtSummary();
  clearForm();

  // Save to localStorage
  localStorage.setItem("expenses", JSON.stringify(expenses));
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
                    <td>₱${expense.totalAmount.toFixed(2)}</td>
                    <td>${expense.creditor}</td>
                    <td>${expense.debtor}</td>
                    <td>₱${expense.debtorAmount.toFixed(2)}</td>
                    <td><span class="status-${expense.status.toLowerCase()}">${
      expense.status
    }</span></td>
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
    if (expense.status === "Pending") {
      // Create keys for both directions
      const key1 = `${expense.debtor}|${expense.creditor}`;
      const key2 = `${expense.creditor}|${expense.debtor}`;

      // Add to debtor owes creditor
      if (!debtMap[key1]) {
        debtMap[key1] = 0;
      }
      debtMap[key1] += expense.debtorAmount;

      // Check if there's a reverse debt and offset
      if (debtMap[key2]) {
        const offset = Math.min(debtMap[key1], Math.abs(debtMap[key2]));
        debtMap[key1] -= offset;
        debtMap[key2] -= offset;
      }
    }
  });

  const summaryDiv = document.getElementById("debtSummary");
  summaryDiv.innerHTML = "";

  // Filter out zero or negative debts and display
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

function deleteExpense(id) {
  expenses = expenses.filter((e) => e.id !== id);
  updateTable();
  updateDebtSummary();
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

function clearForm() {
  document.getElementById("purpose").value = "";
  document.getElementById("quantity").value = "1";
  document.getElementById("totalAmount").value = "";
  document.getElementById("creditor").value = "";
  document.getElementById("debtor").value = "";
  document.getElementById("debtorAmount").value = "";
  document.getElementById("date").valueAsDate = new Date();
}

function exportToExcel() {
  const data = expenses.map((e) => ({
    Date: e.date,
    Purpose: e.purpose,
    Quantity: e.quantity,
    "Total Amount": e.totalAmount,
    Creditor: e.creditor,
    Debtor: e.debtor,
    "Amount Owed": e.debtorAmount,
    Status: e.status,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");

  // Add debt summary sheet with net calculations
  const debtMap = {};
  expenses.forEach((expense) => {
    if (expense.status === "Pending") {
      const key1 = `${expense.debtor}|${expense.creditor}`;
      const key2 = `${expense.creditor}|${expense.debtor}`;

      if (!debtMap[key1]) {
        debtMap[key1] = 0;
      }
      debtMap[key1] += expense.debtorAmount;

      if (debtMap[key2]) {
        const offset = Math.min(debtMap[key1], Math.abs(debtMap[key2]));
        debtMap[key1] -= offset;
        debtMap[key2] -= offset;
      }
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

// Load expenses from localStorage on page load
window.onload = function () {
  const saved = localStorage.getItem("expenses");
  if (saved) {
    expenses = JSON.parse(saved);
    updateTable();
    updateDebtSummary();
  }
};
