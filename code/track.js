/* SPORTIX - track order page (simulated delivery status) */
document.addEventListener("DOMContentLoaded", () => {
    const { $, esc, money, get, currentUser } = window.Sportix;

    // Each stage starts this many minutes after the order was placed (demo speed)
    const STAGES = [
        { name: "Order placed", note: "We received your order.", at: 0 },
        { name: "Confirmed", note: "Payment verified and order accepted.", at: 1 },
        { name: "Packed", note: "Your items are packed at our warehouse.", at: 3 },
        { name: "Shipped", note: "Handed over to the courier.", at: 6 },
        { name: "Out for delivery", note: "The rider is on the way to you.", at: 10 },
        { name: "Delivered", note: "Order delivered. Enjoy your game!", at: 15 }
    ];
    const fmt = t => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

    function demoOrder() {
        return {
            id: "SPX-DEMO", placedAt: Date.now() - 7 * 60000,
            items: [{ name: "Adidas Football", qty: 1, price: 2500 }, { name: "Yonex Badminton Racket", qty: 1, price: 2800 }],
            subtotal: 5300, delivery: 100, total: 5400,
            shipping: { name: "Demo Customer", city: "Dhaka" }, payment: { method: "Cash on Delivery", ref: "Pay on delivery" }
        };
    }
    function find(id) {
        id = id.trim().toUpperCase();
        if (id === "SPX-DEMO") return demoOrder();
        return get("sportix_orders", []).find(o => o.id === id) || null;
    }

    function show(id) {
        const out = $("#result");
        if (!id.trim()) { out.innerHTML = '<div class="card">Enter a tracking ID to see your order status.</div>'; return; }
        const o = find(id);
        if (!o) {
            out.innerHTML = '<div class="card"><h2>No order found</h2><p>We could not find an order with ID <strong>' + esc(id.trim().toUpperCase()) +
                '</strong>. Check the ID in your confirmation (it looks like SPX-AB12CD). Orders can only be tracked in the browser where they were placed.</p></div>';
            return;
        }
        const mins = (Date.now() - o.placedAt) / 60000;
        let cur = 0; STAGES.forEach((s, i) => { if (mins >= s.at) cur = i; });
        out.innerHTML = '<div class="card"><p class="status-pill">' + STAGES[cur].name + "</p><h2 style=\"margin-top:12px\">Order " + esc(o.id) + "</h2>" +
            '<ul class="timeline">' + STAGES.map((s, i) =>
                '<li class="' + (i <= cur ? "done" : "") + (i === cur ? " current" : "") + '"><strong>' + s.name + "</strong><small>" +
                (i <= cur ? fmt(o.placedAt + s.at * 60000) + " · " + s.note : s.note) + "</small></li>").join("") + "</ul>" +
            '<hr style="border:none;border-top:1px solid #e3ebe7;margin:14px 0">' +
            o.items.map(i => '<div class="sum-row"><span>' + esc(i.name) + " × " + i.qty + "</span><span>" + money(i.price * i.qty) + "</span></div>").join("") +
            '<div class="sum-row"><span>Delivery</span><span>' + money(o.delivery) + '</span></div><div class="sum-row total"><span>Total</span><span>' + money(o.total) + "</span></div>" +
            '<p style="color:#52796f;font-size:14px">Delivering to ' + esc(o.shipping.name) + ", " + esc(o.shipping.city) + " · Payment: " + esc(o.payment.method) + "</p></div>";
    }

    function renderMine() {
        const u = currentUser(), box = $("#my-orders");
        const mine = u ? get("sportix_orders", []).filter(o => o.email === u.email).reverse() : [];
        if (!mine.length) { box.classList.add("hidden"); return; }
        box.classList.remove("hidden");
        box.innerHTML = "<h2>Your recent orders</h2><div class=\"order-chips\">" + mine.map(o => '<button data-id="' + esc(o.id) + '">' + esc(o.id) + "</button>").join("") + "</div>";
    }
    $("#my-orders").addEventListener("click", e => {
        const b = e.target.closest("button[data-id]"); if (!b) return;
        $("#track-input").value = b.dataset.id; show(b.dataset.id);
    });
    $("#track-form").addEventListener("submit", e => { e.preventDefault(); show($("#track-input").value); });
    document.addEventListener("sportix:auth", renderMine);

    renderMine();
    const q = new URLSearchParams(location.search).get("id");
    if (q) { $("#track-input").value = q; show(q); }
});