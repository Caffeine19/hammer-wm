import { runAppleScript } from "@raycast/utils";

export async function callHammerspoon(code: string) {
  const escapedCode = code
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"') // Escape quotes
    .replace(/\n/g, "\\n") // Replace newlines with \n
    .replace(/\r/g, "\\r") // Replace carriage returns
    .replace(/\t/g, "\\t"); // Replace tabs

  const res = await runAppleScript(`
        tell application "Hammerspoon"
            execute lua code "${escapedCode}"
        end tell
    `);
  return res;
}
