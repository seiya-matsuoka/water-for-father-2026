(() => {
  const frame = document.getElementById("design-frame");
  const tabs = Array.from(document.querySelectorAll(".design-tab"));

  const designMap = {
    metallic: "./designs/metallic/index.html",
    "neo-tokyo": "./designs/neo-tokyo/index.html",
    morfh: "./designs/morfh/index.html",
  };

  const validDesigns = new Set(Object.keys(designMap));

  const readInitialDesign = () => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("design");
    return validDesigns.has(requested) ? requested : "metallic";
  };

  const setActiveDesign = (design, { replaceHistory = false } = {}) => {
    if (!validDesigns.has(design)) return;

    frame.src = designMap[design];

    tabs.forEach((tab) => {
      const isActive = tab.dataset.design === design;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", String(isActive));
    });

    const url = new URL(window.location.href);
    url.searchParams.set("design", design);

    const method = replaceHistory ? "replaceState" : "pushState";
    window.history[method]({ design }, "", url);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const nextDesign = tab.dataset.design;
      if (
        !nextDesign ||
        nextDesign === new URL(window.location.href).searchParams.get("design")
      ) {
        return;
      }
      setActiveDesign(nextDesign);
    });
  });

  window.addEventListener("popstate", () => {
    setActiveDesign(readInitialDesign(), { replaceHistory: true });
  });

  setActiveDesign(readInitialDesign(), { replaceHistory: true });
})();
