/*** Gets the current cursor position (offset) within the contenteditable element.
 * @param element The contenteditable HTML element.
 * @returns The offset number, or -1 if the element is not focused or no selection exists.*/
export function get_cursor_position(element: HTMLElement): number {
  const selection = window.getSelection();
  if (
    selection &&
    selection.rangeCount > 0 &&
    element.contains(selection.anchorNode)
  ) {
    const range = selection.getRangeAt(0);
    if (range.collapsed) return selection.anchorOffset;
    const pre_caret_range = range.cloneRange();
    pre_caret_range.selectNodeContents(element);
    pre_caret_range.setEnd(range.startContainer, range.startOffset);
    return pre_caret_range.toString().length;
  }
  return -1;
}

/** Sets the cursor position (caret) inside the contenteditable element based on a character offset.
 * @param element The contenteditable HTML element.
 * @param offset The character offset from the beginning of the element's text content.*/
export function set_cursor_position(
  element: HTMLElement,
  offset: number
): void {
  const selection = window.getSelection();
  let chars = 0;
  const set_caret = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const node_length = node.textContent?.length ?? 0;
      if (chars + node_length >= offset) {
        const local_offset = offset - chars;
        const range = document.createRange();
        range.setStart(node, local_offset);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        element.focus();
        return true;
      }
      chars += node_length;
    } else {
      for (let i = 0; i < node.childNodes.length; i++)
        if (set_caret(node.childNodes[i])) return true;
    }
    return false;
  };
  set_caret(element);
}

/**Sets the cursor (caret) position at the very end of the contenteditable element.
 * @param element The contenteditable HTML element.*/
export function set_cursor_end(element: HTMLElement): void {
  element.focus();
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    const last_node = element.lastChild;
    if (last_node) {
      if (last_node.nodeType === Node.TEXT_NODE) {
        range.setStart(last_node, (last_node as Text).length);
        range.setEnd(last_node, (last_node as Text).length);
      } else {
        range.selectNodeContents(element);
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

/** Selects all content (text and elements) within the contenteditable element.
 * @param element The contenteditable HTML element.*/
export function set_selection_all(element: HTMLElement): void {
  element.focus();
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
