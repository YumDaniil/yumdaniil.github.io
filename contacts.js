(() => {
  const trigger = document.querySelector("[data-contact-help]");
  const tooltip = document.getElementById("contact-help-tip");

  if (!trigger || !tooltip) return;

  let isOpen = false;

  const setOpen = (next) => {
    isOpen = next;
    trigger.setAttribute("aria-expanded", String(isOpen));
    tooltip.hidden = !isOpen;
  };

  trigger.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") setOpen(true);
  });

  trigger.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") setOpen(false);
  });

  trigger.addEventListener("focus", () => setOpen(true));
  trigger.addEventListener("blur", () => setOpen(false));

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    setOpen(!isOpen);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isOpen) return;
    setOpen(false);
    trigger.focus();
  });
})();
