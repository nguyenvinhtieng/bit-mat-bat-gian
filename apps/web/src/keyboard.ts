/**
 * iOS Safari (and Android Chrome without `interactive-widget=resizes-content`) keep the layout viewport full height
 * when the on-screen keyboard opens, so every `position: fixed; inset: 0` overlay stays under the keyboard and the
 * focused input ends up hidden. While a text field has focus and the visual viewport has shrunk, pin #root to the
 * visual viewport (see `html.kb-open` in styles.css); its transform makes it the containing block for fixed overlays,
 * so chat panels and modals shrink to the space above the keyboard.
 */
const TEXT_TYPES = /^(text|search|email|url|tel|password|number|)$/;
const isTextField = (el: Element | null): el is HTMLElement =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && TEXT_TYPES.test(el.type)) ||
  (el instanceof HTMLElement && el.isContentEditable);

export const keyboardOpen = () => document.documentElement.classList.contains('kb-open');

export function initKeyboardViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const html = document.documentElement;
  let raf = 0;
  const update = () => {
    raf = 0;
    const focused = document.activeElement;
    // the URL/tool bars alone change the height by well under 100px
    const open = isTextField(focused) && window.innerHeight - vv.height > 100;
    html.classList.toggle('kb-open', open);
    if (!open) return;
    html.style.setProperty('--vv-h', `${vv.height}px`);
    html.style.setProperty('--vv-top', `${vv.offsetTop}px`);
    focused.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  document.addEventListener('focusin', schedule);
  // focusout fires before the next field gains focus; wait a frame so tabbing between fields doesn't flicker
  document.addEventListener('focusout', schedule);
}
