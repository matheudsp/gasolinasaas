import { mmkvStorageAdapter } from "@/utils/storage";
import { expoClient} from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";


export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_SERVER_URL,
  plugins: [
    expoClient({
      scheme: "martinezapp",
      storagePrefix: "martinez-auth",
      storage: mmkvStorageAdapter,
    }),
  ],
});
