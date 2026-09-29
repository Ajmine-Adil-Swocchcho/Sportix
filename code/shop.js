/* ==========================================================
   SPORTIX - shared script: navbar, auth, cart, modals, FAQ
   Loaded on every page. Data lives in localStorage:
   sportix_users, sportix_session, sportix_cart, sportix_orders
   (Demo only: real sites must check passwords on a server.)
   ========================================================== */
(function () {
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } };
    const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const money = n => "৳" + Number(n).toLocaleString("en-US");

    // ---------- TOAST + MODAL ----------
    let toastTimer;
    function toast(msg) {
        let t = $(".toast");
        if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
        t.textContent = msg; t.style.display = "block";
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { t.style.display = "none"; }, 2200);
    }
    function openModal(html, wide) {
        closeModal();
        const back = document.createElement("div");
        back.className = "modal-back";
        back.innerHTML = '<div class="modal' + (wide ? " wide" : "") + '" role="dialog" aria-modal="true"><button class="modal-close" aria-label="Close">×</button>' + html + "</div>";
        back.addEventListener("click", e => { if (e.target === back || e.target.classList.contains("modal-close")) closeModal(); });
        document.body.appendChild(back);
        return back;
    }
    function closeModal() { const m = $(".modal-back"); if (m) m.remove(); }
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

    // ---------- AUTH ----------
    async function hash(p) {
        if (window.crypto && crypto.subtle) {
            const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("sportix:" + p));
            return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
        }
        let h = 5381; for (const c of "sportix:" + p) h = (h * 33) ^ c.charCodeAt(0);
        return "x" + (h >>> 0);
    }
    const users = () => get("sportix_users", []);
    function currentUser() {
        const email = get("sportix_session", null);
        return email ? users().find(u => u.email === email) || null : null;
    }
    function setError(input, msg) {
        const f = input.closest(".field");
        f.classList.toggle("invalid", !!msg);
        $(".err", f).textContent = msg || "";
        return !msg;
    }
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function openAuth(tab, note) {
        const m = openModal(
            '<h2>Welcome to SPORTIX</h2><p class="sub">' + esc(note || "Log in or create an account to continue.") + "</p>" +
            '<div class="auth-tabs"><button data-tab="login">Login</button><button data-tab="register">Register</button></div>' +
            '<form id="login-form" novalidate>' +
            '<div class="field"><label for="l-email">Email</label><input id="l-email" type="email" autocomplete="email"><p class="err"></p></div>' +
            '<div class="field"><label for="l-pass">Password</label><input id="l-pass" type="password" autocomplete="current-password"><p class="err"></p></div>' +
            '<p class="form-msg" id="l-msg"></p><button class="btn full" type="submit">Login</button></form>' +
            '<form id="reg-form" novalidate class="hidden">' +
            '<div class="field"><label for="r-name">Full name</label><input id="r-name" type="text" autocomplete="name"><p class="err"></p></div>' +
            '<div class="field"><label for="r-email">Email</label><input id="r-email" type="email" autocomplete="email"><p class="err"></p></div>' +
            '<div class="field"><label for="r-pass">Password</label><input id="r-pass" type="password" autocomplete="new-password"><p class="err"></p></div>' +
            '<div class="field"><label for="r-pass2">Confirm password</label><input id="r-pass2" type="password" autocomplete="new-password"><p class="err"></p></div>' +
            '<p class="form-msg" id="r-msg"></p><button class="btn full" type="submit">Create account</button></form>');

        const login = $("#login-form", m), reg = $("#reg-form", m);
        function show(t) {
            login.classList.toggle("hidden", t !== "login");
            reg.classList.toggle("hidden", t !== "register");
            $$(".auth-tabs button", m).forEach(b => b.classList.toggle("active", b.dataset.tab === t));
        }
        $$(".auth-tabs button", m).forEach(b => b.addEventListener("click", () => show(b.dataset.tab)));
        show(tab || "login");

        login.addEventListener("submit", async e => {
            e.preventDefault();
            const em = $("#l-email", m), pw = $("#l-pass", m);
            const ok1 = setError(em, EMAIL.test(em.value.trim()) ? "" : "Enter a valid email address.");
            const ok2 = setError(pw, pw.value ? "" : "Enter your password.");
            if (!ok1 || !ok2) return;
            const u = users().find(x => x.email === em.value.trim().toLowerCase());
            if (!u || u.pass !== await hash(pw.value)) { $("#l-msg", m).textContent = "Email or password is incorrect."; return; }
            set("sportix_session", u.email); closeModal(); afterAuth("Welcome back, " + u.name.split(" ")[0] + "!");
        });

        reg.addEventListener("submit", async e => {
            e.preventDefault();
            const n = $("#r-name", m), em = $("#r-email", m), p1 = $("#r-pass", m), p2 = $("#r-pass2", m);
            const email = em.value.trim().toLowerCase();
            const checks = [
                setError(n, n.value.trim().length >= 2 ? "" : "Enter your full name (at least 2 characters)."),
                setError(em, !EMAIL.test(email) ? "Enter a valid email address." : users().some(u => u.email === email) ? "This email is already registered. Try logging in." : ""),
                setError(p1, p1.value.length >= 6 && /[a-zA-Z]/.test(p1.value) && /\d/.test(p1.value) ? "" : "Use 6+ characters with at least one letter and one number."),
                setError(p2, p2.value === p1.value && p2.value ? "" : "Passwords do not match.")
            ];
            if (checks.includes(false)) return;
            const list = users(); list.push({ name: n.value.trim(), email, pass: await hash(p1.value) });
            set("sportix_users", list); set("sportix_session", email);
            closeModal(); afterAuth("Account created. Welcome, " + n.value.trim().split(" ")[0] + "!");
        });
    }
    function afterAuth(msg) {
        renderAccount(); toast(msg);
        document.dispatchEvent(new CustomEvent("sportix:auth"));
    }
    function logout() {
        localStorage.removeItem("sportix_session"); renderAccount(); toast("You are logged out.");
        document.dispatchEvent(new CustomEvent("sportix:auth"));
    }
    // Returns true if logged in, otherwise opens the login popup.
    function requireLogin(note) { if (currentUser()) return true; openAuth("login", note); return false; }

    // ---------- CART ----------
    const getCart = () => get("sportix_cart", []);
    function saveCart(c) { set("sportix_cart", c); updateBadge(); }
    function updateBadge() {
        const n = getCart().reduce((s, i) => s + i.qty, 0);
        $$(".cart-badge").forEach(b => { b.textContent = n; });
    }
    function addToCart(item) {
        const cart = getCart(), found = cart.find(i => i.id === item.id);
        if (found) {
            if (found.qty >= item.stock) { toast("Only " + item.stock + " available for " + item.name); return; }
            found.qty++;
        } else cart.push(Object.assign({ qty: 1 }, item));
        saveCart(cart); toast(item.name + " added to cart");
    }
    function cardData(card) {
        const price = parseInt(card.querySelector(".product-price").textContent.replace(/[^\d]/g, ""), 10);
        const stock = parseInt(card.querySelector(".product-stock").textContent, 10) || 0;
        return {
            id: card.dataset.name, name: card.dataset.name, category: card.dataset.category, price, stock,
            img: card.querySelector(".product-image").getAttribute("src"),
            rating: card.querySelector(".product-rating").textContent.trim()
        };
    }

    // Product page buttons (event delegation: products.js is not touched)
    document.addEventListener("click", e => {
        const card = e.target.closest(".product-card");
        if (!card) return;
        if (e.target.closest(".cart-button")) addToCart(cardData(card));
        else if (e.target.closest(".view-button")) {
            const d = cardData(card);
            const m = openModal('<div class="qv"><img src="' + esc(d.img) + '" alt="' + esc(d.name) + '"><div class="qv-info"><p>' + esc(d.category) +
                "</p><h2>" + esc(d.name) + "</h2><p>" + esc(d.rating) + '</p><p class="qv-price">' + money(d.price) + "</p><p>" + d.stock +
                ' available</p><button class="btn full" id="qv-add">Add to Cart</button></div></div>', true);
            $("#qv-add", m).addEventListener("click", () => { addToCart(d); closeModal(); });
        }
    });

    // ---------- NAVBAR + FOOTER ----------
    function renderAccount() {
        const box = $(".nav-account"); if (!box) return;
        const u = currentUser();
        if (!u) {
            box.innerHTML = '<button class="nav-login">Login / Register</button>';
            $(".nav-login", box).addEventListener("click", () => openAuth("login"));
            return;
        }
        box.innerHTML = '<button class="nav-user" aria-haspopup="true">Hi, ' + esc(u.name.split(" ")[0]) + ' ▾</button>' +
            '<div class="nav-menu"><p>' + esc(u.email) + '</p><a href="track.html">My orders</a><a href="cart.html">My cart</a><button class="nav-logout">Log out</button></div>';
        $(".nav-user", box).addEventListener("click", e => { e.stopPropagation(); $(".nav-menu", box).classList.toggle("open"); });
        $(".nav-logout", box).addEventListener("click", logout);
    }
    document.addEventListener("click", () => { const m = $(".nav-menu"); if (m) m.classList.remove("open"); });

    function buildNav() {
        const overlay = document.body.dataset.nav === "overlay";
        const page = location.pathname.split("/").pop() || "home.html";
        const links = [["home.html", "Home"], ["products.html", "Shop"], ["track.html", "Track Order"], ["help.html", "Help Center"]];
        const html = '<header class="site-nav' + (overlay ? " overlay" : "") + '"><a class="nav-brand" href="home.html">SPORTIX</a>' +
            '<button class="nav-toggle" aria-label="Open menu" aria-expanded="false">☰</button><nav class="nav-links">' +
            links.map(l => '<a href="' + l[0] + '"' + (page === l[0] ? ' class="active"' : "") + ">" + l[1] + "</a>").join("") +
            '<a href="cart.html"' + (page === "cart.html" ? ' class="active"' : "") + '>Cart <span class="cart-badge">0</span></a>' +
            '<div class="nav-account"></div></nav></header>';
        document.body.insertAdjacentHTML("afterbegin", html);
        const toggle = $(".nav-toggle"), nav = $(".nav-links");
        toggle.addEventListener("click", e => {
            e.stopPropagation();
            toggle.setAttribute("aria-expanded", nav.classList.toggle("open"));
        });
        if (!overlay) {
            document.body.insertAdjacentHTML("beforeend",
                '<footer class="site-footer"><nav><a href="home.html">Home</a><a href="products.html">Shop</a><a href="help.html">Help Center</a>' +
                '<a href="return-policy.html">Return Policy</a><a href="terms.html">Terms &amp; Conditions</a></nav><p>© 2026 SPORTIX Sports Equipment Store</p></footer>');
        }
        renderAccount(); updateBadge();
    }

    // ---------- FAQ ACCORDION ----------
    document.addEventListener("click", e => {
        const q = e.target.closest(".acc-q"); if (!q) return;
        const item = q.parentElement, open = item.classList.toggle("open");
        q.setAttribute("aria-expanded", open);
    });

    // Shared with cart.js / track.js
    window.Sportix = { $, $$, get, set, esc, money, toast, openModal, closeModal, openAuth, requireLogin, currentUser, getCart, saveCart, setError };
    document.addEventListener("DOMContentLoaded", buildNav);
    window.addEventListener("storage", updateBadge);
})();