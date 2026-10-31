(() => {
  "use strict";

  const STORAGE_KEY = "chaozhaomumu.data.v1";
  const MOOD_KEY = "chaozhaomumu.mood.v1";
  const PHOTO_SEEDED_KEY = "chaozhaomumu.photosSeeded.v1";
  const DB_NAME = "chaozhaomumu";
  const DB_STORE = "photos";
  const DAY_MS = 24 * 60 * 60 * 1000;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const icons = {
    arrow: '<svg><use href="#i-arrow"></use></svg>',
    check: '<svg><use href="#i-check"></use></svg>',
    close: '<svg><use href="#i-close"></use></svg>',
    edit: '<svg><use href="#i-edit"></use></svg>',
    trash: '<svg><use href="#i-trash"></use></svg>',
  };

  const moodMeta = {
    sunny: { symbol: "☀", label: "开心" },
    soft: { symbol: "♥", label: "温柔" },
    calm: { symbol: "☁", label: "平静" },
    tired: { symbol: "☾", label: "有点累" },
    missing: { symbol: "✦", label: "想你" },
  };

  const moodFeedback = {
    sunny: "把这份开心，也分给对方一点。",
    soft: "温柔的日子，值得被好好记住。",
    calm: "平静也是一种很珍贵的幸福。",
    tired: "累了就靠一靠，我们慢慢来。",
    missing: "想念有回声，对方也在想你。",
  };

  const pageTitles = {
    home: "今日份的生活",
    wedding: "婚纱照",
    photos: "时光相册",
    journal: "我们的日记",
    goals: "心愿清单",
    dates: "重要日子",
  };

  const journalPrompts = [
    "今天对方做的哪件小事，让你觉得很温暖？",
    "如果用一个声音形容今天，会是什么？",
    "最近你们一起期待的下一件事是什么？",
    "有什么小烦恼，可以在今天轻轻放下？",
    "想对十年后的你们说一句什么话？",
  ];

  const visualNames = ["coast", "dinner", "walk", "flowers", "home", "night"];
  const weddingPhotos = Array.isArray(window.WEDDING_PHOTOS)
    ? window.WEDDING_PHOTOS.filter((photo) => photo && photo.src)
    : [];
  const WEDDING_BATCH_SIZE = 12;
  const weddingPreloads = new Map();

  function localISO(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseLocalDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function calendarDayNumber(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
  }

  function daysBetween(from, to) {
    return Math.round(calendarDayNumber(to) - calendarDayNumber(from));
  }

  function formatChineseDate(value, withYear = true) {
    const date = typeof value === "string" ? parseLocalDate(value) : value;
    if (!date) return "日期待定";
    if (withYear) {
      return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
    }
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  }

  function formatShortDate(value) {
    const date = typeof value === "string" ? parseLocalDate(value) : value;
    if (!date) return "";
    return `${String(date.getMonth() + 1).padStart(2, "0")} / ${String(
      date.getDate(),
    ).padStart(2, "0")}`;
  }

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function splitName(name) {
    const trimmed = String(name || "").trim();
    return trimmed.slice(-1) || "♥";
  }

  function dateSeed(today) {
    const nextYear = new Date(today.getFullYear(), 11, 31);
    const eventDate = addDays(today, 18);
    return {
      journals: [
        {
          id: uid("journal"),
          date: localISO(addDays(today, -2)),
          mood: "soft",
          title: "把周末还给彼此",
          body:
            "关掉闹钟，慢慢吃完一顿早餐。后来一起去河边散步，风很轻，我们聊了很多没有结论的小事。\n\n没有打卡，没有计划，只是并肩走着。这样的周末，好像就足够把一周的疲惫都熨平了。",
          createdAt: Date.now(),
        },
        {
          id: uid("journal"),
          date: localISO(addDays(today, -10)),
          mood: "sunny",
          title: "厨房里的小小失败",
          body:
            "本来想复刻那家小馆的招牌菜，结果盐放多了。我们笑到停不下来，最后还是开开心心地点了外卖。\n\n原来翻车也能变成好回忆，重要的是，有人和你一起收拾厨房。",
          createdAt: Date.now() - 1,
        },
        {
          id: uid("journal"),
          date: localISO(addDays(today, -21)),
          mood: "calm",
          title: "普通星期二",
          body:
            "下班路上顺手买了两个橘子。到家时灯已经亮着，桌上有热汤，电视里放着谁也没认真看的节目。\n\n今天没有发生什么大事，但这就是我想一直过下去的生活。",
          createdAt: Date.now() - 2,
        },
      ],
      goals: [
        {
          id: uid("goal"),
          title: "一起看一次海上日出",
          category: "旅行",
          note: "带上保温杯和一条厚毯子，早一点出门。",
          dueDate: localISO(addDays(today, 90)),
          done: false,
          createdAt: Date.now(),
        },
        {
          id: uid("goal"),
          title: "去看一次极光",
          category: "旅行",
          note: "把年假留给我们第一次远行。",
          dueDate: "",
          done: false,
          createdAt: Date.now() - 1,
        },
        {
          id: uid("goal"),
          title: "给家里添一面照片墙",
          category: "生活",
          note: "每张照片都亲手写一句当时的备注。",
          dueDate: localISO(addDays(today, 45)),
          done: false,
          createdAt: Date.now() - 2,
        },
        {
          id: uid("goal"),
          title: "学会做一道对方的拿手菜",
          category: "生活",
          note: "",
          dueDate: "",
          done: true,
          createdAt: Date.now() - 3,
        },
        {
          id: uid("goal"),
          title: "每个月给对方写一封信",
          category: "浪漫",
          note: "不必很长，认真写完就好。",
          dueDate: "",
          done: false,
          createdAt: Date.now() - 4,
        },
        {
          id: uid("goal"),
          title: "穿情侣装去一次游乐场",
          category: "浪漫",
          note: "坐最后一排过山车。",
          dueDate: "",
          done: false,
          createdAt: Date.now() - 5,
        },
        {
          id: uid("goal"),
          title: "一起完成一次 10 公里徒步",
          category: "成长",
          note: "慢慢走，不赶时间。",
          dueDate: localISO(addDays(today, 120)),
          done: false,
          createdAt: Date.now() - 6,
        },
        {
          id: uid("goal"),
          title: "各自读完一本对方推荐的书",
          category: "成长",
          note: "",
          dueDate: "",
          done: true,
          createdAt: Date.now() - 7,
        },
      ],
      events: [
        {
          id: uid("event"),
          title: "下一次好好约会",
          date: localISO(eventDate),
          repeat: "once",
          createdAt: Date.now(),
        },
        {
          id: uid("event"),
          title: "一起迎接跨年",
          date: `${nextYear.getFullYear()}-12-31`,
          repeat: "annual",
          createdAt: Date.now() - 1,
        },
      ],
    };
  }

  function createDefaultState() {
    const today = new Date();
    const seed = dateSeed(today);
    return {
      version: 1,
      settings: {
        personA: "阿屿",
        personB: "小满",
        startDate: "2023-05-20",
        tagline: "和你一起，把普通日子过成纪念日。",
      },
      journals: seed.journals,
      goals: seed.goals,
      events: seed.events,
    };
  }

  function getStoredState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!stored || !stored.settings) return createDefaultState();
      const defaults = createDefaultState();
      return {
        ...defaults,
        ...stored,
        settings: { ...defaults.settings, ...stored.settings },
        journals: Array.isArray(stored.journals) ? stored.journals : defaults.journals,
        goals: Array.isArray(stored.goals) ? stored.goals : defaults.goals,
        events: Array.isArray(stored.events) ? stored.events : defaults.events,
      };
    } catch {
      return createDefaultState();
    }
  }

  const state = {
    ...getStoredState(),
    photos: [],
    activePhotoFilter: "全部",
    activePhotoId: null,
    activeWeddingIndex: 0,
    visibleWeddingCount: 0,
    weddingImageRequest: 0,
    editingJournalId: null,
    editingGoalId: null,
    editingEventId: null,
    selectedPhotoFile: null,
    selectedPhotoPreviewURL: null,
  };

  let toastTimer;
  let database;

  function saveState() {
    const persisted = {
      version: 1,
      settings: state.settings,
      journals: state.journals,
      goals: state.goals,
      events: state.events,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function withPhotoStore(mode, operation) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(DB_STORE, mode);
      const store = transaction.objectStore(DB_STORE);
      let request;
      try {
        request = operation(store);
      } catch (error) {
        reject(error);
        return;
      }
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function getPhotos() {
    return withPhotoStore("readonly", (store) => store.getAll());
  }

  async function putPhoto(photo) {
    return withPhotoStore("readwrite", (store) => store.put(photo));
  }

  async function putPhotos(photos) {
    return withPhotoStore("readwrite", (store) => {
      photos.forEach((photo) => store.put(photo));
      return null;
    });
  }

  async function deletePhotoFromDB(id) {
    return withPhotoStore("readwrite", (store) => store.delete(id));
  }

  async function clearPhotosDB() {
    return withPhotoStore("readwrite", (store) => store.clear());
  }

  function seedPhotos() {
    const today = new Date();
    return [
      {
        id: uid("photo"),
        title: "海风把头发吹乱的那天",
        date: localISO(addDays(today, -7)),
        category: "旅行",
        note: "我们沿着海岸线走了很久，直到鞋里都是沙。",
        visual: "coast",
        image: "",
        createdAt: Date.now(),
      },
      {
        id: uid("photo"),
        title: "一起做的一顿晚饭",
        date: localISO(addDays(today, -13)),
        category: "美食",
        note: "卖相一般，但两个人都吃得很认真。",
        visual: "dinner",
        image: "",
        createdAt: Date.now() - 1,
      },
      {
        id: uid("photo"),
        title: "春天里的慢散步",
        date: localISO(addDays(today, -20)),
        category: "日常",
        note: "路边新长出来的叶子，是春天写的信。",
        visual: "walk",
        image: "",
        createdAt: Date.now() - 2,
      },
      {
        id: uid("photo"),
        title: "买回家的第一束花",
        date: localISO(addDays(today, -31)),
        category: "日常",
        note: "没有特别的理由，只是想让家里亮一点。",
        visual: "flowers",
        image: "",
        createdAt: Date.now() - 3,
      },
      {
        id: uid("photo"),
        title: "待在对方面前的一个下午",
        date: localISO(addDays(today, -43)),
        category: "日常",
        note: "一人看书，一人发呆，也很好。",
        visual: "home",
        image: "",
        createdAt: Date.now() - 4,
      },
      {
        id: uid("photo"),
        title: "还没有说完的星星",
        date: localISO(addDays(today, -58)),
        category: "旅行",
        note: "下次记得带毯子，还有热可可。",
        visual: "night",
        image: "",
        createdAt: Date.now() - 5,
      },
    ];
  }

  function visualHTML(item) {
    if (item.image) {
      return `<img src="${item.image}" alt="${escapeHTML(item.title)}" loading="lazy" />`;
    }
    const visual = visualNames.includes(item.visual) ? item.visual : "home";
    return `<div class="sample-art sample-art--${visual}" role="img" aria-label="${escapeHTML(
      item.title,
    )}"></div>`;
  }

  function toast(message) {
    const element = $("#toast");
    $("p", element).textContent = message;
    clearTimeout(toastTimer);
    element.classList.add("is-visible");
    toastTimer = setTimeout(() => element.classList.remove("is-visible"), 2200);
  }

  function celebrate(event) {
    const heart = document.createElement("span");
    heart.className = "float-heart";
    heart.textContent = "♥";
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    heart.style.left = `${rect ? rect.left + rect.width / 2 : window.innerWidth / 2}px`;
    heart.style.top = `${rect ? rect.top + rect.height / 2 : window.innerHeight / 2}px`;
    heart.style.fontSize = `${14 + Math.random() * 10}px`;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1100);
  }

  function daysTogether() {
    const start = parseLocalDate(state.settings.startDate);
    if (!start) return 0;
    return Math.max(1, daysBetween(start, new Date()) + 1);
  }

  function coreAnniversary() {
    return {
      id: "core-anniversary",
      title: "在一起的纪念日",
      date: state.settings.startDate,
      repeat: "annual",
      isCore: true,
    };
  }

  function nextOccurrence(event, today = new Date()) {
    const original = parseLocalDate(event.date);
    if (!original) return null;
    let next = new Date(
      today.getFullYear(),
      original.getMonth(),
      original.getDate(),
    );

    if (event.repeat === "annual") {
      if (daysBetween(today, next) < 0) {
        next = new Date(next.getFullYear() + 1, next.getMonth(), next.getDate());
      }
      const age = next.getFullYear() - original.getFullYear();
      return {
        ...event,
        next,
        days: daysBetween(today, next),
        years: age > 0 ? age : null,
      };
    }

    return {
      ...event,
      next,
      days: daysBetween(today, next),
      years: null,
    };
  }

  function upcomingEvents() {
    const today = new Date();
    return [coreAnniversary(), ...state.events]
      .map((event) => nextOccurrence(event, today))
      .filter(Boolean)
      .filter((event) => event.days >= 0)
      .sort((a, b) => a.days - b.days || a.title.localeCompare(b.title, "zh-CN"));
  }

  function renderIdentity() {
    const { personA, personB, startDate, tagline } = state.settings;
    const couple = `${personA} & ${personB}`;
    const days = daysTogether();

    $("#sidebarCouple").textContent = couple;
    $("#sidebarDays").textContent = days.toLocaleString("zh-CN");
    $("#avatarA").textContent = splitName(personA);
    $("#avatarB").textContent = splitName(personB);
    $("#daysTogether").textContent = days.toLocaleString("zh-CN");
    $("#startDateLabel").textContent = formatChineseDate(startDate);
    $("#homeTagline").textContent = tagline;
    $("#footerNames").textContent = couple;
  }

  function renderNextEvent() {
    const next = upcomingEvents()[0];
    if (!next) {
      $("#nextEventContent").innerHTML = `
        <p class="next-date-card__name">还没有安排下一个日子</p>
        <div class="next-date-card__count"><strong>∞</strong><span>种可能</span></div>
        <p class="next-date-card__date">去添加一个值得期待的日子吧</p>
      `;
      return;
    }

    const dayLabel = next.days === 0 ? "就是" : "还有";
    $("#nextEventContent").innerHTML = `
      <p class="next-date-card__name">${escapeHTML(next.title)}</p>
      <div class="next-date-card__count">
        <strong>${next.days}</strong><span>天后</span>
      </div>
      <p class="next-date-card__date">${formatChineseDate(next.next)}${dayLabel === "就是" ? " · 今天" : ""}</p>
    `;
  }

  function renderStats() {
    const completed = state.goals.filter((goal) => goal.done).length;
    $("#statPhotos").textContent = state.photos.length;
    $("#statJournals").textContent = state.journals.length;
    $("#statGoals").textContent = state.goals.length;
    $("#statDone").textContent = completed;
    $("#navPhotoCount").textContent = state.photos.length;
  }

  function renderWeddingStory() {
    const total = weddingPhotos.length;
    $("#navWeddingCount").textContent = total;
    $("#weddingPhotoCount").textContent = String(total).padStart(2, "0");
    $("#weddingEmpty").hidden = total > 0;
    $("#weddingGallery").hidden = total === 0;

    if (!total) return;

    const heroClasses = ["lead", "top", "bottom"];
    $("#weddingHeroMosaic").innerHTML = weddingPhotos
      .slice(0, 3)
      .map(
        (photo, index) => `
          <button class="wedding-hero__photo wedding-hero__photo--${heroClasses[index]}" type="button" data-wedding-photo="${index}">
            <img
              src="${escapeHTML(photo.thumb || photo.src)}"
              width="${Number(photo.thumbWidth || 600)}"
              height="${Number(photo.thumbHeight || 900)}"
              alt="${escapeHTML(photo.alt || photo.title || `婚纱照 ${index + 1}`)}"
              loading="${index === 0 ? "eager" : "lazy"}"
              fetchpriority="${index === 0 ? "high" : "auto"}"
              decoding="async"
            />
          </button>`,
      )
      .join("");

    $("#weddingGallery").innerHTML = "";
    state.visibleWeddingCount = 0;
    renderWeddingGallery();
  }

  function renderWeddingGallery({ focusNew = false } = {}) {
    const grid = $("#weddingGallery");
    const start = state.visibleWeddingCount;
    const end = Math.min(start + WEDDING_BATCH_SIZE, weddingPhotos.length);
    const nextPhotos = weddingPhotos.slice(start, end);

    grid.insertAdjacentHTML(
      "beforeend",
      nextPhotos
        .map((photo, offset) => {
          const index = start + offset;
          const width = Number(photo.gridWidth || 560);
          const height = Number(photo.gridHeight || 840);
          return `
            <button class="wedding-shot" type="button" data-wedding-photo="${index}">
              <img
                src="${escapeHTML(photo.grid || photo.thumb || photo.src)}"
                width="${width}"
                height="${height}"
                alt="${escapeHTML(photo.alt || photo.title || `婚纱照 ${index + 1}`)}"
                loading="lazy"
                decoding="async"
              />
              <span class="wedding-shot__caption">
                <strong>${escapeHTML(photo.title || `第 ${index + 1} 帧`)}</strong>
                <small>FRAME ${String(index + 1).padStart(2, "0")} · FOREVER</small>
              </span>
            </button>`;
        })
        .join(""),
    );

    state.visibleWeddingCount = end;
    const remaining = weddingPhotos.length - end;
    $("#weddingArchiveStatus").textContent =
      `已展开 ${end} / ${weddingPhotos.length}`;
    $("#weddingGalleryProgress").textContent =
      remaining > 0
        ? `还有 ${remaining} 个瞬间`
        : "这是我们全部的婚纱影像";
    $("#weddingGalleryFooter").hidden = weddingPhotos.length === 0;
    $("#weddingLoadMore").hidden = remaining === 0;
    $("#weddingLoadMoreCount").textContent =
      `+${Math.min(WEDDING_BATCH_SIZE, remaining)} 张`;

    if (focusNew && nextPhotos.length) {
      requestAnimationFrame(() => {
        grid
          .querySelector(`[data-wedding-photo="${start}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function renderHomeMemories() {
    const container = $("#homeMemories");
    const photos = [...state.photos]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 3);
    if (!photos.length) {
      container.innerHTML = `
        <button class="memory-card" type="button" data-open="photoModal" style="grid-column:1/-1;min-height:160px">
          <span class="memory-card__body" style="height:160px;display:flex;justify-content:center">
            <span><strong>这里会装下你们的第一张照片</strong><small>点击添加一段回忆</small></span>
          </span>
        </button>`;
      return;
    }
    container.innerHTML = photos
      .map(
        (photo) => `
          <button class="memory-card" type="button" data-open-photo="${photo.id}">
            <span class="memory-card__image">
              ${visualHTML(photo)}
              <span class="memory-card__badge">${escapeHTML(photo.category)}</span>
            </span>
            <span class="memory-card__body">
              <span>
                <strong>${escapeHTML(photo.title)}</strong>
                <small>${formatShortDate(photo.date)}</small>
              </span>
              ${icons.arrow}
            </span>
          </button>`,
      )
      .join("");
  }

  function sortedJournals() {
    return [...state.journals].sort(
      (a, b) =>
        String(b.date).localeCompare(String(a.date)) ||
        Number(b.createdAt || 0) - Number(a.createdAt || 0),
    );
  }

  function renderHomeJournals() {
    const container = $("#homeJournals");
    const journals = sortedJournals().slice(0, 3);
    if (!journals.length) {
      container.innerHTML =
        '<p style="color:var(--muted);font-size:10px;padding:20px 0">还没有写下第一篇日记。</p>';
      return;
    }
    container.innerHTML = journals
      .map((entry) => {
        const date = parseLocalDate(entry.date) || new Date();
        return `
          <article class="journal-preview__item" data-edit-journal="${entry.id}">
            <span class="journal-date-tile">
              <strong>${date.getDate()}</strong>
              <span>${date.getMonth() + 1} 月</span>
            </span>
            <span class="journal-preview__copy">
              <strong>${escapeHTML(entry.title)}</strong>
              <p>${escapeHTML(entry.body.replace(/\s+/g, " "))}</p>
            </span>
            ${icons.arrow}
          </article>`;
      })
      .join("");
  }

  function renderMood() {
    let mood = null;
    try {
      const saved = JSON.parse(localStorage.getItem(MOOD_KEY));
      if (saved?.date === localISO()) mood = saved.mood;
    } catch {
      mood = null;
    }
    $$(".mood-options button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.mood === mood);
    });
    $("#moodFeedback").textContent = mood
      ? moodFeedback[mood]
      : "今天也要好好爱彼此。";
  }

  function renderGallery() {
    const grid = $("#photoGrid");
    const filtered =
      state.activePhotoFilter === "全部"
        ? state.photos
        : state.photos.filter(
            (photo) => photo.category === state.activePhotoFilter,
          );
    const sorted = [...filtered].sort((a, b) =>
      String(b.date).localeCompare(String(a.date)),
    );

    $("#galleryCount").textContent = `共 ${sorted.length} 张照片`;
    $("#photoEmpty").hidden = sorted.length !== 0;
    grid.hidden = sorted.length === 0;
    grid.innerHTML = sorted
      .map(
        (photo) => `
          <button class="photo-card" type="button" data-open-photo="${photo.id}">
            <span class="photo-card__image">${visualHTML(photo)}</span>
            <span class="photo-card__info">
              <strong>${escapeHTML(photo.title)}</strong>
              <small>${formatChineseDate(photo.date, false)} · ${escapeHTML(photo.category)}</small>
            </span>
          </button>`,
      )
      .join("");
  }

  function renderJournal() {
    const container = $("#journalStream");
    const journals = sortedJournals();
    const words = journals.reduce(
      (total, entry) =>
        total + `${entry.title || ""}${entry.body || ""}`.replace(/\s/g, "").length,
      0,
    );
    $("#journalWordCount").textContent = words.toLocaleString("zh-CN");
    $("#journalEntryCount").textContent = journals.length;
    $("#journalPrompt").textContent =
      journalPrompts[new Date().getDate() % journalPrompts.length];

    if (!journals.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span>♡</span>
          <h3>故事从今天开始</h3>
          <p>写下第一件想和对方一起记住的小事。</p>
          <button class="button button--primary" type="button" data-open="journalModal">写第一篇日记</button>
        </div>`;
      return;
    }

    container.innerHTML = journals
      .map((entry) => {
        const date = parseLocalDate(entry.date) || new Date();
        const meta = moodMeta[entry.mood] || moodMeta.calm;
        return `
          <article class="journal-entry">
            <time class="journal-entry__date" datetime="${entry.date}">
              <strong>${date.getDate()}</strong>
              <span>${date.getFullYear()} / ${String(date.getMonth() + 1).padStart(2, "0")}</span>
            </time>
            <div class="journal-entry__card">
              <div class="journal-entry__meta">
                <span class="mood-badge">${meta.symbol} ${meta.label}</span>
                <span>${formatChineseDate(entry.date)}</span>
              </div>
              <h3>${escapeHTML(entry.title)}</h3>
              <p class="journal-entry__body">${escapeHTML(entry.body)}</p>
            </div>
            <div class="journal-entry__actions">
              <button class="entry-action" type="button" data-edit-journal="${entry.id}" aria-label="编辑日记">
                ${icons.edit}
              </button>
              <button class="entry-action" type="button" data-delete-journal="${entry.id}" aria-label="删除日记">
                ${icons.trash}
              </button>
            </div>
          </article>`;
      })
      .join("");
  }

  const goalCategoryMeta = {
    生活: { symbol: "⌂" },
    旅行: { symbol: "↗" },
    成长: { symbol: "✎" },
    浪漫: { symbol: "♡" },
  };

  function renderGoals() {
    const total = state.goals.length;
    const done = state.goals.filter((goal) => goal.done).length;
    const percentage = total ? Math.round((done / total) * 100) : 0;
    $("#goalDoneCount").textContent = done;
    $("#goalTotalCount").textContent = total;
    $("#goalProgressBar").style.width = `${percentage}%`;
    $("#goalProgressText").textContent =
      total === 0
        ? "从一个小小的心愿开始吧。"
        : done === total
          ? "清单全部完成，下一站继续一起出发。"
          : `已经一起完成 ${percentage}%，还有 ${total - done} 件浪漫的小事在等我们。`;

    const categories = ["生活", "旅行", "浪漫", "成长"];
    $("#goalColumns").innerHTML = categories
      .map((category) => {
        const goals = state.goals.filter((goal) => goal.category === category);
        if (!goals.length && total > 0) return "";
        return `
          <section class="goal-group">
            <div class="goal-group__head">
              <div class="goal-group__title">
                <span>${goalCategoryMeta[category]?.symbol || "✦"}</span>
                ${category}
              </div>
              <small>${goals.filter((goal) => goal.done).length} / ${goals.length}</small>
            </div>
            ${
              goals.length
                ? goals
                    .map(
                      (goal) => `
                        <article class="goal-item ${goal.done ? "is-done" : ""}">
                          <button class="goal-check" type="button" data-toggle-goal="${goal.id}" aria-label="${
                            goal.done ? "标记为未完成" : "标记为完成"
                          }">
                            ${icons.check}
                          </button>
                          <div class="goal-item__copy">
                            <strong>${escapeHTML(goal.title)}</strong>
                            ${
                              goal.note
                                ? `<p>${escapeHTML(goal.note)}</p>`
                                : goal.dueDate
                                  ? `<p>希望在 ${formatChineseDate(goal.dueDate, false)} 前完成</p>`
                                  : ""
                            }
                          </div>
                          <div class="goal-item__actions">
                            <button class="entry-action" type="button" data-edit-goal="${goal.id}" aria-label="编辑心愿">
                              ${icons.edit}
                            </button>
                            <button class="entry-action" type="button" data-delete-goal="${goal.id}" aria-label="删除心愿">
                              ${icons.trash}
                            </button>
                          </div>
                        </article>`,
                    )
                    .join("")
                : '<p style="color:var(--muted);font-size:9px;padding:15px 0;border-top:1px solid var(--line)">还没有这个分类的心愿。</p>'
            }
          </section>`;
      })
      .join("");

    if (!total) {
      $("#goalColumns").innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <span>✦</span>
          <h3>一起许下第一个心愿吧</h3>
          <p>想去的地方、想学的事，都可以慢慢写进来。</p>
          <button class="button button--primary" type="button" data-open="goalModal">添加心愿</button>
        </div>`;
    }
  }

  function renderDates() {
    const upcoming = upcomingEvents();
    const first = upcoming[0];
    if (first) {
      $("#dateHeroName").textContent = first.title;
      $("#dateHeroDays").textContent = first.days;
      $("#dateHeroDate").textContent = `${formatChineseDate(first.next)}${
        first.years ? ` · 第 ${first.years} 年` : ""
      }`;
    } else {
      $("#dateHeroName").textContent = "还没安排下一个日子";
      $("#dateHeroDays").textContent = "∞";
      $("#dateHeroDate").textContent = "添加一个值得期待的日子";
    }

    $("#datesGrid").innerHTML = upcoming
      .map((event) => {
        const type = event.isCore
          ? "周年纪念"
          : event.repeat === "annual"
            ? "每年纪念"
            : "仅此一次";
        return `
          <article class="date-card">
            <div class="date-card__top">
              <div class="date-card__day">
                <strong>${event.days}</strong>
                <span>天后</span>
              </div>
              <span class="date-card__type">${type}</span>
            </div>
            <h3>${escapeHTML(event.title)}</h3>
            <p>${formatChineseDate(event.next)}${
              event.years ? ` · 第 ${event.years} 年` : ""
            }</p>
            ${
              event.isCore
                ? ""
                : `<div class="date-card__actions">
                    <button class="entry-action" type="button" data-edit-event="${event.id}" aria-label="编辑日子">${icons.edit}</button>
                    <button class="entry-action" type="button" data-delete-event="${event.id}" aria-label="删除日子">${icons.trash}</button>
                  </div>`
            }
          </article>`;
      })
      .join("");
  }

  function renderAll() {
    renderIdentity();
    renderNextEvent();
    renderStats();
    renderWeddingStory();
    renderHomeMemories();
    renderHomeJournals();
    renderMood();
    renderGallery();
    renderJournal();
    renderGoals();
    renderDates();
  }

  function refreshDateSurfaces() {
    renderIdentity();
    renderNextEvent();
    renderDates();
  }

  function switchView(viewName) {
    const target = $(`[data-view="${viewName}"]`);
    if (!target) return;
    $$(".view").forEach((view) => view.classList.toggle("is-active", view === target));
    $$(".nav-item, .mobile-nav > button[data-view-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.viewTarget === viewName);
    });
    $("#pageTitle").textContent = pageTitles[viewName] || pageTitles.home;
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("#quickMenu").hidden = true;
  }

  function resetPhotoForm() {
    $("#photoForm").reset();
    state.selectedPhotoFile = null;
    if (state.selectedPhotoPreviewURL) {
      URL.revokeObjectURL(state.selectedPhotoPreviewURL);
      state.selectedPhotoPreviewURL = null;
    }
    $("#photoPreview").hidden = true;
    $("#photoPreview").removeAttribute("src");
    $("#uploadEmpty").hidden = false;
    $("#photoDate").value = localISO();
  }

  function resetJournalForm() {
    $("#journalForm").reset();
    state.editingJournalId = null;
    $("#journalDate").value = localISO();
  }

  function resetGoalForm() {
    $("#goalForm").reset();
    state.editingGoalId = null;
  }

  function resetEventForm() {
    $("#eventForm").reset();
    state.editingEventId = null;
    $("#eventDate").value = localISO();
  }

  function resetSettingsForm() {
    $("#personA").value = state.settings.personA;
    $("#personB").value = state.settings.personB;
    $("#startDate").value = state.settings.startDate;
    $("#homeTaglineInput").value = state.settings.tagline;
  }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    $("#quickMenu").hidden = true;

    if (id === "photoModal") resetPhotoForm();
    if (id === "journalModal") resetJournalForm();
    if (id === "goalModal") resetGoalForm();
    if (id === "eventModal") resetEventForm();
    if (id === "settingsModal") resetSettingsForm();

    if (!dialog.open) dialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
    if (dialog?.id === "lightbox") state.activePhotoId = null;
    if (dialog?.id === "weddingLightbox") {
      $("#weddingLightboxImage").removeAttribute("src");
    }
    if (dialog?.id === "photoModal" && state.selectedPhotoPreviewURL) {
      URL.revokeObjectURL(state.selectedPhotoPreviewURL);
      state.selectedPhotoPreviewURL = null;
    }
  }

  function openJournalEditor(id) {
    const entry = state.journals.find((item) => item.id === id);
    if (!entry) return;
    resetJournalForm();
    state.editingJournalId = id;
    $("#journalDate").value = entry.date;
    $("#journalMood").value = entry.mood || "calm";
    $("#journalEntryTitle").value = entry.title;
    $("#journalBody").value = entry.body;
    $("#journalModal").showModal();
  }

  function openGoalEditor(id) {
    const goal = state.goals.find((item) => item.id === id);
    if (!goal) return;
    resetGoalForm();
    state.editingGoalId = id;
    $("#goalTitle").value = goal.title;
    $("#goalCategory").value = goal.category;
    $("#goalDate").value = goal.dueDate || "";
    $("#goalNote").value = goal.note || "";
    $("#goalModal").showModal();
  }

  function openEventEditor(id) {
    const event = state.events.find((item) => item.id === id);
    if (!event) return;
    resetEventForm();
    state.editingEventId = id;
    $("#eventTitle").value = event.title;
    $("#eventDate").value = event.date;
    $("#eventRepeat").value = event.repeat;
    $("#eventModal").showModal();
  }

  function openPhotoLightbox(id) {
    const photo = state.photos.find((item) => item.id === id);
    if (!photo) return;
    state.activePhotoId = id;
    $("#lightboxImage").innerHTML = visualHTML(photo);
    $("#lightboxCategory").textContent = photo.category;
    $("#lightboxTitle").textContent = photo.title;
    $("#lightboxNote").textContent = photo.note || "有些瞬间，不需要太多解释。";
    $("#lightboxDate").textContent = formatChineseDate(photo.date);
    $("#lightbox").showModal();
  }

  function showWeddingPhoto(index) {
    if (!weddingPhotos.length) return;
    const nextIndex =
      (Number(index) + weddingPhotos.length) % weddingPhotos.length;
    state.activeWeddingIndex = nextIndex;
    const photo = weddingPhotos[nextIndex];
    const image = $("#weddingLightboxImage");
    const requestId = ++state.weddingImageRequest;
    image.classList.add("is-loading");
    image.src = photo.thumb || photo.src;
    image.alt = photo.alt || photo.title || `婚纱照 ${nextIndex + 1}`;
    $("#weddingLightboxCounter").textContent =
      `${String(nextIndex + 1).padStart(2, "0")} / ${String(weddingPhotos.length).padStart(2, "0")}`;
    $("#weddingLightboxTitle").textContent =
      photo.title || `第 ${nextIndex + 1} 帧`;
    $("#weddingLightboxNote").textContent =
      photo.note || "愿把这一刻，写成我们很长很长的以后。";

    let fullImage = weddingPreloads.get(photo.src);
    if (!fullImage) {
      fullImage = new Image();
      fullImage.decoding = "async";
      fullImage.src = photo.src;
      weddingPreloads.set(photo.src, fullImage);
    }
    const revealFullImage = () => {
      if (state.weddingImageRequest !== requestId) return;
      image.src = photo.src;
      image.classList.remove("is-loading");
    };
    if (fullImage.complete && fullImage.naturalWidth) {
      revealFullImage();
    } else {
      fullImage.addEventListener("load", revealFullImage, { once: true });
    }

    requestAnimationFrame(() => {
      for (const neighborIndex of [
        (nextIndex + 1) % weddingPhotos.length,
        (nextIndex - 1 + weddingPhotos.length) % weddingPhotos.length,
      ]) {
        const neighbor = weddingPhotos[neighborIndex];
        if (!weddingPreloads.has(neighbor.src)) {
          const preload = new Image();
          preload.decoding = "async";
          preload.src = neighbor.src;
          weddingPreloads.set(neighbor.src, preload);
        }
      }
    });
  }

  function openWeddingPhoto(index) {
    if (!weddingPhotos.length) return;
    showWeddingPhoto(index);
    const dialog = $("#weddingLightbox");
    if (!dialog.open) dialog.showModal();
  }

  async function compressImage(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("请选择图片文件。");
    }
    if (file.size > 12 * 1024 * 1024) {
      throw new Error("图片超过 12MB，请先压缩后再添加。");
    }

    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("无法读取这张图片。"));
        img.src = url;
      });

      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#f8f3ea";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.84);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function importBackup(file) {
    const text = await file.text();
    const backup = JSON.parse(text);
    const data = backup?.data || backup;
    if (!data?.settings || !Array.isArray(data.journals) || !Array.isArray(data.goals)) {
      throw new Error("这不是有效的朝朝暮暮备份文件。");
    }

    state.settings = data.settings;
    state.journals = data.journals;
    state.goals = data.goals;
    state.events = Array.isArray(data.events) ? data.events : [];
    if (data.mood) localStorage.setItem(MOOD_KEY, JSON.stringify(data.mood));
    saveState();

    if (Array.isArray(backup.photos)) {
      await clearPhotosDB();
      if (backup.photos.length) await putPhotos(backup.photos);
      state.photos = backup.photos;
      localStorage.setItem(PHOTO_SEEDED_KEY, "yes");
    }

    $$('dialog[open]').forEach((dialog) => dialog.close());
    renderAll();
    toast("备份已导入");
  }

  async function bootstrap() {
    try {
      database = await openDB();
      state.photos = await getPhotos();
      if (!state.photos.length && !localStorage.getItem(PHOTO_SEEDED_KEY)) {
        state.photos = seedPhotos();
        await putPhotos(state.photos);
        localStorage.setItem(PHOTO_SEEDED_KEY, "yes");
      }
      state.photos.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    } catch (error) {
      console.error("Photo database failed:", error);
      state.photos = seedPhotos();
    }

    saveState();
    renderAll();
    $("#photoDate").value = localISO();
    $("#journalDate").value = localISO();
    $("#eventDate").value = localISO();
    updateToday();
  }

  function updateToday() {
    const date = new Date();
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    $("#todayWeekday").textContent = weekdays[date.getDay()];
    $("#todayDate").textContent = `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function bindEvents() {
    document.addEventListener("click", async (event) => {
      const scrollButton = event.target.closest("[data-scroll-target]");
      if (scrollButton) {
        document.getElementById(scrollButton.dataset.scrollTarget)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }

      const viewButton = event.target.closest("[data-view-target]");
      if (viewButton) {
        switchView(viewButton.dataset.viewTarget);
        return;
      }

      const openButton = event.target.closest("[data-open]");
      if (openButton) {
        openDialog(openButton.dataset.open);
        return;
      }

      const closeButton = event.target.closest("[data-close]");
      if (closeButton) {
        closeDialog(closeButton.closest("dialog"));
        return;
      }

      const weddingPhoto = event.target.closest("[data-wedding-photo]");
      if (weddingPhoto) {
        openWeddingPhoto(Number(weddingPhoto.dataset.weddingPhoto));
        return;
      }

      if (event.target.closest("#weddingLoadMore")) {
        renderWeddingGallery({ focusNew: true });
        return;
      }

      const homePhoto = event.target.closest("[data-open-photo]");
      if (homePhoto) {
        openPhotoLightbox(homePhoto.dataset.openPhoto);
        return;
      }

      const editJournal = event.target.closest("[data-edit-journal]");
      if (editJournal) {
        openJournalEditor(editJournal.dataset.editJournal);
        return;
      }

      const editGoal = event.target.closest("[data-edit-goal]");
      if (editGoal) {
        openGoalEditor(editGoal.dataset.editGoal);
        return;
      }

      const editEvent = event.target.closest("[data-edit-event]");
      if (editEvent) {
        openEventEditor(editEvent.dataset.editEvent);
        return;
      }

      const toggleGoal = event.target.closest("[data-toggle-goal]");
      if (toggleGoal) {
        const goal = state.goals.find((item) => item.id === toggleGoal.dataset.toggleGoal);
        if (!goal) return;
        goal.done = !goal.done;
        saveState();
        renderGoals();
        renderStats();
        if (goal.done) {
          celebrate(event);
          toast("又一起完成一件小事");
        }
        return;
      }

      const deleteJournal = event.target.closest("[data-delete-journal]");
      if (deleteJournal) {
        if (!confirm("确定删除这篇日记吗？删除后无法恢复。")) return;
        state.journals = state.journals.filter(
          (item) => item.id !== deleteJournal.dataset.deleteJournal,
        );
        saveState();
        renderJournal();
        renderHomeJournals();
        renderStats();
        toast("日记已删除");
        return;
      }

      const deleteGoal = event.target.closest("[data-delete-goal]");
      if (deleteGoal) {
        if (!confirm("确定从心愿清单中删除这一项吗？")) return;
        state.goals = state.goals.filter(
          (item) => item.id !== deleteGoal.dataset.deleteGoal,
        );
        saveState();
        renderGoals();
        renderStats();
        toast("心愿已删除");
        return;
      }

      const deleteEvent = event.target.closest("[data-delete-event]");
      if (deleteEvent) {
        if (!confirm("确定删除这个日子吗？")) return;
        state.events = state.events.filter(
          (item) => item.id !== deleteEvent.dataset.deleteEvent,
        );
        saveState();
        refreshDateSurfaces();
        toast("日子已删除");
        return;
      }

      const moodButton = event.target.closest("[data-mood]");
      if (moodButton) {
        const mood = moodButton.dataset.mood;
        localStorage.setItem(MOOD_KEY, JSON.stringify({ date: localISO(), mood }));
        renderMood();
        celebrate(event);
        return;
      }

      if (!event.target.closest("#quickMenu") && !event.target.closest("#quickAdd")) {
        $("#quickMenu").hidden = true;
      }
    });

    const weddingStage = $(".wedding-lightbox__stage");
    const weddingImage = $("#weddingLightboxImage");
    let weddingSwipe = null;

    weddingStage.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      weddingSwipe = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      weddingStage.setPointerCapture(event.pointerId);
      weddingStage.classList.add("is-swiping");
      weddingImage.style.transition = "none";
    });

    weddingStage.addEventListener("pointermove", (event) => {
      if (!weddingSwipe || event.pointerId !== weddingSwipe.id) return;
      const deltaX = event.clientX - weddingSwipe.x;
      const deltaY = event.clientY - weddingSwipe.y;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;
      event.preventDefault();
      const offset = Math.max(-120, Math.min(120, deltaX));
      weddingImage.style.transform = `translate3d(${offset}px, 0, 0) scale(.985)`;
      weddingImage.style.opacity = String(
        1 - Math.min(Math.abs(offset) / 520, 0.16),
      );
    });

    const finishWeddingSwipe = (event, cancelled = false) => {
      if (!weddingSwipe || event.pointerId !== weddingSwipe.id) return;
      const deltaX = event.clientX - weddingSwipe.x;
      const deltaY = event.clientY - weddingSwipe.y;
      const shouldNavigate =
        !cancelled &&
        Math.abs(deltaX) >= 52 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
      weddingSwipe = null;
      weddingStage.classList.remove("is-swiping");
      weddingImage.style.transition = "";
      weddingImage.style.transform = "";
      weddingImage.style.opacity = "";
      if (weddingStage.hasPointerCapture(event.pointerId)) {
        weddingStage.releasePointerCapture(event.pointerId);
      }
      if (shouldNavigate) {
        const direction = deltaX < 0 ? 1 : -1;
        weddingStage.style.setProperty(
          "--wedding-swipe-from",
          direction > 0 ? "9%" : "-9%",
        );
        weddingStage.classList.remove("is-sliding");
        void weddingStage.offsetWidth;
        weddingStage.classList.add("is-sliding");
        showWeddingPhoto(state.activeWeddingIndex + direction);
      }
    };

    weddingStage.addEventListener("pointerup", (event) => {
      finishWeddingSwipe(event);
    });
    weddingStage.addEventListener("pointercancel", (event) => {
      finishWeddingSwipe(event, true);
    });
    weddingStage.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });
    weddingImage.addEventListener("animationend", () => {
      weddingStage.classList.remove("is-sliding");
    });

    $("#quickAdd").addEventListener("click", (event) => {
      event.stopPropagation();
      $("#quickMenu").hidden = !$("#quickMenu").hidden;
    });

    $("#mobileQuickAdd").addEventListener("click", (event) => {
      event.stopPropagation();
      $("#quickMenu").hidden = !$("#quickMenu").hidden;
    });

    $$(".modal, .lightbox").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });
      dialog.addEventListener("cancel", () => {
        if (dialog.id === "photoModal" && state.selectedPhotoPreviewURL) {
          URL.revokeObjectURL(state.selectedPhotoPreviewURL);
          state.selectedPhotoPreviewURL = null;
        }
      });
    });

    $("#photoFile").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      state.selectedPhotoFile = file;
      if (state.selectedPhotoPreviewURL) {
        URL.revokeObjectURL(state.selectedPhotoPreviewURL);
      }
      state.selectedPhotoPreviewURL = URL.createObjectURL(file);
      $("#photoPreview").src = state.selectedPhotoPreviewURL;
      $("#photoPreview").hidden = false;
      $("#uploadEmpty").hidden = true;
    });

    $("#photoForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = event.submitter;
      if (!state.selectedPhotoFile) {
        toast("请先选择一张照片");
        return;
      }
      try {
        submitButton.disabled = true;
        submitButton.textContent = "正在保存…";
        const image = await compressImage(state.selectedPhotoFile);
        const photo = {
          id: uid("photo"),
          title: $("#photoTitle").value.trim(),
          date: $("#photoDate").value,
          category: $("#photoCategory").value,
          note: $("#photoNote").value.trim(),
          visual: visualNames[state.photos.length % visualNames.length],
          image,
          createdAt: Date.now(),
        };
        state.photos.unshift(photo);
        try {
          await putPhoto(photo);
        } catch (error) {
          console.error(error);
          toast("照片已显示，但浏览器存储空间不足");
        }
        localStorage.setItem(PHOTO_SEEDED_KEY, "yes");
        closeDialog($("#photoModal"));
        renderGallery();
        renderHomeMemories();
        renderStats();
        toast("这段回忆已经收藏");
      } catch (error) {
        toast(error.message || "照片保存失败");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "保存这段回忆";
      }
    });

    $("#journalForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = {
        date: $("#journalDate").value,
        mood: $("#journalMood").value,
        title: $("#journalEntryTitle").value.trim(),
        body: $("#journalBody").value.trim(),
      };
      if (!payload.title || !payload.body) return;

      if (state.editingJournalId) {
        const index = state.journals.findIndex(
          (item) => item.id === state.editingJournalId,
        );
        if (index >= 0) state.journals[index] = { ...state.journals[index], ...payload };
      } else {
        state.journals.unshift({
          id: uid("journal"),
          ...payload,
          createdAt: Date.now(),
        });
      }
      saveState();
      closeDialog($("#journalModal"));
      renderJournal();
      renderHomeJournals();
      renderStats();
      toast(state.editingJournalId ? "日记已更新" : "今天已经写进故事里");
    });

    $("#goalForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = {
        title: $("#goalTitle").value.trim(),
        category: $("#goalCategory").value,
        dueDate: $("#goalDate").value,
        note: $("#goalNote").value.trim(),
      };
      if (!payload.title) return;

      if (state.editingGoalId) {
        const index = state.goals.findIndex((item) => item.id === state.editingGoalId);
        if (index >= 0) state.goals[index] = { ...state.goals[index], ...payload };
      } else {
        state.goals.push({
          id: uid("goal"),
          ...payload,
          done: false,
          createdAt: Date.now(),
        });
      }
      saveState();
      closeDialog($("#goalModal"));
      renderGoals();
      renderStats();
      toast(state.editingGoalId ? "心愿已更新" : "新的共同心愿已加入");
    });

    $("#eventForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = {
        title: $("#eventTitle").value.trim(),
        date: $("#eventDate").value,
        repeat: $("#eventRepeat").value,
      };
      if (!payload.title || !payload.date) return;

      if (state.editingEventId) {
        const index = state.events.findIndex((item) => item.id === state.editingEventId);
        if (index >= 0) state.events[index] = { ...state.events[index], ...payload };
      } else {
        state.events.push({
          id: uid("event"),
          ...payload,
          createdAt: Date.now(),
        });
      }
      saveState();
      closeDialog($("#eventModal"));
      refreshDateSurfaces();
      toast(state.editingEventId ? "日子已更新" : "重要的日子已经记下");
    });

    $("#settingsForm").addEventListener("submit", (event) => {
      event.preventDefault();
      state.settings = {
        personA: $("#personA").value.trim() || "我",
        personB: $("#personB").value.trim() || "老婆",
        startDate: $("#startDate").value || localISO(),
        tagline: $("#homeTaglineInput").value.trim() || "和你一起，认真生活。",
      };
      saveState();
      closeDialog($("#settingsModal"));
      renderAll();
      toast("你们的专属设置已保存");
    });

    $("#exportData").addEventListener("click", () => {
      const memory = (() => {
        try {
          return JSON.parse(localStorage.getItem(MOOD_KEY)) || null;
        } catch {
          return null;
        }
      })();
      const backup = {
        format: "chaozhaomumu-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          settings: state.settings,
          journals: state.journals,
          goals: state.goals,
          events: state.events,
          mood: memory,
        },
        photos: state.photos,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `朝朝暮暮-生活记录备份-${localISO()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("备份文件已导出");
    });

    $("#importData").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        await importBackup(file);
      } catch (error) {
        toast(error.message || "备份导入失败");
      } finally {
        event.target.value = "";
      }
    });

    $("#resetData").addEventListener("click", async () => {
      if (
        !confirm(
          "确定清空所有照片、日记和心愿吗？这个操作无法撤销，建议先导出备份。",
        )
      ) {
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MOOD_KEY);
      localStorage.removeItem(PHOTO_SEEDED_KEY);
      try {
        await clearPhotosDB();
      } catch (error) {
        console.error(error);
      }
      location.reload();
    });

    $("#deletePhoto").addEventListener("click", async () => {
      if (!state.activePhotoId) return;
      if (!confirm("确定删除这张照片吗？删除后无法恢复。")) return;
      const id = state.activePhotoId;
      try {
        await deletePhotoFromDB(id);
      } catch (error) {
        console.error(error);
      }
      state.photos = state.photos.filter((photo) => photo.id !== id);
      localStorage.setItem(PHOTO_SEEDED_KEY, "yes");
      closeDialog($("#lightbox"));
      renderGallery();
      renderHomeMemories();
      renderStats();
      toast("照片已删除");
    });

    $("#photoFilters").addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      state.activePhotoFilter = button.dataset.filter;
      $$("#photoFilters button").forEach((item) =>
        item.classList.toggle("is-active", item === button),
      );
      renderGallery();
    });

    document.addEventListener("keydown", (event) => {
      if ($("#weddingLightbox").open) {
        if (event.key === "ArrowLeft") {
          showWeddingPhoto(state.activeWeddingIndex - 1);
          return;
        }
        if (event.key === "ArrowRight") {
          showWeddingPhoto(state.activeWeddingIndex + 1);
          return;
        }
      }
      if (event.key === "Escape") $("#quickMenu").hidden = true;
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth < 900) $("#quickMenu").hidden = true;
    });
  }

  bindEvents();
  bootstrap();
})();
