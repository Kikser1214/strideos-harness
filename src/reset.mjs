import "./env.mjs";
import { resetState } from "./store.mjs";

resetState();
console.log("StrideOS local state reset. The next launch will start onboarding from the beginning.");
