import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebaseClient";
import { supabase } from "@/lib/supabaseClient";

export async function enablePushNotifications(user) {
  if (!user) {
    alert("Login required");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    alert("Notification permission denied");
    return;
  }

  const messaging = await getFirebaseMessaging();

  if (!messaging) {
    alert("Notifications not supported on this device/browser");
    return;
  }

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  if (!token) {
    alert("Notification token not generated");
    return;
  }

  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: user.id,
      token,
      device_name: navigator.userAgent,
      is_active: true,
    },
    {
      onConflict: "token",
    }
  );

  if (error) {
    console.error(error);
    alert(error.message || "Token save failed");
    return;
  }

  alert("Notifications enabled successfully");
}