# Made Solid Studio Capture

This local Manifest V3 extension lets the Studio's **Capture this tab** action capture the exact
visible Chrome or Brave tab without opening the operating-system screen-sharing chooser. It runs
only on localhost, `127.0.0.1`, and GitHub Codespaces port 5173 URLs. Captures stay inside the
browser and are sent only to the local Studio page that requested them.

## Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `browser-extension/made-solid-capture` directory.
5. Refresh Made Solid Studio.

## Brave

1. Open `brave://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `browser-extension/made-solid-capture` directory.
5. Refresh Made Solid Studio.

Use **Another tab/window** when the required content is outside the visible Studio tab. That path
uses the browser's mandatory sharing chooser.
