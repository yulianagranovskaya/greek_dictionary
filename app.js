let words = [];

fetch("./words.json")
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(data => {
    words = data;
    render(words);
    console.log("Loaded words:", words.length);
  })
  .catch(err => {
    console.error("Ошибка загрузки words.json:", err);
    document.getElementById("list").innerHTML =
      `<div class="card">Ошибка загрузки words.json: ${err.message}</div>`;
  });

function render(data) {
  const list = document.getElementById("list");
  list.innerHTML = "";

  data.forEach(w => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <b>${w.english}</b><br>
      ${w.greek}<br>
      ${w.level} • ${w.type}
    `;

    list.appendChild(div);
  });
}

document.getElementById("search").addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();

  const filtered = words.filter(w =>
    String(w.english).toLowerCase().includes(q) ||
    String(w.greek).toLowerCase().includes(q)
  );

  render(filtered);
});