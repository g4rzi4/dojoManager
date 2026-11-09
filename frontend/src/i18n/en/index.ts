import { backend } from "./backend";
import { constants } from "./constants";
import { forms } from "./forms";
import { pagesA } from "./pagesA";
import { pagesB } from "./pagesB";
import { panels } from "./panels";
import { shell } from "./shell";

/** Traducciones al inglés. La llave es el texto original en español. */
export const en: Record<string, string> = {
  ...backend,
  ...constants,
  ...forms,
  ...pagesA,
  ...pagesB,
  ...panels,
  ...shell,
};
