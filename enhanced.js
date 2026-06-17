/* Quality upgrade layer for the static prototype.
   Keeps the original single-page deployment while making state and routes data-driven. */
(function () {
  "use strict";

  const routeState = { name: "home", id: null, chapter: 1 };
  let bundleFilter = "all";
  let lastOrder = readJSON("dklLastOrder", null);
  let purchases = readJSON("dklPurchases", []);

  function readJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function slugWords(value) {
    return String(value).toLowerCase().match(/[a-z0-9]+/g) || [];
  }

  function matchesWords(haystack, query) {
    const queryWords = slugWords(query);
    if (!queryWords.length) return true;
    const sourceWords = slugWords(haystack);
    return queryWords.every(function (word) {
      return sourceWords.some(function (source) {
        return source.startsWith(word);
      });
    });
  }

  function currentBook() {
    return books.find(function (item) { return item.id === Number(routeState.id); }) || books[0];
  }

  function currentBundle() {
    return bundles.find(function (item) { return item.id === Number(routeState.id); }) || bundles[0];
  }

  function currentTrack() {
    return tracks.find(function (item) { return item.id === Number(routeState.id); }) || tracks[0];
  }

  books.forEach(function (item, index) {
    item.chapters = item.id === 1 ? 12 : item.chapters;
    item.formats = index % 4 === 0 ? ["PDF", "Video", "Membership"] :
      index % 4 === 1 ? ["PDF", "Video"] :
      index % 4 === 2 ? ["PDF", "Membership"] : ["PDF", "Video", "Membership"];
    item.access = index % 5 === 0 ? "Free Preview" : index % 3 === 0 ? "Membership" : "Paid";
    item.description = "A practical professional guide to " + item.category.toLowerCase() +
      ", organized into focused chapter lessons, downloadable references, and guided instruction.";
  });

  bundles.forEach(function (item, index) {
    item.id = index + 1;
    item.difficulty = index === 0 ? "Intermediate" : index === 1 ? "Investor" :
      index > 3 ? "Professional" : "Intermediate";
    item.topic = [ "Audit", "Real Estate", "Corporate", "Estate", "Business", "Professional" ][index];
  });

  tracks.forEach(function (item, index) {
    item.id = index + 1;
    item.price = 99 + index * 10;
  });

  window.go = function (route) {
    location.hash = route;
    const nav = document.getElementById("navlinks");
    const menu = document.getElementById("menuButton");
    if (nav) nav.classList.remove("open");
    if (menu) menu.setAttribute("aria-expanded", "false");
  };

  window.toggleMenu = function () {
    const nav = document.getElementById("navlinks");
    const menu = document.getElementById("menuButton");
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  };

  window.addCart = function (name, price, type, productKey) {
    const key = productKey || (type + ":" + name);
    const existing = cart.find(function (item) { return item.key === key; });
    if (existing) {
      toast("This item is already in your cart");
      return;
    }
    cart.push({ id: Date.now(), key: key, name: name, price: Number(price), type: type || "Course" });
    discount = 0;
    syncCart();
    toast("Added to cart");
  };

  window.bookCard = function (item) {
    const formats = item.formats.join(" ");
    return `<article class="card book-card" data-search="${escapeText((item.title + " " + item.category + " " + item.difficulty).toLowerCase())}" data-formats="${escapeText(formats)}">
      ${cover(item)}
      <div class="book-info">
        <span class="eyebrow">${escapeText(item.category)}</span>
        <h3>${escapeText(item.title)}</h3>
        <div class="meta"><span>${item.chapters} chapters</span><span>${item.difficulty}</span></div>
        <div class="badges">${item.formats.map(function (format) { return badge(format, format === "Video" ? "blue" : format === "Membership" ? "gold" : ""); }).join("")}</div>
        <div class="price">${money(item.price)}</div>
        <div class="card-actions">
          <button class="btn btn-primary btn-sm" onclick="go('book/${item.id}')">View Book</button>
          <button class="btn btn-light btn-sm" onclick="addCart('${escapeText(item.title)} PDF',${item.price},'PDF','book-${item.id}-pdf')">Buy PDF</button>
        </div>
      </div>
    </article>`;
  };

  window.bundleCard = function (item) {
    return `<article class="card bundle-card" data-search="${escapeText((item.title + " " + item.desc + " " + item.topic + " " + item.difficulty).toLowerCase())}" data-filter="${escapeText(item.difficulty.toLowerCase())}">
      <img class="bundle-img" src="${item.img}" alt="${escapeText(item.title)} learning bundle" loading="lazy">
      <div class="pad">
        <div class="badges">${badge("Save 24%", "gold")}${badge(item.difficulty)}${badge("Membership")}</div>
        <h3>${escapeText(item.title)}</h3><p>${escapeText(item.desc)}</p>
        <div class="meta" style="margin-top:14px"><span>${item.books} books</span><span>${item.chapters} chapters</span><span>PDF + Video</span></div>
        <div class="card-actions"><span class="price">${money(item.price)}</span><button class="btn btn-primary btn-sm" onclick="go('bundle-detail/${item.id}')">View Bundle</button></div>
      </div>
    </article>`;
  };

  window.trackCard = function (item) {
    return `<article class="card track-card">
      <img class="track-img" src="${item.img}" alt="${escapeText(item.title)} curriculum" loading="lazy">
      <div class="pad">
        <div class="badges">${badge(item.level)}${badge("Progress Tracking", "green")}</div>
        <h3>${escapeText(item.title)}</h3>
        <p>A guided sequence of books, chapter lessons, PDFs, and expert video instruction.</p>
        <div class="meta" style="margin-top:13px"><span>${item.books} books</span><span>${item.chapters} chapters</span><span>PDF + Video</span></div>
        <div class="card-actions"><span class="price">${money(item.price)}</span><button class="btn btn-primary btn-sm" onclick="go('track-detail/${item.id}')">View Track</button></div>
      </div>
    </article>`;
  };

  window.library = function () {
    return `${pageHero("The complete catalogue", "Explore the Taxation Knowledge Library", "Search all 25 professional titles, then filter by format or difficulty. Purchase complete books or learn one chapter at a time.")}
      <section class="section-sm"><div class="container">
        <div class="filterbar" role="search">
          <div class="search"><label class="sr-only" for="librarySearch">Search the library</label><input id="librarySearch" placeholder="Search books, categories, or skills…" oninput="filterBooks()"></div>
          <button class="filter active" data-filter="all" onclick="setFilter(this,'all')" aria-pressed="true">All</button>
          <button class="filter" data-filter="Beginner" onclick="setFilter(this,'Beginner')" aria-pressed="false">Beginner</button>
          <button class="filter" data-filter="Intermediate" onclick="setFilter(this,'Intermediate')" aria-pressed="false">Intermediate</button>
          <button class="filter" data-filter="Professional" onclick="setFilter(this,'Professional')" aria-pressed="false">Professional</button>
          <label class="sr-only" for="formatFilter">Filter by format</label>
          <select id="formatFilter" onchange="filterBooks()"><option>All Formats</option><option>PDF</option><option>Video</option><option>Membership</option></select>
          <div class="results-count" id="bookResults" aria-live="polite">${books.length} books shown</div>
        </div>
        <div class="books-grid" id="bookGrid">${books.map(bookCard).join("")}</div>
        <div class="empty hidden" id="noBooks">No books match these filters.</div>
      </div></section>`;
  };

  window.setFilter = function (element, filter) {
    activeFilter = filter;
    document.querySelectorAll("#app .filter").forEach(function (button) {
      const selected = button === element;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    filterBooks();
  };

  window.filterBooks = function () {
    const input = document.getElementById("librarySearch");
    const formatSelect = document.getElementById("formatFilter");
    const query = input ? input.value : "";
    const format = formatSelect ? formatSelect.value : "All Formats";
    let shown = 0;
    document.querySelectorAll("#bookGrid .book-card").forEach(function (card) {
      const searchMatch = matchesWords(card.dataset.search, query);
      const difficultyMatch = activeFilter === "all" || card.dataset.search.includes(activeFilter.toLowerCase());
      const formatMatch = format === "All Formats" || card.dataset.formats.split(" ").includes(format);
      const visible = searchMatch && difficultyMatch && formatMatch;
      card.classList.toggle("hidden", !visible);
      if (visible) shown += 1;
    });
    const result = document.getElementById("bookResults");
    if (result) result.textContent = shown + (shown === 1 ? " book shown" : " books shown");
    const empty = document.getElementById("noBooks");
    if (empty) empty.classList.toggle("hidden", shown > 0);
  };

  window.book = function () {
    const item = currentBook();
    const related = books.filter(function (bookItem) { return bookItem.id !== item.id; }).slice(0, 3);
    return `${pageHero("Library / " + escapeText(item.category), escapeText(item.title), escapeText(item.description))}
      <section class="section-sm"><div class="container detail-hero">${cover(item, true)}
        <div class="detail-copy">
          <div class="badges">${badge(item.category, "gold")}${item.formats.map(function (format) { return badge(format, format === "Video" ? "blue" : format === "Membership" ? "green" : ""); }).join("")}</div>
          <h2 class="title">${escapeText(item.title)}</h2>
          <p class="lead">${escapeText(item.description)}</p>
          <div class="detail-meta"><span>Professional tax library</span><span>${item.chapters} chapters</span><span>4.${7 + item.id % 3} learner rating</span><span>Updated 2026</span></div>
          <div class="price-row"><span class="price">${money(item.price)}</span><span class="meta">Full book PDF</span></div>
          <div class="button-row">
            <button class="btn btn-primary" onclick="addCart('${escapeText(item.title)} PDF',${item.price},'PDF','book-${item.id}-pdf')">Buy Full PDF</button>
            <button class="btn btn-gold" onclick="addCart('${escapeText(item.title)} Course',99,'Course','book-${item.id}-course')">Buy Course Package</button>
            <a class="btn btn-light" href="https://www.amazon.com/s?k=${encodeURIComponent(item.title)}" target="_blank" rel="noopener noreferrer">View on Amazon ↗</a>
          </div>
        </div>
      </div></section>
      <section class="section-sm soft"><div class="container"><div class="overview">${[[item.chapters,"Chapters"],[item.chapters,"PDFs"],[item.chapters,"Video Lessons"],[(3 + item.id % 4) + ".5h","Content"],["Included","Progress Tracking"],["Eligible","Membership Access"]].map(function (stat) { return `<div class="stat"><strong>${stat[0]}</strong><span>${stat[1]}</span></div>`; }).join("")}</div></div></section>
      <section class="section"><div class="container"><div class="eyebrow">Course curriculum</div><h2 class="section-title">Learn chapter by chapter</h2><div class="chapter-list" style="margin-top:25px">${Array.from({length:item.chapters}, function (_, index) { return chapterRow(chapters[index % chapters.length], index, item); }).join("")}</div></div></section>
      <section class="section soft"><div class="container"><h2 class="section-title">Related books</h2><div class="books-grid" style="margin-top:20px">${related.map(bookCard).join("")}</div></div></section>`;
  };

  window.chapterRow = function (chapterName, index, bookItem) {
    const item = bookItem || currentBook();
    const free = index === 0;
    return `<article class="chapter">
      <div class="chapter-num">${index + 1}</div>
      <div><h3>Chapter ${index + 1}: ${escapeText(chapterName)}</h3><p>${free ? "Identify the core issue, deadlines, and first steps in a professional response." : "A focused lesson with practical frameworks, examples, and action steps."}</p>
      <div class="badges">${badge("PDF")}${badge("Video","blue")}${badge(free ? "Free Preview" : index % 3 === 0 ? "Membership" : "Paid", free ? "green" : index % 3 === 0 ? "gold" : "")}</div></div>
      <div class="chapter-side"><div class="meta"><span>${18 + index} min</span><span>PDF $9</span><span>Combo $19</span></div>
      <div class="card-actions" style="justify-content:flex-end"><button class="btn btn-light btn-sm" onclick="go('chapter/${item.id}/${index + 1}')">View Lesson</button><button class="btn btn-primary btn-sm" onclick="addCart('${escapeText(item.title)} — Chapter ${index + 1}',19,'PDF + Video','chapter-${item.id}-${index + 1}')">Buy Chapter</button></div></div>
    </article>`;
  };

  function ownsChapter(bookId, chapterNumber) {
    return purchases.some(function (item) {
      return item.key === "chapter-" + bookId + "-" + chapterNumber ||
        item.key === "book-" + bookId + "-course" ||
        item.type === "Membership";
    });
  }

  window.chapter = function () {
    const item = currentBook();
    const number = Math.min(Math.max(Number(routeState.chapter) || 1, 1), item.chapters);
    const chapterName = chapters[(number - 1) % chapters.length];
    const unlocked = number === 1 || ownsChapter(item.id, number);
    return `${pageHero("Library / " + escapeText(item.title) + " / Chapter " + number, "Chapter " + number + ": " + escapeText(chapterName), "A focused lesson designed to turn complex taxation knowledge into a practical response framework.")}
      <section class="section-sm"><div class="container">
        <div class="lesson-grid"><div class="grid grid-2">
          <div class="card preview ${unlocked ? "purchased-state" : ""}">${unlocked ? "" : `<div class="lock"><div class="center"><div class="lock-icon">▣</div><p style="color:white;margin-top:12px">PDF preview available</p></div></div>`}<h3>Chapter PDF</h3><p>${unlocked ? "Unlocked · Ready to download" : "18-page professional learning guide"}</p></div>
          <div class="card preview video ${unlocked ? "purchased-state" : ""}">${unlocked ? "" : `<div class="lock"><div class="center"><div class="lock-icon">▶</div><p style="color:white;margin-top:12px">Video lesson locked</p></div></div>`}<h3>Video Lesson</h3><p>${unlocked ? "Unlocked · Ready to stream" : "22 minutes · HD streaming"}</p></div>
        </div>
        <aside class="card summary-box"><div class="badges">${badge(unlocked ? "Unlocked" : number === 1 ? "Free Preview" : "Locked", unlocked ? "green" : "red")}${badge("PDF + Video")}</div>
          <h3>${unlocked ? "Your lesson is ready" : "Choose your access"}</h3>
          <p>${unlocked ? "This content is available through your purchase or membership." : "Purchase this lesson once or unlock it with an eligible membership."}</p>
          ${unlocked ? `<div class="grid" style="margin-top:20px"><button class="btn btn-primary" onclick="toast('Mock PDF download started')">Download PDF</button><button class="btn btn-gold" onclick="toast('Video player opened')">Watch Video</button></div>` :
          `<div class="plan-price">$19 <small>PDF + Video</small></div><div class="grid"><button class="btn btn-primary" onclick="addCart('${escapeText(item.title)} — Chapter ${number}',19,'PDF + Video','chapter-${item.id}-${number}')">Add to Cart</button><button class="btn btn-light" onclick="addCart('${escapeText(item.title)} — Chapter ${number} PDF',9,'PDF','chapter-${item.id}-${number}-pdf')">Buy PDF · $9</button><button class="btn btn-light" onclick="addCart('${escapeText(item.title)} — Chapter ${number} Video',14,'Video','chapter-${item.id}-${number}-video')">Buy Video · $14</button><button class="btn btn-gold" onclick="go('membership')">Access with Membership</button></div>`}
        </aside></div>
        <div class="grid grid-2" style="margin-top:22px"><div class="card pad"><h3>Learning outcomes</h3><ul class="checklist"><li>Understand the central taxation issue</li><li>Identify deadlines and required actions</li><li>Organize supporting documents</li><li>Prepare a professional response plan</li><li>Know when professional help is needed</li></ul></div>
        <div class="card pad"><h3>Continue through ${escapeText(item.title)}</h3><p>${item.chapters} connected lessons with PDF and video access.</p><div class="progress" style="margin:22px 0"><span style="width:${Math.round(number / item.chapters * 100)}%"></span></div><button class="btn btn-primary" onclick="go('book/${item.id}')">View Full Course →</button></div></div>
      </div></section>`;
  };

  window.bundlesPage = function () {
    return `${pageHero("Curated learning collections", "Taxation Bundles Built Around Real Learning Needs", "Save with focused collections that combine books and lessons around practical professional outcomes.")}
      <section class="section-sm"><div class="container">
        <div class="filterbar" role="search"><div class="search"><label class="sr-only" for="bundleSearch">Search bundles</label><input id="bundleSearch" placeholder="Search bundles by topic or use case…" oninput="filterBundles()"></div>
          ${["all","Intermediate","Professional","Investor"].map(function (filter, index) { return `<button class="filter ${index === 0 ? "active" : ""}" aria-pressed="${index === 0}" onclick="setBundleFilter(this,'${filter}')">${filter === "all" ? "All topics" : filter}</button>`; }).join("")}
          <div class="results-count" id="bundleResults" aria-live="polite">${bundles.length} bundles shown</div>
        </div>
        <div class="grid grid-3" id="bundleGrid">${bundles.map(bundleCard).join("")}</div><div class="empty hidden" id="noBundles">No bundles match these filters.</div>
      </div></section>`;
  };

  window.setBundleFilter = function (element, filter) {
    bundleFilter = filter.toLowerCase();
    document.querySelectorAll("#app .filter").forEach(function (button) {
      const selected = button === element;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    filterBundles();
  };

  window.filterBundles = function () {
    const query = document.getElementById("bundleSearch").value;
    let shown = 0;
    document.querySelectorAll("#bundleGrid .bundle-card").forEach(function (card) {
      const visible = matchesWords(card.dataset.search, query) && (bundleFilter === "all" || card.dataset.filter === bundleFilter);
      card.classList.toggle("hidden", !visible);
      if (visible) shown += 1;
    });
    document.getElementById("bundleResults").textContent = shown + (shown === 1 ? " bundle shown" : " bundles shown");
    document.getElementById("noBundles").classList.toggle("hidden", shown > 0);
  };

  window.bundleDetail = function () {
    const item = currentBundle();
    const included = books.slice((item.id - 1) * 2, (item.id - 1) * 2 + Math.min(item.books, 4));
    return `${pageHero("Bundles / " + escapeText(item.topic), escapeText(item.title), escapeText(item.desc))}
      <section class="section-sm"><div class="container detail-hero"><img src="${item.img}" style="height:350px;width:100%;object-fit:cover;border-radius:22px" alt="${escapeText(item.title)} overview">
        <div class="detail-copy"><div class="badges">${badge("Save 24%","gold")}${badge(item.difficulty)}${badge("Membership Eligible","green")}</div><h2 class="title">${escapeText(item.title)}</h2><p class="lead">${escapeText(item.desc)} Learn in sequence or move directly to the issue you need to solve.</p>
          <div class="price-row"><span class="price">${money(item.price)}</span><span class="meta">Complete digital bundle</span></div>
          <div class="button-row"><button class="btn btn-primary" onclick="addCart('${escapeText(item.title)}',${item.price},'Bundle','bundle-${item.id}')">Buy Bundle</button><button class="btn btn-light" onclick="addCart('${escapeText(item.title)}',${item.price},'Bundle','bundle-${item.id}')">Add to Cart</button><button class="btn btn-gold" onclick="go('membership')">Access with Membership</button></div>
        </div></div></section>
      <section class="section-sm soft"><div class="container"><div class="overview">${[[item.books,"Books"],[item.chapters,"Chapters"],[item.chapters,"PDFs"],[Math.max(12,item.chapters-8),"Video Lessons"],[Math.ceil(item.chapters/3)+"h","Content"],["24%","Bundle Saving"]].map(function (stat) { return `<div class="stat"><strong>${stat[0]}</strong><span>${stat[1]}</span></div>`; }).join("")}</div></div></section>
      <section class="section"><div class="container"><div class="eyebrow">Inside the bundle</div><h2 class="section-title">Connected books. One practical outcome.</h2><div class="books-grid" style="margin-top:28px">${included.map(bookCard).join("")}</div></div></section>`;
  };

  window.tracksPage = function () {
    return `${pageHero("Guided curricula","Structured Learning Tracks for Taxation Knowledge","Move through books and lessons in a purposeful order, track progress, and return to exactly where you left off.")}<section class="section-sm"><div class="container"><div class="grid grid-3">${tracks.map(trackCard).join("")}</div></div></section>`;
  };

  window.trackDetail = function () {
    const item = currentTrack();
    const modules = ["Tax Basics","Income Planning","Business Structure","Deductions and Credits","Tax Strategy Review"];
    return `${pageHero("Learning Tracks / " + escapeText(item.level), escapeText(item.title), "A guided path for learners who want to build practical taxation knowledge in a purposeful sequence.")}
      <section class="section-sm"><div class="container detail-hero"><img src="${item.img}" style="height:350px;width:100%;object-fit:cover;border-radius:22px" alt="${escapeText(item.title)} learning environment">
        <div class="detail-copy"><div class="badges">${badge(item.level)}${badge("Progress Tracking","green")}${badge("Membership","gold")}</div><h2 class="title">${escapeText(item.title)}</h2><p class="lead">Move from core concepts to practical strategy through a connected sequence of books, chapters, PDFs, and videos.</p>
          <div class="button-row"><button class="btn btn-primary" onclick="addCart('${escapeText(item.title)}',${item.price},'Learning Track','track-${item.id}')">Enroll in Track</button><button class="btn btn-light" onclick="addCart('${escapeText(item.title)}',${item.price},'Learning Track','track-${item.id}')">Add to Cart</button><button class="btn btn-gold" onclick="go('membership')">Access with Membership</button></div>
        </div></div></section>
      <section class="section-sm soft"><div class="container"><div class="overview">${[[item.books,"Books"],[item.chapters,"Chapters"],[item.chapters,"PDFs"],[Math.max(18,item.chapters-10),"Videos"],[Math.ceil(item.chapters/2.5)+"h","Content"],["100%","Trackable"]].map(function (stat) { return `<div class="stat"><strong>${stat[0]}</strong><span>${stat[1]}</span></div>`; }).join("")}</div></div></section>
      <section class="section"><div class="container"><div class="grid grid-2"><div><div class="eyebrow">Learning sequence</div><h2 class="section-title">Build knowledge in the right order</h2><div class="chapter-list" style="margin-top:24px">${modules.map(function (module, index) { return `<div class="chapter"><div class="chapter-num">${index+1}</div><div><h3>Module ${index+1}: ${module}</h3><p>${7+index} lessons · PDF and video · knowledge check</p></div><button class="btn btn-light btn-sm" onclick="toast('${index ? "Complete the prior module to continue" : "Module preview opened"}')">${index ? "Locked" : "Preview"}</button></div>`; }).join("")}</div></div>
      <div><div class="card pad"><div class="eyebrow">Progress preview</div><h3>Continue Learning</h3><p>Module 1 · Introduction</p><div style="display:flex;justify-content:space-between;font-size:.75rem;margin-top:22px"><span>Track progress</span><b>20%</b></div><div class="progress" style="margin:8px 0 20px"><span style="width:20%"></span></div><button class="btn btn-primary" onclick="go('chapter/1/1')">Continue Learning →</button></div></div></div></div></section>`;
  };

  window.cartPage = function () {
    const subtotal = cart.reduce(function (sum, item) { return sum + Number(item.price); }, 0);
    const total = Math.max(0, subtotal - discount);
    return `${pageHero("Your selections","Your Cart","Review your books, chapters, bundles, tracks, and memberships before checkout.")}
      <section class="section-sm"><div class="container cart-layout"><div class="card" id="cartItems">${cart.length ? cart.map(function (item) {
        return `<div class="cart-item"><div class="thumb">${escapeText(item.type.slice(0,3).toUpperCase())}</div><div><h3 style="margin:0">${escapeText(item.name)}</h3><div class="meta"><span>${escapeText(item.type)}</span><span>Digital access</span></div></div><div style="text-align:right"><div class="price">${money(item.price)}</div><button class="remove" aria-label="Remove ${escapeText(item.name)}" onclick="removeCart(${item.id})">Remove</button></div></div>`;
      }).join("") : `<div class="empty"><h3>Your cart is ready for a first chapter.</h3><p>Explore the library to add books, lessons, bundles, or a membership.</p><button class="btn btn-primary" onclick="go('library')">Explore Library</button></div>`}</div>
      <aside class="card order-box"><h3>Order summary</h3><div class="coupon"><label class="sr-only" for="couponCode">Coupon code</label><input id="couponCode" placeholder="Coupon code"><button class="btn btn-light btn-sm" onclick="applyCoupon()">Apply</button></div><div class="order-row"><span>Subtotal</span><b>${money(subtotal)}</b></div><div class="order-row"><span>Discount</span><b>-${money(discount)}</b></div><div class="order-row total"><span>Total</span><span>${money(total)}</span></div><button class="btn btn-primary" style="width:100%;margin-top:12px" ${cart.length ? `onclick="go('checkout')"` : `disabled aria-disabled="true"`}>Proceed to Checkout</button><button class="btn btn-light" style="width:100%;margin-top:8px" onclick="go('library')">Continue Browsing</button></aside></div></section>`;
  };

  window.checkout = function () {
    if (!cart.length) {
      return `${pageHero("Your cart is empty","Checkout unavailable","Add at least one book, chapter, bundle, learning track, or membership before checking out.")}
        <section class="section"><div class="container success-wrap"><div class="card pad"><h2 class="section-title">Nothing to purchase yet</h2><p class="lead">Your checkout is protected from empty or stale orders.</p><button class="btn btn-primary" onclick="go('library')">Explore Library</button></div></div></section>`;
    }
    const subtotal = cart.reduce(function (sum, item) { return sum + Number(item.price); }, 0);
    const total = Math.max(0, subtotal - discount);
    return `${pageHero("Secure mock checkout","Complete Your Purchase","This is a prototype checkout. No payment details are stored or processed.")}
      <section class="section-sm"><div class="container checkout-layout">
        <form class="card pad" id="checkoutForm" novalidate onsubmit="completePurchase(event)">
          <h3>Customer details</h3>
          <div class="form-grid"><div class="field"><label for="firstName">First name</label><input id="firstName" autocomplete="given-name" required></div><div class="field"><label for="lastName">Last name</label><input id="lastName" autocomplete="family-name" required></div></div>
          <div class="field"><label for="checkoutEmail">Email address</label><input id="checkoutEmail" type="email" autocomplete="email" required></div>
          <h3 style="margin-top:30px">Payment method</h3>
          <label class="payment-option selected"><input type="radio" name="pay" value="Card" checked onchange="selectPayment(this.parentElement)"> Stripe / Credit Card <span style="margin-left:auto">VISA · MC</span></label>
          <label class="payment-option"><input type="radio" name="pay" value="PayPal" onchange="selectPayment(this.parentElement)"> PayPal <span style="margin-left:auto;color:#2563eb;font-weight:800">PayPal</span></label>
          <div id="cardFields"><div class="field"><label for="cardNumber">Card number</label><input id="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" required pattern="[0-9 ]{15,19}"></div><div class="form-grid"><div class="field"><label for="expiry">Expiry</label><input id="expiry" autocomplete="cc-exp" placeholder="12/28" required pattern="(0[1-9]|1[0-2])\\/[0-9]{2}"></div><div class="field"><label for="cvc">CVC</label><input id="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" required pattern="[0-9]{3,4}"></div></div></div>
          <div class="field"><label><input type="checkbox" id="terms" required> I agree to the terms and digital content policy.</label></div>
          <button class="btn btn-gold" style="width:100%" type="submit">Complete Purchase</button>
        </form>
        <aside class="card order-box"><h3>Your order</h3>${cart.map(function (item) { return `<div class="order-row"><span>${escapeText(item.name)}</span><b>${money(item.price)}</b></div>`; }).join("")}<div class="order-row"><span>Discount</span><b>-${money(discount)}</b></div><div class="order-row total"><span>Total</span><span>${money(total)}</span></div><p class="meta" style="text-align:center;margin-top:12px">Encrypted checkout simulation</p></aside>
      </div></section>`;
  };

  window.selectPayment = function (element) {
    document.querySelectorAll(".payment-option").forEach(function (option) { option.classList.remove("selected"); });
    element.classList.add("selected");
    const paypal = element.textContent.includes("PayPal");
    const fields = document.getElementById("cardFields");
    if (fields) {
      fields.classList.toggle("hidden", paypal);
      fields.querySelectorAll("input").forEach(function (input) { input.required = !paypal; });
    }
  };

  function markError(input, message) {
    input.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    let error = input.parentElement.querySelector(".field-error");
    if (!error) {
      error = document.createElement("span");
      error.className = "field-error";
      input.parentElement.appendChild(error);
    }
    error.textContent = message;
  }

  function clearErrors(form) {
    form.querySelectorAll(".invalid").forEach(function (input) {
      input.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
    });
    form.querySelectorAll(".field-error").forEach(function (error) { error.remove(); });
  }

  function validateForm(form) {
    clearErrors(form);
    let valid = true;
    form.querySelectorAll("input[required],select[required],textarea[required]").forEach(function (input) {
      if (input.closest(".hidden")) return;
      if (!input.checkValidity()) {
        markError(input, input.validity.valueMissing ? "This field is required." : "Please enter a valid value.");
        valid = false;
      }
    });
    const first = form.querySelector(".invalid");
    if (first) first.focus();
    return valid;
  }

  window.completePurchase = function (event) {
    if (event) event.preventDefault();
    if (!cart.length) {
      toast("Your cart is empty");
      go("cart");
      return;
    }
    const form = document.getElementById("checkoutForm");
    if (!validateForm(form)) {
      toast("Please review the highlighted fields");
      return;
    }
    const subtotal = cart.reduce(function (sum, item) { return sum + Number(item.price); }, 0);
    lastOrder = {
      id: "DKL-" + new Date().getFullYear() + "-" + String(Date.now()).slice(-6),
      date: new Date().toISOString(),
      customer: {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        email: document.getElementById("checkoutEmail").value.trim()
      },
      payment: form.querySelector("input[name='pay']:checked").value,
      items: cart.map(function (item) { return Object.assign({}, item); }),
      subtotal: subtotal,
      discount: discount,
      total: Math.max(0, subtotal - discount)
    };
    purchases = purchases.concat(lastOrder.items);
    saveJSON("dklLastOrder", lastOrder);
    saveJSON("dklPurchases", purchases);
    cart = [];
    discount = 0;
    syncCart();
    go("success");
  };

  window.success = function () {
    if (!lastOrder || !lastOrder.items || !lastOrder.items.length) {
      return `${pageHero("No recent order","Purchase confirmation unavailable","Complete a checkout to create a purchase confirmation.")}
        <section class="section"><div class="container success-wrap"><button class="btn btn-primary" onclick="go('library')">Explore Library</button></div></section>`;
    }
    return `<section class="section"><div class="container success-wrap"><div class="success-icon">✓</div><div class="eyebrow">Order ${escapeText(lastOrder.id)}</div><h1 class="title">Your purchase was successful.</h1><p class="lead">Your content is ready in My Library. PDFs can be downloaded and videos streamed from your learner dashboard.</p>
      <div class="card pad" style="margin:32px 0;text-align:left"><h3>Order summary</h3>${lastOrder.items.map(function (item) { return `<div class="order-row"><span>${escapeText(item.name)}</span><b>${money(item.price)}</b></div>`; }).join("")}
      <div class="order-row"><span>Discount</span><b>-${money(lastOrder.discount)}</b></div><div class="order-row total"><span>Total paid</span><span>${money(lastOrder.total)}</span></div><div class="order-row"><span>Payment status</span>${badge("Paid","green")}</div></div>
      <div class="button-row" style="justify-content:center"><button class="btn btn-primary" onclick="go('dashboard')">Go to Dashboard</button><button class="btn btn-gold" onclick="go('chapter/1/1')">Start Learning</button><button class="btn btn-light" onclick="downloadInvoice()">Download Invoice</button></div>
    </div></section>`;
  };

  window.downloadInvoice = function () {
    if (!lastOrder) return;
    const lines = ["Digital Knowledge Library", "Invoice " + lastOrder.id, ""].concat(
      lastOrder.items.map(function (item) { return item.name + " - " + money(item.price); }),
      ["", "Discount: -" + money(lastOrder.discount), "Total: " + money(lastOrder.total)]
    );
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = lastOrder.id + "-invoice.txt";
    link.click();
    URL.revokeObjectURL(link.href);
    toast("Invoice downloaded");
  };

  window.dashboard = function () {
    return `<div class="dash"><aside class="sidebar" id="dashboardSidebar"><a class="brand" href="#home"><i class="brandmark"></i><span>My Knowledge<br>Library</span></a><div class="side-nav" id="learnerNav">${learnerNav.map(function (name,index) { return `<button class="${index===0?"active":""}" onclick="dashTab(this,'${name}')">${name}</button>`; }).join("")}</div></aside>
      <section class="dash-main"><button class="btn btn-light dash-toggle" aria-controls="learnerNav" aria-expanded="false" onclick="toggleDashboardNav(this,'dashboardSidebar')">Dashboard menu</button><div class="dash-head"><div><div class="eyebrow">Learner dashboard</div><h1 class="section-title" id="dashTitle">Welcome back</h1></div><button class="btn btn-light" onclick="go('home')">View public site</button></div><div id="dashContent">${dashboardHome()}</div></section></div>`;
  };

  window.dashboardHome = function () {
    const owned = purchases.length;
    const recent = purchases.slice(-4).reverse();
    return `<div class="dash-grid">${[["Full Library","Active membership"],[owned,"Purchased items"],[purchases.filter(function(i){return i.type==="PDF"||i.type==="PDF + Video";}).length,"Saved PDFs"],["42%","Overall progress"]].map(function (stat) { return `<div class="card dash-card"><span class="meta">${stat[1]}</span><strong>${stat[0]}</strong></div>`; }).join("")}</div>
      <div class="grid grid-2" style="margin-top:18px"><div class="card pad"><div class="eyebrow">Continue learning</div><h3>Understanding IRS Notices</h3><p>IRS Audit Defense · Chapter 1 · 12 minutes remaining</p><div class="progress" style="margin:22px 0"><span style="width:62%"></span></div><button class="btn btn-primary" onclick="go('chapter/1/1')">Resume Lesson →</button></div>
      <div class="card pad"><div class="eyebrow">Recent purchases</div><h3>${recent.length ? recent.length + " items ready" : "Build your library"}</h3>${recent.length ? recent.map(function(item){return `<div class="order-row"><span>${escapeText(item.name)}</span>${badge("Purchased","green")}</div>`;}).join("") : `<p>Purchased books, chapters, and tracks will appear here.</p><button class="btn btn-light" onclick="go('library')">Explore Library</button>`}</div></div>`;
  };

  window.admin = function () {
    return `<div class="dash"><aside class="sidebar" id="adminSidebar"><a class="brand" href="#home"><i class="brandmark"></i><span>Library Admin<br>Console</span></a><div class="side-nav" id="adminNav">${adminNav.map(function (name,index) { return `<button class="${index===0?"active":""}" onclick="adminTab(this,'${name}')">${name}</button>`; }).join("")}</div></aside>
      <section class="dash-main"><button class="btn btn-light dash-toggle" aria-controls="adminNav" aria-expanded="false" onclick="toggleDashboardNav(this,'adminSidebar')">Admin menu</button><div class="dash-head"><div><div class="eyebrow">Platform operations</div><h1 class="section-title" id="adminTitle">Admin Overview</h1></div><button class="btn btn-light" onclick="go('home')">View site</button></div><div id="adminContent">${adminHome()}</div></section></div>`;
  };

  window.toggleDashboardNav = function (button, sidebarId) {
    const open = document.getElementById(sidebarId).classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
  };

  window.login = function () {
    return `<div class="login-shell"><section class="login-art"><div class="eyebrow" style="color:var(--gold2)">Your professional library</div><h1 class="section-title">Every book, lesson, PDF, video, and track in one place.</h1><p>Access your purchases and continue learning from any device.</p></section>
      <section class="login-form"><div><div class="tabs" role="tablist"><button class="active" role="tab" aria-selected="true" onclick="loginMode(this,'login')">Login</button><button role="tab" aria-selected="false" onclick="loginMode(this,'register')">Register</button></div><div id="loginPanel" style="margin-top:28px">${loginPanel("login")}</div></div></section></div>`;
  };

  function loginPanel(mode) {
    if (mode === "register") {
      return `<h2 class="section-title">Create your account</h2><form id="registerForm" novalidate onsubmit="submitAccount(event,'register')"><div class="form-grid"><div class="field"><label for="regFirst">First name</label><input id="regFirst" required></div><div class="field"><label for="regLast">Last name</label><input id="regLast" required></div></div><div class="field"><label for="regEmail">Email address</label><input id="regEmail" type="email" required></div><div class="field"><label for="regPassword">Create password</label><input id="regPassword" type="password" minlength="8" required></div><button class="btn btn-primary" style="width:100%" type="submit">Create Account</button></form>`;
    }
    return `<h2 class="section-title">Welcome back</h2><p class="lead">Access your purchased books, lessons, PDFs, videos, and membership content.</p><form id="loginForm" novalidate onsubmit="submitAccount(event,'login')"><div class="field"><label for="loginEmail">Email address</label><input id="loginEmail" type="email" autocomplete="email" required></div><div class="field"><label for="loginPassword">Password</label><input id="loginPassword" type="password" autocomplete="current-password" required></div><div style="display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:18px"><label><input type="checkbox"> Remember me</label><button type="button" class="remove" onclick="toast('Password reset link simulated')">Forgot password?</button></div><button class="btn btn-primary" style="width:100%" type="submit">Login to My Library</button><button class="btn btn-light" type="button" style="width:100%;margin-top:10px" onclick="go('admin')">Admin Login</button></form>`;
  }

  window.loginMode = function (element, mode) {
    document.querySelectorAll(".login-form [role='tab']").forEach(function (tab) {
      const selected = tab === element;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    document.getElementById("loginPanel").innerHTML = loginPanel(mode);
  };

  window.submitAccount = function (event, mode) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) {
      toast("Please review the highlighted fields");
      return;
    }
    toast(mode === "register" ? "Account created" : "Login successful");
    go("dashboard");
  };

  window.support = function () {
    const faqs = [["How do I access a purchase?","Sign in and open My Library. Purchased PDFs, videos, books, and tracks appear immediately after payment."],["Can I buy one chapter only?","Yes. Chapter PDFs, video lessons, and PDF + video combinations can be purchased independently."],["What does membership unlock?","Each plan clearly lists its eligible books, lessons, formats, bundles, and tracks."],["Can I download videos?","Videos are designed for secure streaming. Eligible chapter PDFs can be downloaded."],["How are payment questions handled?","Use the contact form with your order number and the support team will review the transaction."]];
    return `${pageHero("Help center","Contact & Support","Find quick answers or send the library team a message about account access, purchases, memberships, lessons, or billing.")}
      <section class="section-sm"><div class="container grid grid-2"><form class="card pad" id="supportForm" novalidate onsubmit="submitSupport(event)"><h3>Send a message</h3><div class="form-grid"><div class="field"><label for="supportName">Name</label><input id="supportName" required></div><div class="field"><label for="supportEmail">Email</label><input id="supportEmail" type="email" required></div></div><div class="field"><label for="supportTopic">Help topic</label><select id="supportTopic" required><option>Account access</option><option>Purchase</option><option>Membership</option><option>PDF download</option><option>Video lesson</option><option>Payment question</option></select></div><div class="field"><label for="supportMessage">Message</label><textarea id="supportMessage" rows="6" required minlength="10"></textarea></div><button class="btn btn-primary" type="submit">Submit Request</button><p class="meta" style="margin-top:15px">Support: help@digitalknowledgelibrary.example</p></form>
      <div class="card pad"><div class="eyebrow">Frequently asked questions</div><h2 class="section-title">A quick answer may be here</h2>${faqs.map(function (faq,index) { return `<div class="faq-item"><button class="faq-q" aria-expanded="false" aria-controls="faq-${index}" onclick="toggleFaq(this)"> ${faq[0]} <span aria-hidden="true">+</span></button><div class="faq-a" id="faq-${index}">${faq[1]}</div></div>`; }).join("")}</div></div></section>`;
  };

  window.toggleFaq = function (button) {
    const item = button.parentElement;
    const open = item.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
    button.querySelector("span").textContent = open ? "−" : "+";
  };

  window.submitSupport = function (event) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) {
      toast("Please review the highlighted fields");
      return;
    }
    event.currentTarget.reset();
    toast("Support request submitted");
  };

  function enhancePage() {
    document.querySelectorAll("button:not([type])").forEach(function (button) { button.type = "button"; });
    document.querySelectorAll("img:not([alt]), img[alt='']").forEach(function (image) {
      const card = image.closest(".card");
      const heading = card && card.querySelector("h3");
      image.alt = heading ? heading.textContent + " illustration" : "Digital Knowledge Library learning illustration";
      image.loading = "lazy";
    });
    const heading = document.querySelector("#app h1, #app h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      requestAnimationFrame(function () { heading.focus({ preventScroll: true }); });
    }
  }

  const titleMap = {
    home: "Digital Knowledge Library",
    library: "Taxation Library",
    book: "Book Details",
    chapter: "Chapter Lesson",
    bundles: "Taxation Bundles",
    "bundle-detail": "Bundle Details",
    membership: "Membership Plans",
    tracks: "Learning Tracks",
    "track-detail": "Track Details",
    cart: "Your Cart",
    checkout: "Checkout",
    success: "Purchase Successful",
    dashboard: "My Library Dashboard",
    admin: "Admin Dashboard",
    login: "Login or Register",
    support: "Contact and Support"
  };

  window.render = function () {
    const hash = (location.hash || "#home").slice(1);
    const parts = hash.split("/");
    routeState.name = parts[0] || "home";
    routeState.id = parts[1] || null;
    routeState.chapter = parts[2] || 1;
    const renderer = routes[routeState.name] || home;
    app.innerHTML = renderer();
    document.querySelectorAll(".navlinks a").forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + routeState.name);
    });
    document.title = routeState.name === "home" ? "Digital Knowledge Library" : (titleMap[routeState.name] || "Digital Knowledge Library") + " | Digital Knowledge Library";
    syncCart();
    window.scrollTo(0, 0);
    enhancePage();
  };

  routes.library = library;
  routes.book = book;
  routes.chapter = chapter;
  routes.bundles = bundlesPage;
  routes["bundle-detail"] = bundleDetail;
  routes.tracks = tracksPage;
  routes["track-detail"] = trackDetail;
  routes.cart = cartPage;
  routes.checkout = checkout;
  routes.success = success;
  routes.dashboard = dashboard;
  routes.admin = admin;
  routes.login = login;
  routes.support = support;

  window.addEventListener("hashchange", render);
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
