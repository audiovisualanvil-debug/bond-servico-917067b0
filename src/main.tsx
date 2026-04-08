import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Workaround for React 18 + Radix UI DOM conflict
// where removeChild fails during fiber cleanup
const originalRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function <T extends Node>(child: T): T {
  if (child.parentNode !== this) {
    if (console) {
      console.warn('removeChild: node is not a child of this node', child);
    }
    return child;
  }
  return originalRemoveChild.call(this, child) as T;
};

createRoot(document.getElementById("root")!).render(<App />);
