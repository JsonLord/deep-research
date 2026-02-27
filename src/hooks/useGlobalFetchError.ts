import { useEffect } from "react";
import { toast } from "sonner";

export function useGlobalFetchError() {
  useEffect(() => {
    const handleError = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof TypeError && event.reason.message === "Failed to fetch") {
        console.error("Global Fetch Error detected:", event.reason);
        toast.error("Network connection issue. Please check your connection or refresh the page.", {
          description: "This can happen if the server is sleeping or your network is unstable.",
          duration: 5000,
        });
      }
    };

    window.addEventListener("unhandledrejection", handleError);
    return () => window.removeEventListener("unhandledrejection", handleError);
  }, []);
}
