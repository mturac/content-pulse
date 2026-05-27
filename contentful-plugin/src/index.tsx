import React from "react";
import { createRoot } from "react-dom/client";
import { AppExtensionSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import PulseWidget from "./components/PulseWidget";

const App: React.FC = () => {
  const sdk = useSDK<AppExtensionSDK>();

  return <PulseWidget sdk={sdk} />;
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
