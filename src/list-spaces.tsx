import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { callHammerspoon } from "./utils/call-hammerspoon";

interface SpaceInfo {
  id: string;
  name: string;
  screenId: string;
  isCurrent: boolean;
}

async function getSpaces(): Promise<SpaceInfo[]> {
  const code = /**lua*/ `
    local spaces = {}
    local currentSpace = hs.spaces.focusedSpace()
    local spaceNames = hs.spaces.missionControlSpaceNames()
    
    for screenUUID, screenSpaces in pairs(spaceNames) do
      for spaceId, spaceName in pairs(screenSpaces) do
        table.insert(spaces, {
          id = tostring(spaceId),
          name = spaceName,
          screenId = screenUUID,
          isCurrent = spaceId == currentSpace
        })
      end
    end
    
    return hs.json.encode(spaces)
  `;

  const result = await callHammerspoon(code);
  return JSON.parse(result);
}

export default function Command() {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSpaces() {
      try {
        const spacesList = await getSpaces();
        setSpaces(spacesList);
      } catch (error) {
        console.error("Error fetching spaces:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSpaces();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Spaces" searchBarPlaceholder="Search spaces...">
      <List.Section title="All Spaces" subtitle={`${spaces.length} spaces`}>
        {spaces.map((space: SpaceInfo) => (
          <List.Item
            key={space.id}
            icon={space.isCurrent ? Icon.Star : Icon.Window}
            title={space.name || `Space ${space.id}`}
            subtitle={`Screen: ${space.screenId}`}
            accessories={[
              {
                text: space.isCurrent ? "Current" : undefined,
                icon: space.isCurrent ? Icon.CheckCircle : undefined,
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={`# ${space.name || `Space ${space.id}`}
              
## Information
- **ID**: ${space.id}
- **Screen**: ${space.screenId}
- **Status**: ${space.isCurrent ? "Current Active Space" : "Inactive Space"}

## Available Actions
- Use ⏎ to go to this space
- Use ⌘⌫ to remove space (if not current)
              `}
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Go to Space"
                    onAction={async () => {
                      await callHammerspoon(`hs.spaces.gotoSpace(${space.id})`);
                    }}
                  />
                  {!space.isCurrent && (
                    <Action
                      title="Remove Space"
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={async () => {
                        const code = `
                        local ok, err = hs.spaces.removeSpace(${space.id})
                        if not ok then
                          return "Error: " .. tostring(err)
                        end
                        return "Space removed successfully"
                      `;
                        await callHammerspoon(code);
                      }}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
