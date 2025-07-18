import { ActionPanel, Action, Icon, List, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { useSpaceStore } from "./stores/space-store";
import { Window } from "./types/space";

interface WindowItemProps {
  window: Window;
  appIcon?: string;
  onFocus: (windowId: string) => void;
}

// Window detail component
function WindowDetail({ window }: { window: Window }) {
  const { windowSnapshots, loadingSnapshots } = useSpaceStore();
  const snapshot = windowSnapshots[window.id];
  const isLoadingSnapshot = loadingSnapshots[window.id];

  const getMarkdown = () => {
    if (snapshot && !window.isMinimized) {
      return `![Window Preview](${snapshot})`;
    } else if (isLoadingSnapshot) {
      return `Loading snapshot...`;
    } else if (window.isMinimized) {
      return `Window is minimized - no preview available`;
    } else {
      return `No preview available`;
    }
  };

  return (
    <List.Item.Detail
      markdown={getMarkdown()}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={window.title} />
          <List.Item.Detail.Metadata.Label title="Application" text={window.application} />
          <List.Item.Detail.Metadata.Label title="ID" text={window.id} />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={window.isMinimized ? "Minimized" : window.isFullscreen ? "Fullscreen" : "Normal"}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
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
      detail={<WindowDetail window={window} />}
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
  const { allWindows, isLoadingAllWindows, appIcons, fetchAllWindows, focusWindow, setSelectedWindowId } =
    useSpaceStore();
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchAllWindows();
  }, []);

  const handleFocus = async (windowId: string) => {
    await focusWindow(windowId);
  };

  const handleSelectionChange = (windowId: string | null) => {
    setSelectedWindowId(windowId);
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
      isShowingDetail={false}
      onSelectionChange={handleSelectionChange}
      throttle
    >
      {filteredWindows.map((window) => (
        <WindowItem key={window.id} window={window} appIcon={appIcons[window.application]} onFocus={handleFocus} />
      ))}
    </List>
  );
}
