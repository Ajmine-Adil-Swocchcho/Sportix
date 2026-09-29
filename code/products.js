document.addEventListener("DOMContentLoaded", () => {
    const categoryButtons = document.querySelectorAll(".category-button");
    const productCards = document.querySelectorAll(".product-card");
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");
    const showMoreBtn = document.getElementById("show-more-btn");
    const noProducts = document.getElementById("no-products");

    let currentCategory = "All";
    let showAllActive = false; // "Show More" ক্লিক করা হয়েছে কি না ট্র্যাক করার জন্য
    const ITEMS_TO_SHOW_INITIALLY = 8; // প্রথমে কয়টা প্রোডাক্ট দেখাবে

    // ==================================================
    // DISPLAY UPDATE LOGIC
    // ==================================================
    function updateDisplay() {
        let visibleCount = 0;
        let matchCount = 0;
        const searchText = searchInput.value.toLowerCase().trim();

        productCards.forEach(card => {
            const category = card.getAttribute("data-category");
            const name = card.getAttribute("data-name").toLowerCase();

            // চেক করবে ক্যাটাগরি এবং সার্চ টেক্সট ম্যাচ করছে কি না
            const matchesCategory = currentCategory === "All" || category === currentCategory;
            const matchesSearch = name.includes(searchText);

            if (matchesCategory && matchesSearch) {
                matchCount++;
                
                // "All" ক্যাটাগরিতে থাকলে এবং সার্চ না করলে Pagination লজিক
                if (currentCategory === "All" && searchText === "" && !showAllActive) {
                    if (visibleCount < ITEMS_TO_SHOW_INITIALLY) {
                        card.style.display = "block";
                        visibleCount++;
                    } else {
                        card.style.display = "none";
                    }
                } else {
                    // নির্দিষ্ট ক্যাটাগরি বা সার্চ করা হলে সব ম্যাচিং রেজাল্ট দেখাবে
                    card.style.display = "block";
                }
            } else {
                card.style.display = "none";
            }
        });

        // Show More বাটন দেখানোর লজিক
        if (currentCategory === "All" && searchText === "" && !showAllActive && matchCount > ITEMS_TO_SHOW_INITIALLY) {
            showMoreBtn.style.display = "block";
        } else {
            showMoreBtn.style.display = "none";
        }

        // কোনো প্রোডাক্ট না পাওয়া গেলে
        if (matchCount === 0) {
            noProducts.style.display = "block";
        } else {
            noProducts.style.display = "none";
        }
    }

    // ==================================================
    // EVENT LISTENERS
    // ==================================================
    
    // Category Buttons
    categoryButtons.forEach(button => {
        button.addEventListener("click", () => {
            categoryButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            
            currentCategory = button.dataset.category;
            showAllActive = false; // নতুন ক্যাটাগরিতে গেলে Show More রিসেট হবে
            searchInput.value = ""; // সার্চ ক্লিয়ার হবে
            
            updateDisplay();
        });
    });

    // Show More Button
    showMoreBtn.addEventListener("click", () => {
        showAllActive = true;
        updateDisplay();
    });

    // Search Actions (Real-time update)
    searchButton.addEventListener("click", updateDisplay);
    searchInput.addEventListener("input", updateDisplay);

    // Initial Load
    updateDisplay();
});