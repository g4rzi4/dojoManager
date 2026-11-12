import { assistant } from "./assistant";
import { attendance } from "./attendance";
import { backend } from "./backend";
import { constants } from "./constants";
import { dojos } from "./dojos";
import { eventResponses } from "./eventResponses";
import { forms } from "./forms";
import { pagesA } from "./pagesA";
import { pagesB } from "./pagesB";
import { panels } from "./panels";
import { profesores } from "./profesores";
import { shell } from "./shell";
import { uniforms } from "./uniforms";
import { validacion } from "./validacion";

/** Traducciones al inglés. La llave es el texto original en español. */
export const en: Record<string, string> = {
  ...assistant,
  ...attendance,
  ...backend,
  ...constants,
  ...dojos,
  ...eventResponses,
  ...forms,
  ...pagesA,
  ...pagesB,
  ...panels,
  ...profesores,
  ...shell,
  ...uniforms,
  ...validacion,
};
