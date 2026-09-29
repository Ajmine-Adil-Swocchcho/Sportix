/* SPORTIX - cart page: items, quantity, totals, checkout, payment */
document.addEventListener("DOMContentLoaded", () => {
    const { $, $$, esc, money, get, set, toast, getCart, saveCart, requireLogin, currentUser, setError } = window.Sportix;
    const DELIVERY_FEE = 100;

    // ---------- CART LIST ----------
    function render() {
        const cart = getCart();
        const box = $("#cart-items");
        if (!cart.length) {
            box.innerHTML = '<div class="empty"><p>Your cart is empty.</p><a class="btn" href="products.html">Browse products</a></div>';
            $("#checkout-btn").disabled = true;
            $("#checkout").classList.add("hidden");
        } else {
            $("#checkout-btn").disabled = false;
            box.innerHTML = cart.map((i, idx) =>
                '<div class="cart-item"><img src="' + esc(i.img) + '" alt="' + esc(i.name) + '"><div>' +
                "<h3>" + esc(i.name) + '</h3><p class="meta">' + esc(i.category) + " · " + money(i.price) + " each</p>" +
                '<div class="qty"><button data-act="dec" data-i="' + idx + '" aria-label="Decrease quantity">−</button><span>' + i.qty +
                '</span><button data-act="inc" data-i="' + idx + '" aria-label="Increase quantity">+</button></div></div>' +
                '<div class="line"><strong>' + money(i.price * i.qty) + '</strong><button class="link-btn" data-act="del" data-i="' + idx + '">Remove</button></div></div>'
            ).join("");
        }
        const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const del = cart.length ? DELIVERY_FEE : 0;
        $("#sum-sub").textContent = money(sub);
        $("#sum-del").textContent = money(del);
        $("#sum-total").textContent = money(sub + del);
    }

    $("#cart-items").addEventListener("click", e => {
        const b = e.target.closest("[data-act]"); if (!b) return;
        const cart = getCart(), item = cart[b.dataset.i];
        if (b.dataset.act === "inc") {
            if (item.qty >= item.stock) return toast("Only " + item.stock + " available for " + item.name);
            item.qty++;
        } else if (b.dataset.act === "dec") { item.qty--; if (item.qty < 1) cart.splice(b.dataset.i, 1); }
        else cart.splice(b.dataset.i, 1);
        saveCart(cart); render();
    });

    // ---------- CHECKOUT ----------
    let wantsCheckout = false;
    function openCheckout() {
        if (!getCart().length) return;
        wantsCheckout = true;
        if (!requireLogin("Please log in to place your order. Your cart is saved.")) return;
        wantsCheckout = false;
        const u = currentUser();
        if (!$("#c-name").value) $("#c-name").value = u.name;
        $("#checkout").classList.remove("hidden");
        $("#checkout").scrollIntoView({ behavior: "smooth" });
    }
    $("#checkout-btn").addEventListener("click", openCheckout);
    // After logging in from the popup, continue to checkout automatically
    document.addEventListener("sportix:auth", () => { if (wantsCheckout && currentUser()) openCheckout(); });

    const method = () => $('input[name="pay"]:checked').value;
    function showPanel() {
        const m = method(), mobile = m === "bKash" || m === "Nagad";
        $("#pay-mobile").classList.toggle("hidden", !mobile);
        $("#pay-card").classList.toggle("hidden", m !== "Card");
        $("#pay-cod").classList.toggle("hidden", m !== "Cash on Delivery");
        $("#mobile-name").textContent = m;
        $("#mobile-note").textContent = "Send the total amount to our " + m + " merchant number 01700-000000, then enter your number and the transaction ID below.";
    }
    $$('input[name="pay"]').forEach(r => r.addEventListener("change", showPanel));
    showPanel();

    function luhn(num) {
        let sum = 0, alt = false;
        for (let i = num.length - 1; i >= 0; i--) {
            let d = +num[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } sum += d; alt = !alt;
        }
        return sum % 10 === 0;
    }
    const phoneOk = v => /^(\+?88)?01[3-9]\d{8}$/.test(v.replace(/[\s-]/g, ""));

    $("#checkout-form").addEventListener("submit", e => {
        e.preventDefault();
        if (!requireLogin("Please log in to place your order.")) return;
        const f = id => $("#" + id);
        const results = [
            setError(f("c-name"), f("c-name").value.trim().length >= 2 ? "" : "Enter your full name."),
            setError(f("c-phone"), phoneOk(f("c-phone").value) ? "" : "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)."),
            setError(f("c-address"), f("c-address").value.trim().length >= 8 ? "" : "Enter your full delivery address."),
            setError(f("c-city"), f("c-city").value.trim().length >= 2 ? "" : "Enter your city or district."),
            setError(f("c-post"), /^\d{4}$/.test(f("c-post").value.trim()) ? "" : "Enter a 4-digit postal code.")
        ];
        const m = method();
        let payRef = "";
        if (m === "bKash" || m === "Nagad") {
            results.push(setError(f("p-number"), phoneOk(f("p-number").value) ? "" : "Enter the " + m + " number you paid from."));
            results.push(setError(f("p-trx"), /^[A-Za-z0-9]{8,12}$/.test(f("p-trx").value.trim()) ? "" : "Transaction ID should be 8 to 12 letters or digits."));
            payRef = "Trx " + f("p-trx").value.trim().toUpperCase();
        } else if (m === "Card") {
            const num = f("k-number").value.replace(/\s/g, "");
            const mm = f("k-exp").value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
            const notExpired = mm && new Date(2000 + +mm[2], +mm[1], 1) > new Date();
            results.push(setError(f("k-number"), /^\d{13,19}$/.test(num) && luhn(num) ? "" : "Enter a valid card number."));
            results.push(setError(f("k-exp"), notExpired ? "" : "Enter a future expiry date as MM/YY."));
            results.push(setError(f("k-cvv"), /^\d{3,4}$/.test(f("k-cvv").value) ? "" : "CVV is 3 or 4 digits."));
            payRef = "Card ending " + num.slice(-4); // full number is never stored
        } else payRef = "Pay on delivery";
        if (results.includes(false)) { $("#checkout-msg").textContent = "Please fix the highlighted fields."; return; }
        $("#checkout-msg").textContent = "";

        const cart = getCart();
        const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let id = "SPX-"; for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
        const order = {
            id, email: currentUser().email, placedAt: Date.now(),
            items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
            subtotal, delivery: DELIVERY_FEE, total: subtotal + DELIVERY_FEE,
            shipping: { name: f("c-name").value.trim(), phone: f("c-phone").value.trim(), address: f("c-address").value.trim(), city: f("c-city").value.trim(), postal: f("c-post").value.trim() },
            payment: { method: m, ref: payRef }
        };
        const orders = get("sportix_orders", []); orders.push(order); set("sportix_orders", orders);
        saveCart([]);
        $("#page-head").classList.add("hidden");
        $("#cart-view").classList.add("hidden");
        $("#checkout").classList.add("hidden");
        $("#success").classList.remove("hidden");
        $("#success-id").textContent = id;
        $("#success-track").href = "track.html?id=" + id;
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    render();
});