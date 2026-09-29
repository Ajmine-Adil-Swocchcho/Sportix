document.addEventListener("DOMContentLoaded", function() {
    const shopNowButton = document.getElementById("shop-now");
    
    if (shopNowButton) {
        shopNowButton.addEventListener("click", function () {
            // Products পেজে নিয়ে যাবে
            window.location.href = "products.html";
        });
    }
});