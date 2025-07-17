import { runAppleScript } from "@raycast/utils";

export async function callHammerspoon(code: string) {
  const escapedCode = code
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"') // Escape quotes
    .replace(/\n/g, "\\n") // Replace newlines with \n
    .replace(/\r/g, "\\r") // Replace carriage returns
    .replace(/\t/g, "\\t"); // Replace tabs

  const res = await runAppleScript(`
        try
            tell application "Hammerspoon"
                execute lua code "${escapedCode}"
            end tell
        on error errMsg
            return "HAMMERSPOON_ERROR: " & errMsg
        end try
    `);
  console.log("Hammerspoon result:", res);
  if (typeof res === "string" && res.startsWith("HAMMERSPOON_ERROR:")) {
    throw new Error(res.replace("HAMMERSPOON_ERROR: ", ""));
  }
  return res;
}
