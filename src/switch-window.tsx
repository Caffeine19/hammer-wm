import { ActionPanel, Action, Icon, List, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { useSpaceStore } from "./stores/space-store";

interface WindowItemProps {
  window: {
    id: string;
    title: string;
    application: string;
    isMinimized: boolean;
    isFullscreen: boolean;
  };
  appIcon?: string;
  onFocus: (windowId: string) => void;
}

function WindowItem({ window, appIcon, onFocus }: WindowItemProps) {
  const truncatedTitle = window.title.length > 70 ? `${window.title.substring(0, 70)}...` : window.title;

  const getIcon = (): Image.ImageLike => {
    if (appIcon) {
      return { fileIcon: appIcon };
    }
    return window.isMinimized ? Icon.Minus : window.isFullscreen ? Icon.Maximize : Icon.Window;
  };

  const getAccessories = () => {
    const accessories = [];
    if (window.isFullscreen) {
      accessories.push({ icon: Icon.Maximize, tooltip: "Fullscreen" });
    }
    if (window.isMinimized) {
      accessories.push({ icon: Icon.Minus, tooltip: "Minimized" });
    }
    return accessories;
  };

  return (
    <List.Item
      icon={getIcon()}
      title={truncatedTitle}
      subtitle={window.application}
      accessories={getAccessories()}
      id={window.id}
      actions={
        <ActionPanel>
          <Action title="Focus Window" icon={Icon.Eye} onAction={() => onFocus(window.id)} />
          <Action.CopyToClipboard
            title="Copy Window Title"
            content={window.title}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Window ID"
            content={window.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { allWindows, isLoadingAllWindows, appIcons, fetchAllWindows, focusWindow } = useSpaceStore();
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchAllWindows();
  }, []);

  const handleFocus = async (windowId: string) => {
    await focusWindow(windowId);
  };

  const filteredWindows = allWindows.filter(
    (window) =>
      window.title.toLowerCase().includes(searchText.toLowerCase()) ||
      window.application.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoadingAllWindows}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search windows by title or application..."
      throttle
    >
      {filteredWindows.map((window) => (
        <WindowItem key={window.id} window={window} appIcon={appIcons[window.application]} onFocus={handleFocus} />
      ))}
    </List>
  );
}
