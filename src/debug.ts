import { Clipboard, showHUD } from "@raycast/api";

import { callHammerspoon } from "./utils/call-hammerspoon";

/**
 * Executes JavaScript code from the clipboard and shows the result in a HUD.
 */

export default async function debugClipboard() {
  const code = await Clipboard.readText();
  console.log({ code });
  if (!code) {
    await showHUD("Clipboard is empty or not text.");
    return;
  }

  try {
    const res = callHammerspoon(code);
    console.log("Execution result:", res);
    await showHUD("Code executed successfully");
  } catch (error) {
    console.error("Error executing AppleScript:", error);
    await showHUD(`Error: ${error}`);
  }
}
