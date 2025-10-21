import toast from "react-hot-toast";

export const showSuccess = (message) => {
  toast.success(message);
};

export const showError = (message) => {
  toast.error(message);
};

export const showInfo = (message) => {
  toast(message, {
    icon: "ℹ️",
  });
};

export const showWarning = (message) => {
  toast(message, {
    icon: "⚠️",
    style: {
      background: "#f59e0b",
      color: "#fff",
    },
  });
};

export const showLoading = (message) => {
  return toast.loading(message);
};

export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

export const showPromise = (promise, messages) => {
  return toast.promise(promise, {
    loading: messages.loading || "Loading...",
    success: messages.success || "Success!",
    error: messages.error || "Something went wrong.",
  });
};
